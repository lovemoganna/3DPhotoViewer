export interface ViewerSettings {
  drawFillShapes: boolean;
  drawStrokes: boolean;
  fillShapesWireframe: boolean;
  strokesWireframe: boolean;
  strokeColor: string;
  backgroundColor: string;
  flipX: boolean;
  flipY: boolean;
  flipZ: boolean;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  // 3D Frame & Gallery Enhancements
  enable3DFrame: boolean;
  frameDepth: number;
  frameColor: string;
  ambientIntensity: number;
  roughness: number;
}

export enum FileType {
  SVG = 'SVG',
  IMAGE = 'IMAGE', // JPG, PNG, GIF, etc.
  UNKNOWN = 'UNKNOWN'
}

export interface GalleryItem {
  id: string;
  title: string;
  url: string;
  category?: string;
  description?: string;
}

export interface UploadedFile {
  url: string;
  name: string;
  type: FileType;
  description?: string;
}