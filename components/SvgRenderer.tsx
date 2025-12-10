import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SVGLoader, SVGResult } from 'three/examples/jsm/loaders/SVGLoader';
import { useLoader } from '@react-three/fiber';
import { ViewerSettings } from '../types';

interface SvgRendererProps {
  url: string;
  settings: ViewerSettings;
}

export const SvgRenderer: React.FC<SvgRendererProps> = ({ url, settings }) => {
  // Use useLoader to load and cache the SVG. 
  // It handles suspense automatically.
  const svgData = useLoader(SVGLoader, url) as SVGResult;

  const { paths } = svgData;

  const { flipX, flipY, flipZ, rotationX, rotationY, rotationZ } = settings;

  const transformScale = useMemo<[number, number, number]>(() => {
    return [
      flipX ? -1 : 1,
      flipY ? -1 : 1,
      flipZ ? -1 : 1
    ];
  }, [flipX, flipY, flipZ]);

  const rotation = useMemo<[number, number, number]>(() => {
    return [
        THREE.MathUtils.degToRad(rotationX),
        THREE.MathUtils.degToRad(rotationY),
        THREE.MathUtils.degToRad(rotationZ)
    ];
  }, [rotationX, rotationY, rotationZ]);

  // Center logic matching the original code (roughly)
  // Original: scale 0.25, position x -70, y 70, scale y -1
  // We wrap the centered group in a transform group to handle user flipping around the center.
  
  const svgGroup = useMemo(() => {
    return (
      <group scale={transformScale} rotation={rotation}>
        <group scale={[0.25, -0.25, 0.25]} position={[-70, 70, 0]}>
          {paths.map((path, i) => (
            <SvgPath key={i} path={path} settings={settings} index={i} />
          ))}
        </group>
      </group>
    );
  }, [paths, settings, transformScale, rotation]);

  return svgGroup;
};

// Helper component for individual paths
const SvgPath: React.FC<{ path: THREE.ShapePath; settings: ViewerSettings; index: number }> = ({ path, settings, index }) => {
  const { drawFillShapes, drawStrokes, fillShapesWireframe, strokesWireframe } = settings;
  const fillColor = path.userData?.style?.fill;
  const strokeColor = path.userData?.style?.stroke;
  const fillOpacity = path.userData?.style?.fillOpacity ?? 1;
  const strokeOpacity = path.userData?.style?.strokeOpacity ?? 1;

  // Process Shapes (Fill)
  const shapes = useMemo(() => {
    if (!drawFillShapes || fillColor === undefined || fillColor === 'none') return [];
    
    // SVGLoader.createShapes returns Shape[]
    return SVGLoader.createShapes(path);
  }, [path, drawFillShapes, fillColor]);

  // Process Strokes (Lines)
  const strokeGeometries = useMemo(() => {
    if (!drawStrokes || strokeColor === undefined || strokeColor === 'none') return [];

    const geometries: THREE.BufferGeometry[] = [];
    
    for (const subPath of path.subPaths) {
      // @ts-ignore - Three types definition mismatch sometimes for style prop
      const geometry = SVGLoader.pointsToStroke(subPath.getPoints(), path.userData.style);
      if (geometry) {
        geometries.push(geometry);
      }
    }
    return geometries;
  }, [path, drawStrokes, strokeColor]);

  return (
    <group>
      {/* Render Filled Shapes */}
      {shapes.map((shape, j) => (
        <mesh key={`fill-${j}`} renderOrder={index}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial
            color={fillColor}
            opacity={fillOpacity}
            transparent={true}
            side={THREE.DoubleSide}
            depthWrite={false}
            wireframe={fillShapesWireframe}
          />
        </mesh>
      ))}

      {/* Render Strokes */}
      {strokeGeometries.map((geometry, k) => (
        <mesh key={`stroke-${k}`} geometry={geometry} renderOrder={index + 1000 /* Ensure strokes are on top */}>
          <meshBasicMaterial
            color={strokeColor}
            opacity={strokeOpacity}
            transparent={true}
            side={THREE.DoubleSide}
            depthWrite={false}
            wireframe={strokesWireframe}
          />
        </mesh>
      ))}
    </group>
  );
};