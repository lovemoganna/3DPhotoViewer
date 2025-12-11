
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
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-white/60 backdrop-blur-md transition-all duration-500">
      <div className="flex flex-col items-center gap-4 bg-white/80 p-8 rounded-2xl shadow-xl border border-white/50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="text-gray-600 font-medium text-sm tracking-wide">Loading Asset {Math.round(progress)}%</div>
      </div>
    </div>
  );
};

const DropOverlay = ({ isDragging }: { isDragging: boolean }) => {
    if (!isDragging) return null;
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-50/90 backdrop-blur-md border-8 border-blue-400 border-dashed m-6 rounded-[2rem] pointer-events-none animate-in fade-in zoom-in duration-200">
            <div className="text-center">
                <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
                    <UploadIcon />
                </div>
                <h2 className="text-4xl font-bold text-blue-800 tracking-tight">Drop to Upload</h2>
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
        className="w-full h-full relative overflow-hidden select-none bg-gradient-to-br from-gray-50 to-gray-200"
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept={Object.keys(ACCEPTED_IMAGE_TYPES).join(',')} className="hidden" />

      {/* --- Top Navigation Bar --- */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-3">
             <div className="bg-white/90 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-lg border border-white/50 flex items-center gap-3 transition-transform hover:scale-[1.02]">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-blue-200 shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">
                        Universal<span className="text-blue-600">Viewer</span>
                    </h1>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">3D Asset Preview</span>
                </div>
            </div>

            {file && !annotationImage && (
                 <div className="bg-white/90 backdrop-blur-xl px-2 py-2 rounded-2xl shadow-lg border border-white/50 flex gap-2 w-fit animate-in slide-in-from-left-4 fade-in duration-300">
                    <Button variant="secondary" className="!py-1.5 !px-3 !text-xs !rounded-xl active:scale-95" onClick={() => fileInputRef.current?.click()}>
                        Replace
                    </Button>
                    <Button variant="danger" className="!py-1.5 !px-3 !text-xs !rounded-xl active:scale-95" onClick={handleClear}>
                        Clear
                    </Button>
                 </div>
            )}
        </div>

        {file && !annotationImage && (
             <div className="pointer-events-auto animate-in slide-in-from-right-4 fade-in duration-300">
                <button 
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    className="bg-white hover:bg-gray-50 text-gray-700 p-3.5 rounded-2xl shadow-xl border border-white/50 transition-all hover:scale-105 active:scale-95 group"
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
                            color="#f3f4f6"
                            strokeColor="#d1d5db"
                            textColor="#374151"
                            hoverColor="#3b82f6"
                            opacity={0.9}
                        />
                    </GizmoHelper>

                    </Suspense>
                </Canvas>
            </div>

            {/* --- Bottom Controls (Floating Island) --- */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 w-full px-4 pointer-events-none">
                
                {/* Mode Switcher */}
                <div className="pointer-events-auto flex items-center bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-1.5 gap-1 animate-in slide-in-from-bottom-8 fade-in duration-500">
                    <button
                        onClick={() => setControlMode('pan')}
                        title="Pan Tool (Space)"
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${
                            controlMode === 'pan' 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                            : 'text-gray-500 hover:bg-white hover:text-gray-800'
                        }`}
                    >
                        <PanIcon /> <span>Pan</span>
                    </button>
                    <button
                        onClick={() => setControlMode('rotate')}
                        title="Rotate Tool (Space)"
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${
                            controlMode === 'rotate' 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                            : 'text-gray-500 hover:bg-white hover:text-gray-800'
                        }`}
                    >
                        <RotateIcon /> <span>Rotate</span>
                    </button>
                    
                    <div className="w-px h-8 bg-gray-300 mx-2 opacity-50"></div>
                    
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={handleZoomIn}
                            className="p-2.5 text-gray-500 hover:bg-white hover:text-blue-600 rounded-xl transition-all active:scale-95"
                            title="Zoom In (+)"
                        >
                            <ZoomInIcon />
                        </button>
                        <button 
                            onClick={handleZoomOut}
                            className="p-2.5 text-gray-500 hover:bg-white hover:text-blue-600 rounded-xl transition-all active:scale-95"
                            title="Zoom Out (-)"
                        >
                            <ZoomOutIcon />
                        </button>
                        <button 
                            onClick={handleResetCamera}
                            className="p-2.5 text-gray-500 hover:bg-white hover:text-blue-600 rounded-xl transition-all active:scale-95"
                            title="Reset View (R)"
                        >
                            <HomeIcon />
                        </button>
                    </div>

                    <div className="w-px h-8 bg-gray-300 mx-2 opacity-50"></div>

                    <button 
                        onClick={handleSnapshot}
                        className="flex items-center gap-2 px-4 py-2.5 text-purple-700 bg-purple-50 hover:bg-purple-100 hover:text-purple-800 rounded-xl transition-all active:scale-95 font-bold text-sm border border-purple-100"
                        title="Snapshot & Annotate"
                    >
                        <CameraIcon /> Annotate
                    </button>
                </div>
                
                <p className="text-[10px] text-gray-400 font-bold bg-white/40 backdrop-blur-md px-3 py-1 rounded-full shadow-sm border border-white/20 uppercase tracking-widest opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-help">
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
                className="group relative flex flex-col items-center p-16 bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 cursor-pointer max-w-lg w-full mx-6 active:scale-[0.98]"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-[2.5rem] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="w-28 h-28 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out border border-gray-50">
                    <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <h2 className="text-3xl font-black text-gray-800 mb-3 tracking-tight group-hover:text-blue-700 transition-colors">Upload 2D Asset</h2>
                <p className="text-gray-500 text-center mb-8 max-w-xs leading-relaxed font-medium">
                    Support for <span className="font-bold text-gray-700 font-mono">.SVG</span> extrusion and <span className="font-bold text-gray-700 font-mono">.PNG/.JPG</span> projection.
                </p>
                <Button variant="primary" className="!rounded-full !px-10 !py-3 !text-lg shadow-xl shadow-blue-500/20 group-hover:shadow-blue-500/40">
                    Select File
                </Button>
            </div>
        </div>
    )
}
