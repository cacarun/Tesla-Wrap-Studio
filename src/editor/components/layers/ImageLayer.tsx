import { useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import type { ImageLayer as ImageLayerType } from '../../state/editorTypes';
import { loadImage } from '../../../utils/image';

interface ImageLayerProps {
  layer: ImageLayerType;
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

export const ImageLayer = ({ 
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
}: ImageLayerProps) => {
  const [image, setImage] = useState<HTMLImageElement | null>(layer.image || null);

  useEffect(() => {
    if (layer.image) {
      setImage(layer.image);
    } else if (layer.src) {
      loadImage(layer.src)
        .then(setImage)
        .catch((error) => {
          console.error('Failed to load image:', error);
        });
    }
  }, [layer.image, layer.src]);

  if (!image) return null;

  return (
    <KonvaImage
      id={id || layer.id}
      x={layer.x}
      y={layer.y}
      image={image}
      rotation={layer.rotation}
      scaleX={layer.scaleX}
      scaleY={layer.scaleY}
      opacity={layer.opacity}
      visible={layer.visible}
      listening={!layer.locked}
      cropX={layer.cropX}
      cropY={layer.cropY}
      cropWidth={layer.cropWidth}
      cropHeight={layer.cropHeight}
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

