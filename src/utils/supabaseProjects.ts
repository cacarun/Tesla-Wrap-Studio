import { supabase } from '../lib/supabase';
import type { ProjectFile, SerializedLayer } from '../editor/state/useEditorStore';
import { loadProjectFromFile } from './projectFile';
import JSZip from 'jszip';

export interface SavedDesign {
  id: string;
  title: string;
  description: string | null;
  model_id: string;
  preview_image_url: string;
  project_file_url: string;
  visibility: 'private' | 'public';
  published: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Save a project to Supabase Storage and database
 */
export const saveProjectToSupabase = async (
  project: ProjectFile,
  previewImageDataUrl: string,
  designId?: string, // If provided, update existing design
  options?: {
    description?: string | null;
    visibility?: 'public' | 'private';
  }
): Promise<SavedDesign> => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  // Check authentication (with fallback refresh)
  let { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const refreshResult = await supabase.auth.refreshSession();
    if (!refreshResult.error && refreshResult.data.session) {
      session = refreshResult.data.session;
    }
  }
  if (!session) {
    throw new Error('You must be logged in to save projects');
  }

  // Convert project to ZIP blob
  const zip = new JSZip();
  
  // Extract images from layers
  const { cleanedLayers, images } = extractImages(project.layers);
  
  // Create manifest
  const manifest = {
    version: '2.0',
    name: project.name,
    createdAt: project.createdAt,
    modifiedAt: new Date().toISOString(),
    modelId: project.modelId,
    baseColor: project.baseColor,
    layers: cleanedLayers,
  };
  
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  
  // Add images
  if (images.length > 0) {
    const imagesFolder = zip.folder('images');
    if (imagesFolder) {
      for (const img of images) {
        const bytes = dataUrlToUint8Array(img.dataUrl);
        const filename = img.filename.replace('images/', '');
        imagesFolder.file(filename, bytes);
      }
    }
  }
  
  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  // Convert preview image to blob
  const originalPreviewBlob = await dataUrlToBlob(previewImageDataUrl);
  
  // Compress preview image server-side if needed (> 0.95MB)
  let previewBlob: Blob = originalPreviewBlob;
  if (originalPreviewBlob.size > 995328) { // 0.95MB
    console.log(`Preview image too large (${(originalPreviewBlob.size / 1024 / 1024).toFixed(2)}MB), compressing...`);
    const formData = new FormData();
    formData.append('file', originalPreviewBlob, 'preview.png');
    
    try {
      const compressResponse = await fetch(`${import.meta.env.VITE_GALLERY_URL}/api/compress-image`, {
        method: 'POST',
        body: formData,
      });
      
      if (compressResponse.ok) {
        previewBlob = await compressResponse.blob();
        console.log(`Compressed: ${(originalPreviewBlob.size / 1024 / 1024).toFixed(2)}MB -> ${(previewBlob.size / 1024 / 1024).toFixed(2)}MB`);
      } else {
        console.warn('Compression API failed, using original image');
      }
    } catch (err) {
      console.warn('Compression request failed, using original image:', err);
    }
  }
  
  // Generate thumbnail client-side (200x200 WebP)
  const thumbnailBlob = await generateThumbnail(previewImageDataUrl, 200);

  // Generate file paths - use designId if provided, otherwise generate new UUID
  const userId = session.user.id;
  const finalDesignId = designId || crypto.randomUUID();
  const projectFileName = `projects/${finalDesignId}.twrap`;
  
  // Use timestamped filenames to bust CDN cache
  const timestamp = Date.now();
  const previewFileName = `preview/${finalDesignId}_${timestamp}.png`;
  const thumbnailFileName = `thumbnail/${finalDesignId}_${timestamp}.webp`;

  // If updating, get the old file URLs to delete later
  let oldPreviewPath: string | null = null;
  let oldThumbnailPath: string | null = null;
  if (designId) {
    const { data: existingDesign } = await supabase
      .from('designs')
      .select('preview_image_url, preview_thumbnail_url')
      .eq('id', designId)
      .single();
    
    if (existingDesign?.preview_image_url) {
      const urlWithoutParams = existingDesign.preview_image_url.split('?')[0];
      oldPreviewPath = urlWithoutParams.split('/designs/').pop() || null;
    }
    if (existingDesign?.preview_thumbnail_url) {
      const urlWithoutParams = existingDesign.preview_thumbnail_url.split('?')[0];
      oldThumbnailPath = urlWithoutParams.split('/designs/').pop() || null;
    }
  }

  // Upload all files to storage in parallel
  const [projectUploadResult, previewUploadResult, thumbnailUploadResult] = await Promise.all([
    supabase.storage
      .from('designs')
      .upload(projectFileName, zipBlob, {
        cacheControl: '3600',
        upsert: true,
      }),
    supabase.storage
      .from('designs')
      .upload(previewFileName, previewBlob, {
        cacheControl: '31536000', // 1 year cache (unique filename)
        upsert: false,
        contentType: 'image/png',
      }),
    supabase.storage
      .from('designs')
      .upload(thumbnailFileName, thumbnailBlob, {
        cacheControl: '31536000', // 1 year cache (unique filename)
        contentType: 'image/webp',
        upsert: false,
      }),
  ]);

  if (projectUploadResult.error) throw projectUploadResult.error;
  if (previewUploadResult.error) throw previewUploadResult.error;
  if (thumbnailUploadResult.error) throw thumbnailUploadResult.error;

