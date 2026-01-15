import { Star } from 'react-konva';
import type { StarLayer as StarLayerType } from '../../state/editorTypes';

interface StarLayerProps {
  layer: StarLayerType;
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

export const StarLayer = ({
  layer,
  id,
  onClick,
  onTap,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransformStart,
  onTransformEnd,
  draggable,
}: StarLayerProps) => {
  return (
    <Star
      id={id || layer.id}
      x={layer.x}
      y={layer.y}
      numPoints={layer.numPoints}
      innerRadius={layer.innerRadius}
      outerRadius={layer.outerRadius}
      fill={layer.fill}
      stroke={layer.stroke}
      strokeWidth={layer.strokeWidth}
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
