import { ViewerSettings } from './types';

export const DEFAULT_SETTINGS: ViewerSettings = {
  drawFillShapes: true,
  drawStrokes: true,
  fillShapesWireframe: false,
  strokesWireframe: false,
  strokeColor: '#000000',
  backgroundColor: 'transparent', // Changed to transparent for gradient background
  flipX: false,
  flipY: false,
  flipZ: false,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
};

export const ACCEPTED_IMAGE_TYPES = {
  'image/svg+xml': ['.svg'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};