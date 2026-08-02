import { ViewerSettings, GalleryItem } from './types';
import { loadGalleriesAuto, GalleryCategory } from './galleryLoader';

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
  enable3DFrame: true,
  frameDepth: 8,
  frameColor: '#1e293b',
  ambientIntensity: 0.7,
  roughness: 0.3,
};

// Dynamically auto-scanned categories & items from Data/Img/*
const { categories: AUTO_CATEGORIES, allItems: AUTO_ALL_ITEMS } = loadGalleriesAuto();

export const GALLERY_CATEGORIES: GalleryCategory[] = AUTO_CATEGORIES;
export const ALL_GALLERY_ITEMS: GalleryItem[] = AUTO_ALL_ITEMS;
export const MYTHOLOGY_GALLERY: GalleryItem[] = AUTO_CATEGORIES[0]?.items || [];

export const ACCEPTED_IMAGE_TYPES = {
  'image/svg+xml': ['.svg'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};