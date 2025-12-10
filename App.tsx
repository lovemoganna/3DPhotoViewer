
import React, { useState, Suspense, useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useProgress, GizmoHelper, GizmoViewcube, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { UploadedFile, FileType, ViewerSettings } from './types';
import { DEFAULT_SETTINGS, ACCEPTED_IMAGE_TYPES } from './constants';
import { SvgRenderer } from './components/SvgRenderer';
import { ImageRenderer } from './components/ImageRenderer';
import { ControlPanel } from './components/ControlPanel';
import { Button } from './components/Button';
import { AnnotationEditor } from './components/AnnotationEditor';

// --- Icons ---
const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
  </svg>
);
const RotateIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
);
const PanIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
);
const HomeIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
);
const ZoomInIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
);
const ZoomOutIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
);
const CameraIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

// --- Components ---

const LoadingOverlay = () => {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-white/60 backdrop-blur-sm transition-all duration-300">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="text-gray-600 font-medium text-sm tracking-wide">Loading Asset {Math.round(progress)}%</div>
      </div>
    </div>
  );
};

const DropOverlay = ({ isDragging }: { isDragging: boolean }) => {
    if (!isDragging) return null;
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-50/90 backdrop-blur-sm border-8 border-blue-400 border-dashed m-4 rounded-3xl pointer-events-none animate-pulse">
            <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UploadIcon />
                </div>
                <h2 className="text-3xl font-bold text-blue-800">Drop to Upload</h2>
            </div>
        </div>
    );
}

