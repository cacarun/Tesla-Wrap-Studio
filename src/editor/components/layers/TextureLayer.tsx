import { useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import type { TextureLayer as TextureLayerType } from '../../state/editorTypes';
import { loadImage } from '../../../utils/image';

interface TextureLayerProps {
  layer: TextureLayerType;
}

export const TextureLayer = ({ layer }: TextureLayerProps) => {
  const [textureImage, setTextureImage] = useState<HTMLImageElement | null>(layer.image || null);

  useEffect(() => {
    if (layer.image) {
      setTextureImage(layer.image);
    } else if (layer.src) {
      loadImage(layer.src)
        .then(setTextureImage)
        .catch((error) => {
          console.error('Failed to load texture image:', error);
        });
    }
  }, [layer.image, layer.src]);

  if (!textureImage) return null;

  return (
    <KonvaImage
      id={layer.id}
      x={layer.x}
      y={layer.y}
      image={textureImage}
      scaleX={layer.scaleX}
      scaleY={layer.scaleY}
      opacity={layer.opacity}
      visible={layer.visible}
      listening={false}
    />
  );
};
