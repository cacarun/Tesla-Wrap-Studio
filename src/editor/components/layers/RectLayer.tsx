import { Rect } from 'react-konva';
import type { RectLayer as RectLayerType } from '../../state/editorTypes';

interface RectLayerProps {
  layer: RectLayerType;
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

export const RectLayer = ({ 
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
}: RectLayerProps) => {
  return (
    <Rect
      id={id || layer.id}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      fill={layer.fill}
      stroke={layer.stroke}
      strokeWidth={layer.strokeWidth}
      cornerRadius={layer.cornerRadius}
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

