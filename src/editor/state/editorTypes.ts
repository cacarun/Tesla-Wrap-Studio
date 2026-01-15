// Simplified types for Tesla Wrap Studio

export interface TextureLayer {
  id: string;
  name: string;
  src: string;
  image?: HTMLImageElement;
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

export interface EditorState {
  // Model and template
  currentModelId: string;
  baseColor: string;
  templateDimensions: { width: number; height: number } | null;
  templateImage: HTMLImageElement | null;
  
  // AI generated texture layer (single layer)
  textureLayer: TextureLayer | null;
}
