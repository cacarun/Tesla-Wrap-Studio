import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { X, Play, Pause, Eye, Move, ZoomIn, ZoomOut, Car } from 'lucide-react';
import type { Stage as StageType } from 'konva/lib/Stage';
import { useEditorStore } from '../editor/state/useEditorStore';
import { carModels } from '../data/carModels';
import logo from '../assets/logo-darktext.png';

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

interface GodotViewerProps {
  isOpen: boolean;
  onClose: () => void;
  stageRef: React.RefObject<StageType | null>;
}

// Public URL for the .pck file in Cloudflare R2
const PCK_URL = 'https://lfs.tesla-wrap.com/index.pck';

// Local storage key for first-time hint
const VIEWER_HINT_SHOWN_KEY = 'tesla-wrap-viewer-hint-shown';

export const GodotViewer = ({ isOpen, onClose, stageRef }: GodotViewerProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const godotReadyRef = useRef(false);
  const receivedRealProgressRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState<'loading' | 'initializing' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [godotReady, setGodotReady] = useState(false);
  const [, setCarLoaded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showHints, setShowHints] = useState(false);
  const [iframeEverLoaded, setIframeEverLoaded] = useState(false);
  const [plateRegion, setPlateRegion] = useState<'us' | 'eu'>('us');
  const plateRegionRef = useRef<'us' | 'eu'>('us');
  const autoRotateRef = useRef<boolean>(true);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const { currentModelId, textureLayer, baseColor } = useEditorStore();
  const currentModel =
    carModels.find((m) => m.id === currentModelId) || carModels.find((m) => m.id === 'modely') || carModels[0];

  // Create a change signature to detect canvas updates
  const changeSignature = useMemo(() => {
    return JSON.stringify({
      baseColor,
      textureLayer: textureLayer
        ? {
            id: textureLayer.id,
            visible: textureLayer.visible,
            opacity: textureLayer.opacity,
            x: textureLayer.x,
            y: textureLayer.y,
            scaleX: textureLayer.scaleX,
            scaleY: textureLayer.scaleY,
            srcLength: textureLayer.src?.length || 0,
          }
        : null,
    });
  }, [textureLayer, baseColor]);

  // Debounce the signature to avoid too many updates
  const debouncedSignature = useDebounce(changeSignature, 200);

  // Track last loaded model to prevent duplicate loads
  const lastLoadedModelRef = useRef<string | null>(null);

  // Check if this is first time viewing
  useEffect(() => {
    if (isOpen && godotReady) {
      const hintShown = localStorage.getItem(VIEWER_HINT_SHOWN_KEY);
      if (!hintShown) {
        setShowHints(true);
        const timer = setTimeout(() => {
          setShowHints(false);
          localStorage.setItem(VIEWER_HINT_SHOWN_KEY, 'true');
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, godotReady]);

  // Send message to Godot via postMessage
  const sendToGodot = useCallback((message: object) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, []);

  // Send texture to Godot from canvas
  const sendTextureToGodot = useCallback(() => {
    if (!stageRef.current || !godotReady) return;

    try {
      const stage = stageRef.current;

      // Export at exactly 1024x1024 pixels
      const dataUrl = stage.toDataURL({
        pixelRatio: 1,
        width: 1024,
        height: 1024,
        mimeType: 'image/png',
      });

      sendToGodot({
        type: 'set_texture',
        texture: dataUrl,
      });
    } catch (err) {
      console.error('Failed to send texture to Godot:', err);
    }
  }, [stageRef, godotReady, sendToGodot]);

  // Listen for messages from Godot iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object' || !data.type) return;

      switch (data.type) {
        case 'godot_ready':
          if (godotReadyRef.current) return;
          godotReadyRef.current = true;

          setLoadingProgress(100);
          setLoadingStage('ready');

          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ type: 'force_resize' }, '*');
            setTimeout(() => {
              iframeRef.current?.contentWindow?.postMessage({ type: 'force_resize' }, '*');
            }, 100);
          }

          setTimeout(() => {
            setGodotReady(true);
            setLoading(false);
          }, 200);
          break;

        case 'godot_progress':
          if (data.progress !== undefined && !godotReadyRef.current) {
            receivedRealProgressRef.current = true;
            const mappedProgress = 10 + Math.round(data.progress * 85);
            setLoadingProgress(mappedProgress);
            if (data.progress >= 0.9) {
              setLoadingStage('initializing');
            }
          }
          break;

        case 'car_loaded':
          setCarLoaded(true);
          setTimeout(() => {
            sendTextureToGodot();
            sendToGodot({ type: 'set_plate_region', region: plateRegionRef.current });
            sendToGodot({ type: 'set_camera_auto_rotate', enabled: autoRotateRef.current });
          }, 200);
          break;

        case 'godot_error':
          setError(data.message || 'Unknown Godot error');
          setLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sendTextureToGodot, sendToGodot]);

  // Trigger iframe resize
  const triggerIframeResize = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'force_resize' }, '*');
    }
  }, []);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIframeEverLoaded(true);
    setLoadingStage('loading');
    setLoadingProgress(10);
    receivedRealProgressRef.current = false;

    triggerIframeResize();
    setTimeout(triggerIframeResize, 100);
    setTimeout(triggerIframeResize, 300);
    setTimeout(triggerIframeResize, 600);
    setTimeout(triggerIframeResize, 1000);

    let progress = 10;
    const interval = setInterval(() => {
      if (godotReadyRef.current || receivedRealProgressRef.current) {
        clearInterval(interval);
        return;
      }
      const remaining = 90 - progress;
      const increment = Math.max(0.5, remaining * 0.08);
      progress = Math.min(90, progress + increment);

      if (progress >= 89.5) {
        clearInterval(interval);
        setLoadingProgress(90);
        setLoadingStage('initializing');
      } else {
        setLoadingProgress(Math.round(progress));
        if (progress > 50) {
          setLoadingStage('initializing');
        }
      }
    }, 150);

    return () => clearInterval(interval);
  }, [triggerIframeResize]);

  // Track previous signature to detect changes
  const prevSignatureRef = useRef<string | null>(null);

  // Auto-sync texture when canvas changes
  useEffect(() => {
    if (!godotReady) return;

    if (prevSignatureRef.current !== debouncedSignature) {
      prevSignatureRef.current = debouncedSignature;
      setTimeout(() => {
        sendTextureToGodot();
      }, 50);
    }
  }, [debouncedSignature, godotReady, sendTextureToGodot]);

  // Send model change to Godot
  useEffect(() => {
    if (!godotReady) return;

    const needsLoad = lastLoadedModelRef.current !== currentModel.id;
    if (!needsLoad) return;

    lastLoadedModelRef.current = currentModel.id;
    setCarLoaded(false);

    sendToGodot({
      type: 'load_scene',
      modelId: currentModel.id,
    });
  }, [currentModel.id, godotReady, sendToGodot]);

  // When reopening, ensure model is loaded
  useEffect(() => {
    if (isOpen && godotReady && iframeEverLoaded) {
      if (lastLoadedModelRef.current !== currentModel.id) {
        lastLoadedModelRef.current = currentModel.id;
        setCarLoaded(false);
        sendToGodot({
          type: 'load_scene',
          modelId: currentModel.id,
        });
      } else {
        triggerIframeResize();
        setTimeout(triggerIframeResize, 100);
        setTimeout(() => {
          sendTextureToGodot();
        }, 150);
      }
    }
  }, [isOpen, godotReady, iframeEverLoaded, currentModel.id, triggerIframeResize, sendToGodot, sendTextureToGodot]);

  // Handle window resize
  useEffect(() => {
    if (!isOpen || !iframeEverLoaded) return;

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        triggerIframeResize();
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [isOpen, iframeEverLoaded, triggerIframeResize]);

  // Camera controls
  const handleCameraPreset = (preset: string) => {
    setActivePreset(preset);
    sendToGodot({ type: 'set_camera_preset', preset });
    if (autoRotate) {
      setAutoRotate(false);
      autoRotateRef.current = false;
      sendToGodot({ type: 'set_camera_auto_rotate', enabled: false });
    }
    setTimeout(() => setActivePreset(null), 500);
  };

  const handleAutoRotate = (enabled: boolean) => {
    setAutoRotate(enabled);
    autoRotateRef.current = enabled;
    sendToGodot({ type: 'set_camera_auto_rotate', enabled });
  };

  const handlePlateRegionChange = useCallback(
    (region: 'us' | 'eu') => {
      setPlateRegion(region);
      plateRegionRef.current = region;
      sendToGodot({ type: 'set_plate_region', region });
    },
    [sendToGodot]
  );

  const handleZoom = useCallback(
    (delta: number) => {
      sendToGodot({ type: 'adjust_camera_zoom', delta });
    },
    [sendToGodot]
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          handleAutoRotate(!autoRotate);
          break;
        case '1':
          handleCameraPreset('rear');
          break;
        case '2':
          handleCameraPreset('front');
          break;
        case '3':
          handleCameraPreset('left');
          break;
        case '?':
          setShowHints((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, autoRotate]);

  // Build iframe URL
  const iframeSrc = `/godot/index.html?pck=${encodeURIComponent(PCK_URL)}`;

  const showLoading = loading && !godotReady;
  const isInstantReopen = godotReady && iframeEverLoaded;

  // Ensure auto-rotate preference is applied when viewer opens
  useEffect(() => {
    if (!isOpen) return;
    if (!(godotReady || isInstantReopen)) return;
    sendToGodot({ type: 'set_camera_auto_rotate', enabled: autoRotateRef.current });
  }, [isOpen, godotReady, isInstantReopen, sendToGodot]);

  const viewerReady = godotReady || isInstantReopen;

  return (
    <>
      <div
        className={`fixed inset-0 z-[200] ${isOpen ? '' : 'pointer-events-none opacity-0 invisible'}`}
        style={{
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'opacity 0.2s ease-out',
          background: '#0a0a0b',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f10] via-[#0a0a0b] to-[#050506]" />

        <div className="relative w-full h-full flex flex-col">
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 pointer-events-auto">
            <img src={logo} alt="Tesla Wrap Studio" className="h-6 sm:h-8 w-auto drop-shadow" />

            <div className="flex items-center gap-2">
              {viewerReady && !showLoading && (
                <button
                  onClick={() => setShowHints(!showHints)}
                  className={`p-2 rounded-full transition-all shadow-lg ${
                    showHints
                      ? 'bg-black/60 text-white'
                      : 'bg-black/40 text-white/80 hover:bg-black/60 hover:text-white'
                  } backdrop-blur-xl border border-white/20`}
                  title="Toggle controls help (?)"
                >
                  <span className="text-xs font-bold w-4 h-4 flex items-center justify-center">?</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-all backdrop-blur-xl border border-white/20 shadow-lg"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Viewport */}
          <div className="flex-1 relative">
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              className="absolute inset-0 w-full h-full border-0"
              title="Godot 3D Viewer"
              allow="autoplay; fullscreen"
              onLoad={handleIframeLoad}
            />

            {/* Loading overlay */}
            {showLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0b] z-10">
                <div className="relative mb-8">
                  <div className="w-32 h-32 relative">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(from 0deg, transparent, rgba(232, 33, 39, 0.4), transparent)`,
                        animation: 'spin 2s linear infinite',
                      }}
                    />
                    <div className="absolute inset-2 rounded-full bg-[#0a0a0b] flex items-center justify-center">
                      <Car className="w-12 h-12 text-white/20" />
                    </div>
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                      <circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke="url(#loadingGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${loadingProgress * 2.89} 289`}
                        style={{ transition: 'stroke-dasharray 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      />
                      <defs>
                        <linearGradient id="loadingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#e82127" />
                          <stop offset="100%" stopColor="#ff6b6b" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-white/90 text-lg font-medium tracking-wide">{loadingProgress}%</p>
                  <p className="text-white/40 text-sm mt-1">
                    {loadingStage === 'loading' && 'Loading 3D engine...'}
                    {loadingStage === 'initializing' && 'Preparing your vehicle...'}
                    {loadingStage === 'ready' && 'Ready!'}
                  </p>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0b] z-10">
                <div className="text-center max-w-md px-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                    <X className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="text-red-400 text-lg font-medium">{error}</p>
                  <p className="text-white/40 text-sm mt-2">Please try again later</p>
                  <button
                    onClick={onClose}
                    className="mt-6 px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-full transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Controls hint overlay */}
            {showHints && !showLoading && !error && viewerReady && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center animate-in fade-in duration-200">
                <div className="bg-[#1a1a1c]/90 backdrop-blur-xl rounded-2xl p-8 border border-white/10 max-w-md mx-4 shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tesla-red to-red-700 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">3D Controls</h3>
                      <p className="text-white/50 text-xs">Interact with your design</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                          <Move className="w-5 h-5 text-white/60" />
                        </div>
                        <div>
                          <p className="text-white/90 text-sm font-medium">Drag to rotate</p>
                          <p className="text-white/40 text-xs">Click and drag to orbit around</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                          <ZoomIn className="w-5 h-5 text-white/60" />
                        </div>
                        <div>
                          <p className="text-white/90 text-sm font-medium">Scroll to zoom</p>
                          <p className="text-white/40 text-xs">Mouse wheel or pinch gesture</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Keyboard shortcuts</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <kbd className="px-2 py-1 bg-white/10 rounded text-white/70 font-mono">Space</kbd>
                          <span className="text-white/50">Toggle rotation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <kbd className="px-2 py-1 bg-white/10 rounded text-white/70 font-mono">1-3</kbd>
                          <span className="text-white/50">Camera presets</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowHints(false);
                      localStorage.setItem(VIEWER_HINT_SHOWN_KEY, 'true');
                    }}
                    className="w-full mt-6 py-2.5 bg-tesla-red hover:bg-red-700 text-white rounded-xl font-medium transition-all"
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom floating toolbar */}
          {viewerReady && !showLoading && !error && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
              <div className="flex items-center gap-1 bg-[#1a1a1c]/90 backdrop-blur-xl rounded-2xl p-1.5 border border-white/10 shadow-2xl">
                {/* Camera preset buttons */}
                <div className="flex items-center gap-0.5 px-1">
                  <button
                    onClick={() => handleCameraPreset('rear')}
                    className={`px-3 py-2 text-xs font-medium rounded-xl transition-all ${
                      activePreset === 'rear'
                        ? 'bg-tesla-red text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    title="Front view (1)"
                  >
                    Front
                  </button>
                  <button
                    onClick={() => handleCameraPreset('front')}
                    className={`px-3 py-2 text-xs font-medium rounded-xl transition-all ${
                      activePreset === 'front'
                        ? 'bg-tesla-red text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    title="Rear view (2)"
                  >
                    Rear
                  </button>
                  <button
                    onClick={() => handleCameraPreset('left')}
                    className={`px-3 py-2 text-xs font-medium rounded-xl transition-all ${
                      activePreset === 'left'
                        ? 'bg-tesla-red text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    title="Side view (3)"
                  >
                    Side
                  </button>
                </div>

                <div className="w-px h-6 bg-white/10" />

                {/* Auto-rotate toggle */}
                <button
                  onClick={() => handleAutoRotate(!autoRotate)}
                  className={`p-2.5 rounded-xl transition-all ${
                    autoRotate ? 'bg-tesla-red text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title={autoRotate ? 'Stop rotation (Space)' : 'Start rotation (Space)'}
                >
                  {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <div className="w-px h-6 bg-white/10" />

                {/* Zoom controls */}
                <div className="flex items-center gap-0.5 px-1">
                  <button
                    onClick={() => handleZoom(0.5)}
                    className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleZoom(-0.5)}
                    className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-px h-6 bg-white/10" />

                {/* Plate region toggle */}
                <div className="flex items-center gap-1 px-1">
                  <span className="text-[10px] text-white/40 mr-0.5">Plate</span>
                  <button
                    onClick={() => handlePlateRegionChange('us')}
                    className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      plateRegion === 'us'
                        ? 'bg-white/15 text-white'
                        : 'text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                    title="US License Plate"
                  >
                    🇺🇸
                  </button>
                  <button
                    onClick={() => handlePlateRegionChange('eu')}
                    className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      plateRegion === 'eu'
                        ? 'bg-white/15 text-white'
                        : 'text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                    title="EU License Plate"
                  >
                    🇪🇺
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};
