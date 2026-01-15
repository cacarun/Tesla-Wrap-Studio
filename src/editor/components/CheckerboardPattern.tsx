import { useMemo } from 'react';
import { Rect } from 'react-konva';

interface CheckerboardPatternProps {
  width: number;
  height: number;
  tileSize?: number;
}

export const CheckerboardPattern = ({ width, height, tileSize = 20 }: CheckerboardPatternProps) => {
  const tiles = useMemo(() => {
    const cols = Math.ceil(width / tileSize);
    const rows = Math.ceil(height / tileSize);
    const tilesArray = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const isEven = (row + col) % 2 === 0;
        tilesArray.push(
          <Rect
            key={`${row}-${col}`}
            x={col * tileSize}
            y={row * tileSize}
            width={tileSize}
            height={tileSize}
            fill={isEven ? '#D7DCDD' : '#B9BEC1'}
          />
        );
      }
    }
    return tilesArray;
  }, [width, height, tileSize]);

  return <>{tiles}</>;
};

