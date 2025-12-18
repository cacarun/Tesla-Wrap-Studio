import { useRef, useState } from 'react';
import { useEditorStore } from './state/useEditorStore';
import logo from '../assets/logo.png';
import { exportPng } from '../utils/exportPng';
import { carModels } from '../data/carModels';
import { saveProjectToFile, loadProjectFromFile, getProjectFileAccept } from '../utils/projectFile';
import { NewProjectDialog } from './components/NewProjectDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import type { Stage as StageType } from 'konva/lib/Stage';

interface ToolbarProps {
  stageRef: React.RefObject<StageType | null>;
  onOpen3DPreview: () => void;
}

export const Toolbar = ({ stageRef, onOpen3DPreview }: ToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'new' | 'open' | null>(null);
  
  const {
    undo,
    redo,
    history,
    historyIndex,
    currentModelId,
    addLayer,
    isDirty,
    projectName,
    getSerializedState,
    loadProject,
    markAsSaved,
  } = useEditorStore();

  const currentModel = carModels.find((m) => m.id === currentModelId) || carModels[0];
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleExport = () => {
    if (stageRef.current) {
      exportPng(stageRef.current, currentModel.exportFileName);
    }
  };

  // Handle New Project button
  const handleNewProject = () => {
    if (isDirty) {
      setPendingAction('new');
      setIsConfirmDialogOpen(true);
    } else {
      setIsNewProjectDialogOpen(true);
    }
  };

  // Handle Open Project button
  const handleOpenProject = () => {
    if (isDirty) {
      setPendingAction('open');
      setIsConfirmDialogOpen(true);
    } else {
      projectFileInputRef.current?.click();
    }
  };

  // Handle Save Project
  const handleSaveProject = async () => {
    try {
      const projectData = getSerializedState();
      await saveProjectToFile(projectData);
      markAsSaved();
    } catch (error: any) {
      console.error('Failed to save project:', error);
      alert('Failed to save project. Please try again.');
    }
  };

  // Handle confirmation dialog actions
  const handleConfirmDiscard = () => {
    setIsConfirmDialogOpen(false);
    if (pendingAction === 'new') {
      setIsNewProjectDialogOpen(true);
    } else if (pendingAction === 'open') {
      projectFileInputRef.current?.click();
    }
    setPendingAction(null);
  };

  const handleCancelDiscard = () => {
    setIsConfirmDialogOpen(false);
    setPendingAction(null);
  };

  // Handle project file selection
  const handleProjectFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const project = await loadProjectFromFile(file);
      await loadProject(project);
    } catch (error: any) {
      alert(error.message || 'Failed to load project file.');
    }

    // Reset input
    e.target.value = '';
  };

  // Handle image file selection (for adding image layers)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    <>
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
            onClick={handleNewProject}
            className="px-3 py-1.5 text-xs font-medium text-tesla-light bg-tesla-black/70 rounded hover:bg-tesla-black transition-colors"
            title="New Project"
          >
            New
          </button>
          <button
            onClick={handleOpenProject}
            className="px-3 py-1.5 text-xs font-medium text-tesla-light bg-tesla-black/70 rounded hover:bg-tesla-black transition-colors"
            title="Open Project (.twrap)"
          >
            Open
          </button>
          <button
            onClick={handleSaveProject}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              isDirty 
                ? 'text-white bg-tesla-red hover:bg-tesla-red/80' 
                : 'text-tesla-light bg-tesla-black/70 hover:bg-tesla-black'
            }`}
            title="Save Project"
          >
            Save{isDirty ? '*' : ''}
          </button>
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            className="hidden"
          />
          <input
            ref={projectFileInputRef}
            type="file"
            accept={getProjectFileAccept()}
            onChange={handleProjectFileChange}
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

        {/* Project Info */}
        <div className="flex items-center gap-2 text-sm text-tesla-gray">
          <span className="text-tesla-light font-medium truncate max-w-[150px]" title={projectName}>
            {projectName}
          </span>
          <span className="text-tesla-dark">•</span>
          <span className="text-tesla-gray">{currentModel.name}</span>
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

      {/* New Project Dialog */}
      <NewProjectDialog 
        isOpen={isNewProjectDialogOpen} 
        onClose={() => setIsNewProjectDialogOpen(false)} 
      />

      {/* Unsaved Changes Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title="Unsaved Changes"
        message="You have unsaved changes. Do you want to discard them and continue?"
        confirmText="Discard Changes"
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />
    </>
  );
};
