import { create } from 'zustand';
import type { TextureLayer, EditorState } from './editorTypes';
import { defaultModel } from '../../data/carModels';

// Helper to load an image from a data URL
const loadImageFromSrc = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

interface EditorStore extends EditorState {
  // Actions
  setCurrentModelId: (modelId: string) => void;
  setBaseColor: (color: string) => void;
  setTemplateDimensions: (dimensions: { width: number; height: number }) => void;
  setTemplateImage: (image: HTMLImageElement | null) => void;
  
  // Texture layer actions
  setTextureLayer: (layer: TextureLayer | null) => void;
  addTextureFromSrc: (src: string, name?: string) => Promise<void>;
  clearTextureLayer: () => void;
  
  // Reset
  resetProject: () => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  currentModelId: defaultModel.id,
  baseColor: '#F5F5F0', // Tesla Pearl White Multi-Coat
  templateDimensions: null,
  templateImage: null,
  textureLayer: null,

  // Model and color actions
  setCurrentModelId: (modelId) => {
    set({ currentModelId: modelId, textureLayer: null });
  },

  setBaseColor: (color) => {
    set({ baseColor: color });
  },

  setTemplateDimensions: (dimensions) => {
    set({ templateDimensions: dimensions });
  },

  setTemplateImage: (image) => {
    set({ templateImage: image });
  },

  // Texture layer actions
  setTextureLayer: (layer) => {
    set({ textureLayer: layer });
  },

  addTextureFromSrc: async (src: string, name = 'AI Design') => {
    try {
      const img = await loadImageFromSrc(src);
      const layer: TextureLayer = {
        id: `texture-${Date.now()}`,
        name,
        src,
        image: img,
        visible: true,
        opacity: 1,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
      };
      set({ textureLayer: layer });
    } catch (error) {
      console.error('Failed to load texture:', error);
    }
  },

  clearTextureLayer: () => {
    set({ textureLayer: null });
  },

  // Reset project
  resetProject: () => {
    set({
      currentModelId: defaultModel.id,
      baseColor: '#F5F5F0',
      textureLayer: null,
    });
  },
}));
