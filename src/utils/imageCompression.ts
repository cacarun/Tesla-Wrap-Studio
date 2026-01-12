/**
 * Image compression utility to ensure images are below a specified size limit
 * 
 * IMPORTANT: PNG format does NOT support quality parameter in canvas.toBlob()
 * PNG is always lossless. To compress while keeping PNG output, we:
 * 1. First try PNG as-is (re-encoding sometimes helps)
 * 2. If still too large, compress using WebP (which supports quality)
 * 3. Then re-encode the WebP result back to PNG
 * 
 * This gives us lossy compression while maintaining PNG output format.
 */

const MAX_SIZE_BYTES = 995328 // 0.95MB
const MIN_QUALITY = 0.3
const MAX_QUALITY = 0.95

export interface CompressionResult {
  blob: Blob
  quality: number
  originalSize: number
  compressedSize: number
}

/**
 * Loads an image from various sources (File, Blob, or data URL)
 */
async function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    
    if (typeof source === 'string') {
      // Data URL
      img.src = source
    } else {
      // File or Blob
      const url = URL.createObjectURL(source)
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }
      img.src = url
    }
  })
}

/**
 * Convert a blob to PNG format via canvas
 */
async function convertToPng(blob: Blob): Promise<Blob> {
  const img = await loadImage(blob)
  
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }
  
  ctx.drawImage(img, 0, 0)
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (pngBlob) => {
        if (pngBlob) {
          resolve(pngBlob)
        } else {
          reject(new Error('Failed to convert to PNG'))
        }
      },
      'image/png'
    )
  })
}

/**
 * Compresses an image to be under the specified size limit
 * Output is always PNG format
 * 
 * Strategy:
 * 1. Try PNG re-encoding first (sometimes helps)
 * 2. If too large, use WebP compression with quality reduction
 * 3. Convert the compressed WebP back to PNG
 * 
 * @param imageSource - Image as File, Blob, or data URL
 * @param maxSizeBytes - Maximum size in bytes (default: 0.95MB)
 * @returns Compressed blob with metadata (as PNG)
 */
export async function compressImageToSizeLimit(
  imageSource: File | Blob | string,
  maxSizeBytes: number = MAX_SIZE_BYTES
): Promise<CompressionResult> {
  // Load the image
  const img = await loadImage(imageSource)
  
  // Get original size
  let originalSize = 0
  if (imageSource instanceof File || imageSource instanceof Blob) {
    originalSize = imageSource.size
  } else if (typeof imageSource === 'string') {
    // Estimate from data URL (base64 encoded)
    originalSize = Math.floor((imageSource.length * 3) / 4)
  }
  
  // Create canvas with original dimensions
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }
  
  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  
  // Draw image to canvas
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  
  // Step 1: Try PNG first - re-encoding sometimes helps
  let pngBlob: Blob | null = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
  
  if (!pngBlob) {
    throw new Error('Failed to create PNG blob')
  }
  
  // If PNG is already under limit, return it
  if (pngBlob.size <= maxSizeBytes) {
    console.log(`PNG already under limit: ${(pngBlob.size / 1024 / 1024).toFixed(2)}MB`)
    return {
      blob: pngBlob,
      quality: 1.0,
      originalSize,
      compressedSize: pngBlob.size
    }
  }
  
  console.log(`PNG too large (${(pngBlob.size / 1024 / 1024).toFixed(2)}MB), using WebP compression...`)
  
  // Step 2: Use WebP compression with binary search for optimal quality
  let quality = MAX_QUALITY
  let bestQuality = MAX_QUALITY
  let bestWebpBlob: Blob | null = null
  let bestSize = pngBlob.size
  
  let lowQuality = MIN_QUALITY
  let highQuality = MAX_QUALITY
  
  while (highQuality - lowQuality > 0.02) {
    quality = (lowQuality + highQuality) / 2
    
    // Compress using WebP (which supports quality parameter)
    const webpBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/webp',
        quality
      )
    })
    
    if (!webpBlob) {
      throw new Error('Failed to create WebP blob')
    }
    
    // Convert WebP back to PNG to check final size
    const testPngBlob = await convertToPng(webpBlob)
    
    if (testPngBlob.size <= maxSizeBytes) {
      // This quality works, save it and try higher quality
      bestQuality = quality
      bestWebpBlob = webpBlob
      bestSize = testPngBlob.size
      lowQuality = quality
    } else {
      // Too large, need lower quality
      highQuality = quality
    }
  }
  
  // Step 3: Use the best quality found, or try minimum quality
  if (bestWebpBlob && bestSize <= maxSizeBytes) {
    const finalPngBlob = await convertToPng(bestWebpBlob)
    console.log(`Compressed via WebP (quality: ${bestQuality.toFixed(2)}): ${(finalPngBlob.size / 1024 / 1024).toFixed(2)}MB`)
    return {
      blob: finalPngBlob,
      quality: bestQuality,
      originalSize,
      compressedSize: finalPngBlob.size
    }
  }
  
  // Try minimum quality
  const minWebpBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      'image/webp',
      MIN_QUALITY
    )
  })
  
  if (!minWebpBlob) {
    throw new Error('Failed to create WebP blob at minimum quality')
  }
  
  const finalPngBlob = await convertToPng(minWebpBlob)
  
  if (finalPngBlob.size > maxSizeBytes) {
    console.warn(
      `Image could not be compressed below ${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB. ` +
      `Final size: ${(finalPngBlob.size / 1024 / 1024).toFixed(2)}MB`
    )
  } else {
    console.log(`Compressed via WebP (quality: ${MIN_QUALITY}): ${(finalPngBlob.size / 1024 / 1024).toFixed(2)}MB`)
  }
  
  return {
    blob: finalPngBlob,
    quality: MIN_QUALITY,
    originalSize,
    compressedSize: finalPngBlob.size
  }
}
