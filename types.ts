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
}

export enum FileType {
  SVG = 'SVG',
  IMAGE = 'IMAGE', // JPG, PNG, GIF, etc.
  UNKNOWN = 'UNKNOWN'
}

export interface UploadedFile {
  url: string;
  name: string;
  type: FileType;
}