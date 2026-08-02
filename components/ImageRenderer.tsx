import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { ViewerSettings } from '../types';

interface ImageRendererProps {
  url: string;
  settings?: ViewerSettings;
}

export const ImageRenderer: React.FC<ImageRendererProps> = ({ url, settings }) => {
  const texture = useLoader(THREE.TextureLoader, url);

  // Configure texture color space and anisotropy for maximum visual sharpness
  useEffect(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
    }
  }, [texture]);

  const width = texture.image?.width || 100;
  const height = texture.image?.height || 100;
  
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

  const enable3DFrame = settings?.enable3DFrame ?? true;
  const frameDepth = settings?.frameDepth ?? 8;
  const frameColor = settings?.frameColor ?? '#1e293b';
  const roughness = settings?.roughness ?? 0.3;

  return (
    <group scale={flipScale} rotation={rotation}>
      {/* Front Art Canvas Mesh */}
      <mesh position={[0, 0, enable3DFrame ? frameDepth / 2 + 0.1 : 0.1]} castShadow receiveShadow>
        <planeGeometry args={[scaleFactor.x, scaleFactor.y]} />
        <meshStandardMaterial 
          map={texture} 
          side={THREE.FrontSide} 
          transparent={true} 
          roughness={roughness}
          metalness={0.05}
        />
      </mesh>

      {/* Back Mirror Translucent Canvas Mesh */}
      <mesh position={[0, 0, enable3DFrame ? -(frameDepth / 2 + 0.1) : -0.1]} castShadow receiveShadow>
        <planeGeometry args={[scaleFactor.x, scaleFactor.y]} />
        <meshStandardMaterial 
          map={texture} 
          side={THREE.BackSide} 
          transparent={true}
          opacity={0.45} 
          roughness={roughness}
          metalness={0.05}
        />
      </mesh>

      {/* 3D Extruded Frame Box */}
      {enable3DFrame && (
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[scaleFactor.x + 6, scaleFactor.y + 6, frameDepth]} />
          <meshStandardMaterial 
            color={frameColor} 
            roughness={0.4} 
            metalness={0.2} 
            transparent={true}
            opacity={0.85}
          />
        </mesh>
      )}
    </group>
  );
};