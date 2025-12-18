import { useEffect, useState } from 'react';
import { Image as KonvaImage, Group } from 'react-konva';
import type { TextureLayer as TextureLayerType } from '../../state/editorTypes';
import { loadImage } from '../../../utils/image';
import { useEditorStore } from '../../state/useEditorStore';

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
  const { templateImage } = useEditorStore();

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

  if (!textureImage || !templateImage) return null;

  // Texture layer: texture can move/transform, but mask stays fixed at (0,0)
  // Use a Group to contain both, but mask position is relative to canvas, not layer position
  return (
    <Group
      id={id || layer.id}
      x={0}
      y={0}
      opacity={layer.opacity}
      visible={layer.visible}
      listening={!layer.locked}
      clipX={0}
      clipY={0}
      clipWidth={1024}
      clipHeight={1024}
    >
      {/* Texture image - can be moved and transformed */}
      <Group
        x={layer.x}
        y={layer.y}
        rotation={layer.rotation}
        scaleX={layer.scaleX}
        scaleY={layer.scaleY}
        onClick={onClick}
        onTap={onTap}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onTransformStart={onTransformStart}
        onTransformEnd={onTransformEnd}
        draggable={draggable}
      >
        <KonvaImage
          x={0}
          y={0}
          width={1024}
          height={1024}
          image={textureImage}
        />
      </Group>
      
      {/* Template mask - always at fixed position (0,0), uses destination-in to mask the texture */}
      <Group
        x={0}
        y={0}
        globalCompositeOperation="destination-in"
        listening={false}
      >
        <KonvaImage
          x={0}
          y={0}
          width={1024}
          height={1024}
          image={templateImage}
        />
      </Group>
    </Group>
  );
};