  // Delete old files to save storage space (non-blocking)
  const filesToDelete: string[] = [];
  if (oldPreviewPath && oldPreviewPath !== previewFileName) {
    filesToDelete.push(oldPreviewPath);
  }
  if (oldThumbnailPath && oldThumbnailPath !== thumbnailFileName) {
    filesToDelete.push(oldThumbnailPath);
  }
  if (filesToDelete.length > 0) {
    supabase.storage.from('designs').remove(filesToDelete)
      .then(() => console.log('Deleted old files:', filesToDelete))
      .catch((err) => console.warn('Failed to delete old files:', err));
  }

  // Get public URLs
  const { data: previewUrlData } = supabase.storage
    .from('designs')
    .getPublicUrl(previewFileName);
  
  const { data: thumbnailUrlData } = supabase.storage
    .from('designs')
    .getPublicUrl(thumbnailFileName);

  // Save or update design in database
  const designData = {
    title: project.name,
    description: options?.description ?? null,
    model_id: project.modelId,
    preview_image_url: previewUrlData.publicUrl,
    preview_thumbnail_url: thumbnailUrlData.publicUrl,
    project_file_url: projectFileName, // Store path, not full URL
    visibility: options?.visibility ?? 'private',
    published: true,
  };

  let savedDesign: SavedDesign;

  if (designId) {
    // Update existing design
    const { data, error } = await supabase
      .from('designs')
      .update(designData)
      .eq('id', designId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    savedDesign = data as SavedDesign;
  } else {
    // Create new design with the generated ID
    const { data, error } = await supabase
      .from('designs')
      .insert({
        id: finalDesignId,
        ...designData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    savedDesign = data as SavedDesign;
  }

  return savedDesign;
};

/**
 * Load a project from Supabase by design ID
 */
export const loadProjectFromSupabase = async (designId: string): Promise<ProjectFile> => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  // Check authentication (with fallback refresh)
  let { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const refreshResult = await supabase.auth.refreshSession();
    if (!refreshResult.error && refreshResult.data.session) {
      session = refreshResult.data.session;
    }
  }
  if (!session) {
    throw new Error('You must be logged in to load projects');
  }

  // Fetch design from database
  const { data: design, error: designError } = await supabase
    .from('designs')
    .select('*')
    .eq('id', designId)
    .single();

  if (designError) {
    console.error('Error fetching design from database:', designError);
    throw new Error(`Failed to load design: ${designError.message}`);
  }
  if (!design) {
    throw new Error(`Design not found with ID: ${designId}`);
  }

  // Verify user owns the design
  if (design.user_id !== session.user.id) {
    throw new Error('You do not have permission to load this design');
  }


  // Download project file from storage
  const { data: fileData, error: fileError } = await supabase.storage
    .from('designs')
    .download(design.project_file_url);

  if (fileError) {
    console.error('Error downloading project file:', fileError);
    throw new Error(`Failed to download project file: ${fileError.message}`);
  }
  if (!fileData) {
    throw new Error(`Project file not found at path: ${design.project_file_url}`);
  }

  // Convert Blob to File (Supabase Storage returns Blob, but loadProjectFromFile expects File)
  const fileName = design.project_file_url.split('/').pop() || `${designId}.twrap`;
  const file = new File([fileData], fileName, { type: 'application/zip' });

  // Load project from file
  const project = await loadProjectFromFile(file);
  return project;
};

/**
 * Get all designs for the current user
 */
export const getUserDesigns = async (): Promise<SavedDesign[]> => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('You must be logged in');
  }

  const { data, error } = await supabase
    .from('designs')
    .select('*')
    .eq('user_id', session.user.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []) as SavedDesign[];
};

/**
 * Update design visibility
 */
export const updateDesignVisibility = async (
  designId: string,
  visibility: 'private' | 'public'
): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('You must be logged in');
  }

  const { error } = await supabase
    .from('designs')
    .update({ visibility })
    .eq('id', designId)
    .eq('user_id', session.user.id);

  if (error) throw error;
};

// Helper functions
interface ImageReference {
  layerId: string;
  type: 'src' | 'fillImage';
  dataUrl: string;
  filename: string;
}

const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  return await response.blob();
};

/**
 * Generate a thumbnail from an image data URL using Canvas API
 * Returns a WebP blob with the specified max dimension
 */
const generateThumbnail = async (dataUrl: string, maxSize: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height / width) * maxSize);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width / height) * maxSize);
          height = maxSize;
        }
      }
      
      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Use high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to WebP blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail blob'));
          }
        },
        'image/webp',
        0.85 // Quality 85%
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
    img.src = dataUrl;
  });
};

const extractImages = (layers: SerializedLayer[]): { cleanedLayers: SerializedLayer[]; images: ImageReference[] } => {
  const images: ImageReference[] = [];
  
  const cleanedLayers = layers.map(layer => {
    const cleanLayer = { ...layer };
    
    if ((layer.type === 'image' || layer.type === 'texture') && layer.src) {
      if (layer.src.startsWith('data:')) {
        const imageId = `img_${layer.id}_${Date.now()}.png`;
        images.push({
          layerId: layer.id,
          type: 'src',
          dataUrl: layer.src,
          filename: `images/${imageId}`,
        });
        cleanLayer.src = `images/${imageId}`;
      }
    }
    
    if (layer.type === 'fill' && layer.fillImageDataUrl) {
      const imageId = `fill_${layer.id}_${Date.now()}.png`;
      images.push({
        layerId: layer.id,
        type: 'fillImage',
        dataUrl: layer.fillImageDataUrl,
        filename: `images/${imageId}`,
      });
      cleanLayer.fillImageDataUrl = `images/${imageId}`;
    }
    
    return cleanLayer;
  });
  
  return { cleanedLayers, images };
};



