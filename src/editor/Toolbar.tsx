import { useState } from 'react';
import type { Stage as StageType } from 'konva/lib/Stage';
import { useEditorStore } from './state/useEditorStore';
import { ModelSelector } from './components/ModelSelector';
import { DownloadDialog } from './components/DownloadDialog';
import { InfoDialog } from './components/InfoDialog';
import { exportPng } from '../utils/exportPng';
import { carModels } from '../data/carModels';
import logo from '../assets/logo.png';
import Tooltip from '@mui/material/Tooltip';

interface ToolbarProps {
  stageRef: React.RefObject<StageType | null>;
  onOpen3DPreview: () => void;
}

export const Toolbar = ({ stageRef, onOpen3DPreview }: ToolbarProps) => {
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  const { currentModelId } = useEditorStore();
  const currentModel = carModels.find((m) => m.id === currentModelId) || carModels[0];
  const isModelYLongRange = currentModelId === 'modely-l';

  // Generate export filename
  const getExportFilename = () => {
    return `tesla_wrap_${currentModel.id}.png`;
  };

  const handleExport = () => {
    setIsDownloadDialogOpen(true);
  };

  const handleConfirmDownload = () => {
    setIsDownloadDialogOpen(false);
    if (stageRef.current) {
      exportPng(stageRef.current, getExportFilename());
    }
  };

  const handleCancelDownload = () => {
    setIsDownloadDialogOpen(false);
  };

  return (
    <>
      <div className="panel border-b-0 rounded-xl p-2 sm:p-3 flex items-center gap-2 sm:gap-3 shadow-lg relative z-[100]">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 border-r border-tesla-dark/50 pr-2 sm:pr-3 flex-shrink-0">
          <img src={logo} alt="Tesla Wrap Studio" className="h-6 sm:h-8 w-auto drop-shadow" />
        </div>

        {/* Model and Color Selector */}
        <ModelSelector />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Info Button */}
          <Tooltip title="How to install wrap" placement="bottom" arrow>
            <button onClick={() => setIsInfoDialogOpen(true)} className="btn-icon">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </Tooltip>

          {/* 3D Preview Button */}
          <Tooltip
            title={isModelYLongRange ? '3D Preview not available for Model Y L' : '3D Preview'}
            placement="bottom"
            arrow
          >
            <span>
              <button
                onClick={onOpen3DPreview}
                disabled={isModelYLongRange}
                className={`btn-secondary flex items-center gap-1 sm:gap-2 px-2 sm:px-4 ${
                  isModelYLongRange ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <span className="hidden sm:inline">3D Preview</span>
              </button>
            </span>
          </Tooltip>

          {/* Export Button */}
          <Tooltip title="Export PNG" placement="bottom" arrow>
            <button onClick={handleExport} className="btn-primary flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span className="hidden sm:inline">Export PNG</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Download Confirmation Dialog */}
      <DownloadDialog isOpen={isDownloadDialogOpen} onConfirm={handleConfirmDownload} onCancel={handleCancelDownload} />

      {/* Info Dialog */}
      <InfoDialog isOpen={isInfoDialogOpen} onClose={() => setIsInfoDialogOpen(false)} />
    </>
  );
};
