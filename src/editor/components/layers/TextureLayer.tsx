import { useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import type { TextureLayer as TextureLayerType } from '../../state/editorTypes';
import { loadImage } from '../../../utils/image';

interface TextureLayerProps {
  layer: TextureLayerType;
  id?: string;
  onClick?: (e: any) => void;
  onTap?: (e: any) => void;
  onDragStart?: (e: any) => void;
  onDragMove?: (e: any) => void;
  onDragEnd?: (e: any) => void;
  onTransformStart?: (e: any) => void;
  onTransformEnd?: (e: any) => void;
  draggable?: boolean;
}

export const TextureLayer = ({ 
  layer,
  id,
  onClick,
  onTap,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransformStart,
  onTransformEnd,
  draggable 
}: TextureLayerProps) => {
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

  // Render as a simple image - same behavior as ImageLayer
  // This allows normal transform/resize operations
  return (
    <KonvaImage
      id={id || layer.id}
      x={layer.x}
      y={layer.y}
      image={textureImage}
      rotation={layer.rotation}
      scaleX={layer.scaleX}
      scaleY={layer.scaleY}
      opacity={layer.opacity}
      visible={layer.visible}
      listening={!layer.locked}
      onClick={onClick}
      onTap={onTap}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformStart={onTransformStart}
      onTransformEnd={onTransformEnd}
      draggable={draggable}
    />
  );
};
