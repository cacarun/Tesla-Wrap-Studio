import { useEffect, useRef, forwardRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Group } from 'react-konva';
import type { Stage as StageType } from 'konva/lib/Stage';
import { useEditorStore } from './state/useEditorStore';
import { TextureLayer } from './components/layers/TextureLayer';
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

export const EditorCanvas = forwardRef<StageType | null, EditorCanvasProps>(
  ({ onStageReady, zoom = 1, onZoomChange, autoFit = true, onAutoFitChange }, ref) => {
    const stageRef = useRef<StageType | null>(null);
    const canvasAreaRef = useRef<HTMLDivElement | null>(null);

    const scale = zoom;
    const zoomPercentage = Math.round(zoom * 100);
    const minZoom = 0.1;
    const maxZoom = 5;

    const {
      baseColor,
      currentModelId,
      templateDimensions,
      templateImage,
      textureLayer,
      setTemplateDimensions,
      setTemplateImage,
    } = useEditorStore();

    const currentModel = carModels.find((m) => m.id === currentModelId) || carModels[0];

    // Handle mouse wheel zoom
    useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
        if (!(e.ctrlKey || e.metaKey) || !onZoomChange) return;
        e.preventDefault();
        const zoomDelta = -e.deltaY * 0.01;
        const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom * (1 + zoomDelta)));
        if (onAutoFitChange) onAutoFitChange(false);
        onZoomChange(newZoom);
      };

      const canvasArea = canvasAreaRef.current;
      if (canvasArea) {
        canvasArea.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvasArea.removeEventListener('wheel', handleWheel);
      }
    }, [zoom, onZoomChange, onAutoFitChange]);

    // Calculate auto-fit zoom
    useEffect(() => {
      if (!autoFit || !canvasAreaRef.current || !onZoomChange) return;

      const calculateAutoFitZoom = () => {
        const canvasArea = canvasAreaRef.current;
        if (!canvasArea) return;

        const areaRect = canvasArea.getBoundingClientRect();
        const padding = 20;
        const maxWidth = Math.max(0, areaRect.width - padding * 2);
        const maxHeight = Math.max(0, areaRect.height - padding * 2);

        if (maxWidth <= 0 || maxHeight <= 0) return;

        const scaleX = maxWidth / 1024;
        const scaleY = maxHeight / 1024;
        const newZoom = Math.min(scaleX, scaleY);

        if (newZoom > 0) {
          const clampedZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));
          onZoomChange(clampedZoom);
        }
      };

      const rafId = requestAnimationFrame(() => calculateAutoFitZoom());
      window.addEventListener('resize', calculateAutoFitZoom);
      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', calculateAutoFitZoom);
      };
    }, [autoFit, onZoomChange]);

    // Load template image
    useEffect(() => {
      const loadTemplate = async () => {
        try {
          const templateUrl = getTemplateUrl(currentModel.folderName);
          const img = await loadImage(templateUrl);
          setTemplateImage(img);
          setTemplateDimensions({ width: 1024, height: 1024 });
        } catch (error) {
          console.error('Failed to load template:', error);
        }
      };
      loadTemplate();
    }, [currentModelId, currentModel.folderName, setTemplateImage, setTemplateDimensions]);

    // Expose stage ref
    useEffect(() => {
      if (onStageReady) onStageReady(stageRef.current);
      if (ref) {
        if (typeof ref === 'function') {
          ref(stageRef.current);
        } else {
          (ref as React.MutableRefObject<StageType | null>).current = stageRef.current;
        }
      }
    }, [onStageReady, ref, templateDimensions]);

    // Handle zoom slider
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value) && onZoomChange) {
        const newZoom = Math.max(minZoom, Math.min(maxZoom, value / 100));
        if (onAutoFitChange) onAutoFitChange(false);
        onZoomChange(newZoom);
      }
    };

    // Fit to screen
    const handleFitToScreen = () => {
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
        if (onAutoFitChange) onAutoFitChange(false);
        onZoomChange(Math.max(minZoom, Math.min(maxFitZoom, maxZoom)));
      }
    };

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

    return (
      <div className="relative w-full h-full flex flex-col overflow-hidden bg-gradient-to-br from-[#4A4B4C] via-[#3a3b3c] to-[#4A4B4C]">
        {/* Canvas Area */}
        <div ref={canvasAreaRef} className="relative flex-1 overflow-auto" style={{ minHeight: 0 }}>
          <div
            style={{
              width: `${1024 * scale}px`,
              height: `${1024 * scale}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              margin: 'auto',
            }}
          >
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                width: 1024,
                height: 1024,
                flexShrink: 0,
              }}
            >
              <Stage
                ref={stageRef as React.RefObject<StageType>}
                width={1024}
                height={1024}
                style={{ width: '1024px', height: '1024px' }}
              >
                <Layer>
                  {/* Base color masked by template */}
                  <Group>
                    <Rect x={0} y={0} width={1024} height={1024} fill={baseColor} listening={false} />
                    <Group globalCompositeOperation="destination-in" listening={false}>
                      <KonvaImage x={0} y={0} width={1024} height={1024} image={templateImage} />
                    </Group>
                  </Group>

                  {/* AI generated texture layer */}
                  <Group>
                    {textureLayer && <TextureLayer layer={textureLayer} />}
                    <Group globalCompositeOperation="destination-in" listening={false}>
                      <KonvaImage x={0} y={0} width={1024} height={1024} image={templateImage} />
                    </Group>
                  </Group>
                </Layer>
              </Stage>
            </div>
          </div>
        </div>

        {/* Floating Zoom Controls */}
        <div className="absolute bottom-3 right-3 bg-tesla-black/80 backdrop-blur-xl border border-tesla-dark/40 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-xl">
          <button
            onClick={handleFitToScreen}
            className="p-1 rounded-lg text-tesla-gray hover:text-tesla-light hover:bg-tesla-dark/30 transition-colors"
            title="Fit to Screen"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4h4m-4 0l5 5M20 8V4h-4m4 0l-5 5M4 16v4h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
          <div className="w-px h-3 bg-tesla-dark/40"></div>
          <div className="relative flex items-center" style={{ width: '80px' }}>
            <div className="absolute w-full h-0.5 bg-tesla-dark/50 rounded-full"></div>
            <div
              className="absolute h-0.5 bg-tesla-gray/70 rounded-full transition-all"
              style={{ width: `${((zoom - minZoom) / (maxZoom - minZoom)) * 100}%` }}
            ></div>
            <input
              type="range"
              min={minZoom * 100}
              max={maxZoom * 100}
              value={zoomPercentage}
              onChange={handleSliderChange}
              className="relative w-full h-1 bg-transparent appearance-none cursor-pointer"
              style={{ background: 'transparent' }}
              title="Zoom slider"
            />
            <style>{`
              input[type="range"]::-webkit-slider-thumb {
                appearance: none;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #ffffff;
                border: 1px solid rgba(156, 163, 175, 0.6);
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                cursor: pointer;
              }
              input[type="range"]::-moz-range-thumb {
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
          <span className="text-xs font-medium text-tesla-gray min-w-[2rem] text-right">{zoomPercentage}%</span>
        </div>
      </div>
    );
  }
);

EditorCanvas.displayName = 'EditorCanvas';