export default function App() {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [settings, setSettings] = useState<ViewerSettings>(DEFAULT_SETTINGS);
  const [controlMode, setControlMode] = useState<'rotate' | 'pan'>('pan');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Annotation State
  const [annotationImage, setAnnotationImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const orbitControlsRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;
    const url = URL.createObjectURL(uploadedFile);
    let type = FileType.UNKNOWN;
    if (uploadedFile.type.includes('svg')) type = FileType.SVG;
    else if (uploadedFile.type.includes('image')) type = FileType.IMAGE;

    setFile({ url, name: uploadedFile.name, type });
    setIsPanelOpen(true); // Auto open panel on new file
  };

  const handleClear = () => {
    if (file) URL.revokeObjectURL(file.url);
    setFile(null);
    setIsPanelOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
       const dummyEvent = { target: { files: [droppedFile] } } as unknown as React.ChangeEvent<HTMLInputElement>;
       // @ts-ignore
       handleFileUpload(dummyEvent);
    }
  };

  const handleResetCamera = useCallback(() => {
      if (orbitControlsRef.current) {
          orbitControlsRef.current.reset();
      }
  }, []);

  const handleZoomIn = useCallback(() => {
    if (orbitControlsRef.current) {
        orbitControlsRef.current.dollyIn(1.1);
        orbitControlsRef.current.update();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (orbitControlsRef.current) {
        orbitControlsRef.current.dollyOut(1.1);
        orbitControlsRef.current.update();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!file || annotationImage) return; // Disable shortcuts when annotating
        // Ignore if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                setControlMode(prev => prev === 'pan' ? 'rotate' : 'pan');
                break;
            case 'KeyR':
                handleResetCamera();
                break;
            case 'Equal': // + key
            case 'NumpadAdd':
                handleZoomIn();
                break;
            case 'Minus': // - key
            case 'NumpadSubtract':
                handleZoomOut();
                break;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, handleResetCamera, handleZoomIn, handleZoomOut, annotationImage]);

  const handleSnapshot = () => {
      // Find the canvas element
      const canvas = canvasContainerRef.current?.querySelector('canvas');
      if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          setAnnotationImage(dataUrl);
      }
  };

  return (
    <div 
        className="w-full h-full relative overflow-hidden select-none"
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept={Object.keys(ACCEPTED_IMAGE_TYPES).join(',')} className="hidden" />

      {/* --- Top Navigation Bar --- */}
      <div className="absolute top-0 left-0 w-full p-4 z-10 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
             <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-white/60 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                <h1 className="text-lg font-bold text-gray-800 tracking-tight">
                    View<span className="text-blue-600">3D</span>
                </h1>
            </div>

            {file && !annotationImage && (
                 <div className="bg-white/80 backdrop-blur-md px-1 py-1 rounded-2xl shadow-sm border border-white/60 flex gap-1">
                    <Button variant="secondary" className="!py-1.5 !px-3 !text-xs !rounded-xl" onClick={() => fileInputRef.current?.click()}>
                        Replace
                    </Button>
                    <Button variant="danger" className="!py-1.5 !px-3 !text-xs !rounded-xl" onClick={handleClear}>
                        Clear
                    </Button>
                 </div>
            )}
        </div>

        {file && !annotationImage && (
             <div className="pointer-events-auto">
                <button 
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    className="bg-white hover:bg-gray-50 text-gray-700 p-3 rounded-full shadow-lg border border-gray-100 transition-transform active:scale-95 group"
                >
                    <SettingsIcon />
                </button>
             </div>
        )}
      </div>

      {/* --- Main Content --- */}
      <DropOverlay isDragging={isDragging} />
      
      {annotationImage ? (
          <AnnotationEditor 
            imageSrc={annotationImage} 
            onClose={() => setAnnotationImage(null)} 
          />
      ) : (
          file ? (
            <>
            <ControlPanel 
                settings={settings} 
                onSettingsChange={setSettings} 
                fileType={file.type}
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
            />
            
            <LoadingOverlay />

            <div ref={canvasContainerRef} className="w-full h-full">
                <Canvas 
                    camera={{ position: [0, 0, 200], fov: 45 }}
                    className="w-full h-full"
                    shadows
                    // Important for snapshotting
                    gl={{ preserveDrawingBuffer: true }}
                    style={{ background: settings.backgroundColor }}
                >
                    <Suspense fallback={null}>
                    <Environment preset="city" />
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[10, 10, 10]} intensity={1} castShadow shadow-mapSize={1024} />
                    
                    <group position={[0, -10, 0]}>
                        <ContentWrapper file={file} settings={settings} />
                        <ContactShadows position={[0, -0.1, 0]} opacity={0.4} scale={200} blur={2.5} far={4} color="#000000" />
                    </group>

                    <OrbitControls 
                        ref={orbitControlsRef}
                        makeDefault 
                        enableDamping={true}
                        dampingFactor={0.05}
                        screenSpacePanning={true}
                        mouseButtons={{
                        LEFT: controlMode === 'rotate' ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
                        MIDDLE: THREE.MOUSE.DOLLY,
                        RIGHT: controlMode === 'rotate' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE
                        }}
                        touches={{
                            ONE: controlMode === 'rotate' ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN,
                            TWO: THREE.TOUCH.DOLLY_ROTATE
                        }}
                    />

                    <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                        <GizmoViewcube 
                            color="gray"
                            strokeColor="white"
                            textColor="black"
                            hoverColor="#3b82f6"
                        />
                    </GizmoHelper>

                    </Suspense>
                </Canvas>
            </div>

            {/* --- Bottom Controls --- */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 w-full px-4 pointer-events-none">
                
                {/* Mode Switcher */}
                <div className="pointer-events-auto flex items-center bg-white/80 backdrop-blur-xl rounded-full shadow-xl border border-white/50 p-1.5 gap-1">
                    <button
                        onClick={() => setControlMode('pan')}
                        title="Pan Tool (Space)"
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                            controlMode === 'pan' 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                    >
                        <PanIcon /> <span>Pan</span>
                    </button>
                    <button
                        onClick={() => setControlMode('rotate')}
                        title="Rotate Tool (Space)"
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                            controlMode === 'rotate' 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                    >
                        <RotateIcon /> <span>Rotate</span>
                    </button>
                    
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    
                    <button 
                        onClick={handleZoomIn}
                        className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-full transition-colors"
                        title="Zoom In (+)"
                    >
                        <ZoomInIcon />
                    </button>
                    <button 
                        onClick={handleZoomOut}
                        className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-full transition-colors"
                        title="Zoom Out (-)"
                    >
                        <ZoomOutIcon />
                    </button>
                    <button 
                        onClick={handleResetCamera}
                        className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-full transition-colors"
                        title="Reset View (R)"
                    >
                        <HomeIcon />
                    </button>

                    <div className="w-px h-6 bg-gray-300 mx-1"></div>

                    <button 
                        onClick={handleSnapshot}
                        className="flex items-center gap-2 px-3 py-2 text-purple-600 bg-purple-50 hover:bg-purple-100 hover:text-purple-700 rounded-full transition-colors font-bold text-sm"
                        title="Snapshot & Annotate"
                    >
                        <CameraIcon /> Annotate
                    </button>
                </div>
                
                <p className="text-[10px] text-gray-400 font-medium bg-white/50 backdrop-blur px-3 py-1 rounded-full shadow-sm">
                    Left Click: {controlMode === 'rotate' ? 'Rotate' : 'Pan'} • Space: Switch Mode • R: Reset
                </p>
            </div>
            </>
        ) : (
            <EmptyState onUpload={() => fileInputRef.current?.click()} />
        )
      )}
    </div>
  );
}

// Render content based on type
const ContentWrapper: React.FC<{ file: UploadedFile, settings: ViewerSettings }> = ({ file, settings }) => {
    if (file.type === FileType.SVG) {
        return <SvgRenderer url={file.url} settings={settings} />;
    }
    if (file.type === FileType.IMAGE) {
        return <ImageRenderer url={file.url} settings={settings} />;
    }
    return null;
};

// Nice empty state
const EmptyState: React.FC<{ onUpload: () => void }> = ({ onUpload }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full">
            <div 
                onClick={onUpload}
                className="group relative flex flex-col items-center p-12 bg-white/40 backdrop-blur-md rounded-3xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-white/60 transition-all cursor-pointer shadow-xl max-w-lg w-full mx-6"
            >
                <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 group-hover:scale-110 group-hover:text-blue-600 text-gray-400 transition-all duration-300">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <h2 className="text-2xl font-black text-gray-700 mb-2 group-hover:text-blue-700 transition-colors">Upload 2D Asset</h2>
                <p className="text-gray-500 text-center mb-6 max-w-xs">
                    Support for <span className="font-mono text-gray-700 bg-gray-100 px-1 rounded">.SVG</span> extrusion and <span className="font-mono text-gray-700 bg-gray-100 px-1 rounded">.PNG/.JPG</span> projection.
                </p>
                <Button variant="primary" className="!rounded-full !px-8 shadow-blue-200">
                    Select File
                </Button>
            </div>
        </div>
    )
}
