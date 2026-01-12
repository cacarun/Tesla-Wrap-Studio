/**
 * Image compression utility to ensure images are below a specified size limit
 * Uses adaptive quality reduction for PNG images while maintaining dimensions
 */

const MAX_SIZE_BYTES = 995328 // 0.95MB
const MIN_QUALITY = 0.1
const MAX_QUALITY = 0.95
const QUALITY_STEP = 0.05

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
 * Compresses a PNG image to be under the specified size limit
 * Uses adaptive quality reduction - starts high and reduces until under limit
 * 
 * @param imageSource - Image as File, Blob, or data URL
 * @param maxSizeBytes - Maximum size in bytes (default: 0.95MB)
 * @returns Compressed blob with metadata
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
  
  // Try different quality levels until we're under the limit
  let quality = MAX_QUALITY
  let compressedBlob: Blob | null = null
  let compressedSize = originalSize
  
  // Binary search approach for efficiency
  let lowQuality = MIN_QUALITY
  let highQuality = MAX_QUALITY
  let bestQuality = MAX_QUALITY
  
  while (highQuality - lowQuality > 0.01) {
    quality = (lowQuality + highQuality) / 2
    
    // Convert canvas to blob with current quality
    compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/png',
        quality
      )
    })
    
    if (!compressedBlob) {
      throw new Error('Failed to compress image')
    }
    
    compressedSize = compressedBlob.size
    
    if (compressedSize <= maxSizeBytes) {
      // This quality works, try higher quality
      bestQuality = quality
      lowQuality = quality
    } else {
      // Too large, need lower quality
      highQuality = quality
    }
  }
  
  // Final compression with best quality found
  if (compressedSize > maxSizeBytes || bestQuality !== quality) {
    compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/png',
        bestQuality
      )
    })
    
    if (!compressedBlob) {
      throw new Error('Failed to compress image')
    }
    
    compressedSize = compressedBlob.size
    quality = bestQuality
  }
  
  // If still too large after all attempts, use minimum quality
  if (compressedSize > maxSizeBytes) {
    compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/png',
        MIN_QUALITY
      )
    })
    
    if (!compressedBlob) {
      throw new Error('Failed to compress image')
    }
    
    compressedSize = compressedBlob.size
    quality = MIN_QUALITY
    
    // If still too large, warn but return the best we can do
    if (compressedSize > maxSizeBytes) {
      console.warn(
        `Image could not be compressed below ${maxSizeBytes} bytes. ` +
        `Final size: ${compressedSize} bytes (${(compressedSize / 1024 / 1024).toFixed(2)}MB)`
      )
    }
  }
  
  return {
    blob: compressedBlob,
    quality,
    originalSize,
    compressedSize
  }
}
