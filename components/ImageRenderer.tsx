import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { ViewerSettings } from '../types';

interface ImageRendererProps {
  url: string;
  settings?: ViewerSettings;
}

// Updated props to include settings for Flip functionality
export const ImageRenderer: React.FC<ImageRendererProps> = ({ url, settings }) => {
  const texture = useLoader(THREE.TextureLoader, url);

  const { width, height } = texture.image;
  
  // Calculate aspect ratio to keep the image proportional
  const scaleFactor = useMemo(() => {
    const maxDim = 150;
    const aspect = width / height;
    
    if (width > height) {
      return { x: maxDim, y: maxDim / aspect };
    } else {
      return { x: maxDim * aspect, y: maxDim };
    }
  }, [width, height]);

  // Apply flip scaling based on settings
  const flipScale = useMemo<[number, number, number]>(() => {
    if (!settings) return [1, 1, 1];
    return [
      settings.flipX ? -1 : 1,
      settings.flipY ? -1 : 1,
      settings.flipZ ? -1 : 1
    ];
  }, [settings?.flipX, settings?.flipY, settings?.flipZ]);

  const rotation = useMemo<[number, number, number]>(() => {
    if (!settings) return [0, 0, 0];
    return [
        THREE.MathUtils.degToRad(settings.rotationX),
        THREE.MathUtils.degToRad(settings.rotationY),
        THREE.MathUtils.degToRad(settings.rotationZ)
    ];
  }, [settings?.rotationX, settings?.rotationY, settings?.rotationZ]);


  return (
    <mesh position={[0, 0, 0]} scale={flipScale} rotation={rotation}>
      <planeGeometry args={[scaleFactor.x, scaleFactor.y]} />
      <meshBasicMaterial 
        map={texture} 
        side={THREE.DoubleSide} 
        transparent={true} 
      />
    </mesh>
  );
};