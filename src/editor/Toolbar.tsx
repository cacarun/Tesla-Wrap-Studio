import { useRef } from 'react';
import { useEditorStore } from './state/useEditorStore';
import logo from '../assets/logo.png';
import { exportPng } from '../utils/exportPng';
import { carModels } from '../data/carModels';
import type { Stage as StageType } from 'konva/lib/Stage';

interface ToolbarProps {
  stageRef: React.RefObject<StageType | null>;
  onOpen3DPreview: () => void;
}

export const Toolbar = ({ stageRef, onOpen3DPreview }: ToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    undo,
    redo,
    history,
    historyIndex,
    currentModelId,
    addLayer,
  } = useEditorStore();

  const currentModel = carModels.find((m) => m.id === currentModelId) || carModels[0];
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleExport = () => {
    if (stageRef.current) {
      exportPng(stageRef.current, currentModel.exportFileName);
    }
  };

  const handleOpenProject = () => {
    fileInputRef.current?.click();
  };

  const handleSaveProject = () => {
    // TODO: Implement project save flow (state export)
    alert('Project save is coming soon.');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const src = event.target?.result as string;
      
      // Create an image element to get dimensions
      const img = new Image();
      img.onload = () => {
        // Add as a new image layer
        addLayer({
          type: 'image',
          name: file.name,
          src,
          image: img,
          visible: true,
          locked: false,
          opacity: 1,
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="panel border-b-0 rounded-xl p-3 flex items-center gap-3 flex-wrap shadow-lg">
      {/* Logo */}
      <div className="flex items-center gap-3 border-r border-tesla-dark/50 pr-3">
        <img
          src={logo}
          alt="Tesla Wrap Studio"
          className="h-8 w-auto drop-shadow"
        />
      </div>

      {/* File Operations */}
      <div className="flex items-center gap-1 border-r border-tesla-dark/50 pr-3">
        <button
          onClick={() => alert('New project coming soon.')}
          className="px-3 py-1.5 text-xs font-medium text-tesla-light bg-tesla-black/70 rounded hover:bg-tesla-black transition-colors"
          title="New Project"
        >
          New
        </button>
        <button
          onClick={handleOpenProject}
          className="px-3 py-1.5 text-xs font-medium text-tesla-light bg-tesla-black/70 rounded hover:bg-tesla-black transition-colors"
          title="Open Project"
        >
          Open
        </button>
        <button
          onClick={handleSaveProject}
          className="px-3 py-1.5 text-xs font-medium text-tesla-light bg-tesla-black/70 rounded hover:bg-tesla-black transition-colors"
          title="Save Project"
        >
          Save
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1.5 border-r border-tesla-dark/50 pr-3">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Y)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      {/* Current Model Info */}
      <div className="flex items-center gap-2 text-sm text-tesla-gray">
        <span className="text-tesla-light font-medium">{currentModel.name}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onOpen3DPreview}
          disabled
          className="btn-secondary flex items-center gap-2 opacity-50 cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span>3D Preview – Coming Soon</span>
        </button>
        <button
          onClick={handleExport}
          className="btn-primary flex items-center gap-2"
          title="Export PNG"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export PNG</span>
        </button>
      </div>
    </div>
  );
};
