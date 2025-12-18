export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for external URLs, not data URLs
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const downscaleImage = (
  image: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): HTMLImageElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  let { width, height } = image;
  
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = width * ratio;
    height = height * ratio;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  const downscaled = new Image();
  downscaled.src = canvas.toDataURL();
  return downscaled;
};

/**
 * Calculate scale factor to resize image so the long side is approximately targetSize
 * @param image - The image element
 * @param targetSize - Target size for the long side (default: 300px)
 * @returns Scale factor (scaleX and scaleY will be the same to maintain aspect ratio)
 */
export const calculateImageScale = (image: HTMLImageElement, targetSize: number = 300): number => {
  const longSide = Math.max(image.width, image.height);
  if (longSide <= targetSize) {
    return 1; // Image is already small enough
  }
  return targetSize / longSide;
};

