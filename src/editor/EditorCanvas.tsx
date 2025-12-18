import { useEffect, useRef, forwardRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Group } from 'react-konva';
import type { Stage as StageType } from 'konva/lib/Stage';
import { useEditorStore } from './state/useEditorStore';
import { TextLayer } from './components/layers/TextLayer';
import { ImageLayer } from './components/layers/ImageLayer';
import { RectLayer } from './components/layers/RectLayer';
import { CircleLayer } from './components/layers/CircleLayer';
import { TextureLayer } from './components/layers/TextureLayer';
import { BrushLayer } from './components/layers/BrushLayer';
import { LineLayer } from './components/layers/LineLayer';
import { StarLayer } from './components/layers/StarLayer';
import { TransformerWrapper } from './components/TransformerWrapper';
import { BrushTool } from './components/BrushTool';
import { loadImage } from '../utils/image';
import { carModels } from '../data/carModels';
import { getTemplateUrl } from '../utils/assets';

interface EditorCanvasProps {
  onStageReady?: (stage: StageType | null) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  autoFit?: boolean;
  onAutoFitChange?: (autoFit: boolean) => void;
}

export const EditorCanvas = forwardRef<StageType | null, EditorCanvasProps>(({ onStageReady, zoom = 1, onZoomChange, autoFit = true, onAutoFitChange }, ref) => {
  const stageRef = useRef<StageType | null>(null);
  const canvasAreaRef = useRef<HTMLDivElement | null>(null);
  const transformStartDataRef = useRef<{ layerId: string; width?: number; height?: number; scaleX: number; scaleY: number } | null>(null);
  
  // Use zoom prop, default to 1
  const scale = zoom;
  
  const zoomPercentage = Math.round(zoom * 100);
  const minZoom = 0.1; // 10%
  const maxZoom = 5; // 500%
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && onZoomChange) {
      const newZoom = Math.max(minZoom, Math.min(maxZoom, value / 100));
      if (onAutoFitChange) {
        onAutoFitChange(false);
      }
      onZoomChange(newZoom);
    }
  };

  // Handle mouse wheel zoom (Ctrl/Cmd + Scroll) - Faster, more responsive
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Check if Ctrl (Windows/Linux) or Cmd (Mac) is pressed
      if (!(e.ctrlKey || e.metaKey) || !onZoomChange) return;
      
      // Prevent browser zoom
      e.preventDefault();
      
      // Calculate zoom change - increased multiplier for faster, more responsive zoom
      const zoomDelta = -e.deltaY * 0.01; // Increased from 0.001 for faster zoom
      const currentZoom = zoom;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom * (1 + zoomDelta)));
      
      if (onAutoFitChange) {
        onAutoFitChange(false);
      }
      onZoomChange(newZoom);
    };

    const canvasArea = canvasAreaRef.current;
    if (canvasArea) {
      canvasArea.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        canvasArea.removeEventListener('wheel', handleWheel);
      };
    }
  }, [zoom, onZoomChange, onAutoFitChange, minZoom, maxZoom]);

  // Calculate max fit zoom (100% of available space)
  const calculateMaxFitZoom = () => {
    if (!canvasAreaRef.current || !onZoomChange) return;
    
    const canvasArea = canvasAreaRef.current;
    const areaRect = canvasArea.getBoundingClientRect();
    const padding = 20;
    const maxWidth = Math.max(0, areaRect.width - padding * 2);
    const maxHeight = Math.max(0, areaRect.height - padding * 2);

    if (maxWidth <= 0 || maxHeight <= 0) return;

    const scaleX = maxWidth / 1024;
    const scaleY = maxHeight / 1024;
    const maxFitZoom = Math.min(scaleX, scaleY);

    if (maxFitZoom > 0) {
      const clampedZoom = Math.max(minZoom, Math.min(maxFitZoom, maxZoom));
      if (onAutoFitChange) {
        onAutoFitChange(false);
      }
      onZoomChange(clampedZoom);
    }
  };

  // Calculate auto-fit zoom based on actual canvas area dimensions
  useEffect(() => {
    if (!autoFit || !canvasAreaRef.current || !onZoomChange) return;

    const calculateAutoFitZoom = () => {
      const canvasArea = canvasAreaRef.current;
      if (!canvasArea) return;

      const areaRect = canvasArea.getBoundingClientRect();
      // Use available space with padding to ensure canvas fits completely
      const padding = 20;
      const maxWidth = Math.max(0, areaRect.width - padding * 2);
      const maxHeight = Math.max(0, areaRect.height - padding * 2);

      // Only calculate if we have valid dimensions
      if (maxWidth <= 0 || maxHeight <= 0) return;

      // Calculate scale to fit 1024x1024 canvas
      const scaleX = maxWidth / 1024;
      const scaleY = maxHeight / 1024;
      // Use minimum to ensure it fits in both dimensions (no overflow)
      const newZoom = Math.min(scaleX, scaleY);

      if (newZoom > 0) {
        const clampedZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));
        onZoomChange(clampedZoom);
      }
    };

    // Use requestAnimationFrame to ensure DOM is fully laid out
    const rafId = requestAnimationFrame(() => {
      calculateAutoFitZoom();
    });

    window.addEventListener('resize', calculateAutoFitZoom);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', calculateAutoFitZoom);
    };
  }, [autoFit, onZoomChange, minZoom, maxZoom]);

  const {
    layers,
    selectedLayerId,
    baseColor,
    currentModelId,
    templateDimensions,
    templateImage,
    activeTool,
    setTemplateDimensions,
    setTemplateImage,
    updateLayer,
    setSelection,
  } = useEditorStore();

  const currentModel = carModels.find((m) => m.id === currentModelId) || carModels[0];

  // Load template image
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const templateUrl = getTemplateUrl(currentModel.folderName);
        const img = await loadImage(templateUrl);
        setTemplateImage(img);
        // Templates are always 1024x1024 pixels - this is a requirement
        setTemplateDimensions({ width: 1024, height: 1024 });
      } catch (error) {
        console.error('Failed to load template:', error);
      }
    };
    loadTemplate();
  }, [currentModelId, currentModel.folderName, setTemplateImage, setTemplateDimensions]);


  const handleStageClick = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    // Don't deselect when using brush/eraser tool (we want to keep drawing on the current layer)
    if (clickedOnEmpty && activeTool === 'select') {
      setSelection(null);
    }
  };

  const handleLayerClick = (e: any, layerId: string) => {
    e.cancelBubble = true;
    setSelection(layerId);
  };

  const handleDragStart = (e: any) => {
    // Add visual feedback during drag
    const node = e.target;
    node.opacity(0.8);
    const stage = node.getStage();
    if (stage) {
      stage.container().style.cursor = 'grabbing';
    }
  };

  const handleDragEnd = (e: any, layerId: string) => {
    const node = e.target;
    // Restore opacity
    node.opacity(layers.find(l => l.id === layerId)?.opacity || 1);
    const stage = node.getStage();
    if (stage) {
      stage.container().style.cursor = 'default';
    }
    updateLayer(layerId, {
      x: node.x(),
      y: node.y(),
    });
  };

  const handleTransformStart = (e: any, layerId: string) => {
    // Visual feedback during transform
    const node = e.target;
    const stage = node.getStage();
    if (stage) {
      stage.container().style.cursor = 'move';
    }
    // Store original dimensions for proper resize calculation
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      transformStartDataRef.current = {
        layerId,
        width: (layer as any).width,
        height: (layer as any).height,
        scaleX: layer.scaleX || 1,
        scaleY: layer.scaleY || 1,
      };
    }
  };

  const handleTransformEnd = (e: any, layerId: string) => {
    const node = e.target;
    const stage = node.getStage();
    if (stage) {
      stage.container().style.cursor = 'default';
    }
    
    const layer = layers.find(l => l.id === layerId);
    if (!layer) {
      transformStartDataRef.current = null;
      return;
    }
    
    // For rect layers, update actual width/height based on scale (Photoshop-like behavior)
    if (layer.type === 'rect' && transformStartDataRef.current) {
      const startData = transformStartDataRef.current;
      const originalWidth = startData.width || 0;
      const originalHeight = startData.height || 0;
      const originalScaleX = startData.scaleX;
      const originalScaleY = startData.scaleY;
      
      // Calculate new dimensions: original * (newScale / originalScale)
      const newWidth = Math.abs(originalWidth * (node.scaleX() / originalScaleX));
      const newHeight = Math.abs(originalHeight * (node.scaleY() / originalScaleY));
      
      updateLayer(layerId, {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        width: newWidth,
        height: newHeight,
        scaleX: 1,
        scaleY: 1,
      });
    } else {
      // For other layer types, use scaleX/scaleY
      updateLayer(layerId, {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
      });
    }
    
    transformStartDataRef.current = null;
  };

  // Expose stage ref
  useEffect(() => {
    if (onStageReady) {
      onStageReady(stageRef.current);
    }
    if (ref) {
      if (typeof ref === 'function') {
        ref(stageRef.current);
      } else {
        (ref as React.MutableRefObject<StageType | null>).current = stageRef.current;
      }
    }
  }, [onStageReady, ref, templateDimensions]);

  if (!templateDimensions || !templateImage) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-tesla-black via-[#3a3b3c] to-tesla-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tesla-red mx-auto mb-4"></div>
          <div className="text-tesla-gray">Loading template...</div>
        </div>
      </div>
    );
  }

  // Canvas is always exactly 1024x1024 pixels - pixel perfect rendering at any zoom
  return (
    <div
      id="canvas-container"
      className="relative w-full h-full flex flex-col bg-gradient-to-br from-tesla-black via-[#3a3b3c] to-tesla-black overflow-hidden"
    >
      {/* Canvas Area */}
      <div ref={canvasAreaRef} className="flex-1 flex items-center justify-center overflow-auto canvas-scrollbar" style={{ minHeight: 0 }}>
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            width: 1024,
            height: 1024,
            borderRadius: 0,
            flexShrink: 0,
            aspectRatio: '1 / 1',
          }}
          className="overflow-hidden canvas-wrapper"
        >
          <Stage
            ref={stageRef as React.RefObject<StageType>}
            width={1024}
            height={1024}
            onClick={handleStageClick}
            onTap={handleStageClick}
            style={{
              borderRadius: 0,
              width: '1024px',
              height: '1024px',
            }}
          >
          <Layer>
            {/* Base color masked by template */}
            <Group>
              <Rect x={0} y={0} width={1024} height={1024} fill={baseColor} listening={false} />
              <Group globalCompositeOperation="destination-in" listening={false}>
                <KonvaImage x={0} y={0} width={1024} height={1024} image={templateImage} />
              </Group>
            </Group>

            {/* Masked design layers */}
            <Group>
              {[...layers].reverse().map((layer) => {
                const isBrushLayer = layer.type === 'brush';
                const commonProps = {
                  id: layer.id,
                  onClick: (e: any) => handleLayerClick(e, layer.id),
                  onTap: (e: any) => handleLayerClick(e, layer.id),
                  onDragStart: isBrushLayer ? undefined : handleDragStart,
                  onDragEnd: isBrushLayer ? undefined : (e: any) => handleDragEnd(e, layer.id),
                  onTransformStart: isBrushLayer ? undefined : (e: any) => handleTransformStart(e, layer.id),
                  onTransformEnd: isBrushLayer ? undefined : (e: any) => handleTransformEnd(e, layer.id),
                  draggable: !layer.locked && !isBrushLayer,
                };

                switch (layer.type) {
                  case 'text':
                    return <TextLayer key={layer.id} layer={layer} {...commonProps} />;
                  case 'image':
                    return <ImageLayer key={layer.id} layer={layer} {...commonProps} />;
                  case 'texture':
                    return <TextureLayer key={layer.id} layer={layer} {...commonProps} />;
                  case 'brush':
                    return <BrushLayer key={layer.id} layer={layer} {...commonProps} />;
                  case 'line':
                    return <LineLayer key={layer.id} layer={layer} {...commonProps} />;
                  case 'star':
                    return <StarLayer key={layer.id} layer={layer} {...commonProps} />;
                  case 'rect':
                    return <RectLayer key={layer.id} layer={layer} {...commonProps} />;
                  case 'circle':
                    return <CircleLayer key={layer.id} layer={layer} {...commonProps} />;
                  default:
                    return null;
                }
              })}
              <Group globalCompositeOperation="destination-in" listening={false}>
                <KonvaImage x={0} y={0} width={1024} height={1024} image={templateImage} />
              </Group>
            </Group>

            {/* Transformer on top (not masked) */}
            <TransformerWrapper selectedLayerId={selectedLayerId} layers={layers} />
          </Layer>
          </Stage>
          <BrushTool stageRef={stageRef} />
        </div>
      </div>

      {/* Floating Zoom Controls */}
      <div className="absolute bottom-3 right-3 bg-tesla-black/80 backdrop-blur-xl border border-tesla-dark/40 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-xl">
        <button
          onClick={calculateMaxFitZoom}
          className="p-1 rounded-lg text-tesla-gray hover:text-tesla-light hover:bg-tesla-dark/30 transition-colors"
          title="Fit to Screen"
          aria-label="Fit to Screen"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4m-4 0l5 5M20 8V4h-4m4 0l-5 5M4 16v4h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <div className="w-px h-3 bg-tesla-dark/40"></div>
        <div className="relative flex items-center" style={{ width: '80px' }}>
          <div className="absolute w-full h-0.5 bg-tesla-dark/50 rounded-full"></div>
          <div
            className="absolute h-0.5 bg-tesla-gray/70 rounded-full transition-all"
            style={{
              width: `${((zoom - minZoom) / (maxZoom - minZoom)) * 100}%`,
            }}
          ></div>
          <input
            type="range"
            min={minZoom * 100}
            max={maxZoom * 100}
            value={zoomPercentage}
            onChange={handleSliderChange}
            className="relative w-full h-1 bg-transparent appearance-none cursor-pointer slider-thumb-integrated"
            style={{ background: 'transparent' }}
            title="Zoom slider"
            aria-label="Canvas zoom level"
          />
          <style>{`
            .slider-thumb-integrated::-webkit-slider-thumb {
              appearance: none;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background: #ffffff;
              border: 1px solid rgba(156, 163, 175, 0.6);
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
              cursor: pointer;
            }
            .slider-thumb-integrated::-moz-range-thumb {
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background: #ffffff;
              border: 1px solid rgba(156, 163, 175, 0.6);
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
              cursor: pointer;
            }
          `}</style>
        </div>
        <span className="text-xs font-medium text-tesla-gray min-w-[2rem] text-right">
          {zoomPercentage}%
        </span>
      </div>
    </div>
  );
});

EditorCanvas.displayName = 'EditorCanvas';

