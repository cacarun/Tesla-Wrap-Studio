import { useRef, useState } from 'react';
import type { Stage as StageType } from 'konva/lib/Stage';
import { EditorCanvas } from './EditorCanvas';
import { Toolbar } from './Toolbar';
import { AIPanel } from './components/AIPanel';
import { GodotViewer } from '../viewer/GodotViewer';

export const WrapDesignerPage = () => {
  const stageRef = useRef<StageType | null>(null);
  const [show3DPreview, setShow3DPreview] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [autoFit, setAutoFit] = useState(true);

  // Use auto-fit zoom when autoFit is true, otherwise use manual zoom
  const currentZoom = autoFit ? zoom : zoom;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-tesla-black via-[#3a3b3c] to-tesla-black overflow-hidden">
      {/* Top Toolbar */}
      <div className="p-1 relative z-[100]">
        <Toolbar stageRef={stageRef} onOpen3DPreview={() => setShow3DPreview(true)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden gap-1 p-1 relative z-0">
        {/* Left Panel - AI Generator */}
        <AIPanel />

        {/* Center - Canvas */}
        <div className="flex-1 overflow-hidden relative z-0">
          <EditorCanvas
            ref={stageRef}
            zoom={currentZoom}
            onZoomChange={setZoom}
            autoFit={autoFit}
            onAutoFitChange={setAutoFit}
          />
        </div>
      </div>

      {/* 3D Preview Modal */}
      <GodotViewer isOpen={show3DPreview} onClose={() => setShow3DPreview(false)} stageRef={stageRef} />
    </div>
  );
};
