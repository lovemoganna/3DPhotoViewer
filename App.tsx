import React, { useState, Suspense, useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useProgress, GizmoHelper, GizmoViewcube, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { UploadedFile, FileType, ViewerSettings, GalleryItem } from './types';
import { DEFAULT_SETTINGS, ACCEPTED_IMAGE_TYPES, GALLERY_CATEGORIES, ALL_GALLERY_ITEMS } from './constants';
import { SvgRenderer } from './components/SvgRenderer';
import { ImageRenderer } from './components/ImageRenderer';
import { ControlPanel } from './components/ControlPanel';
import { Button } from './components/Button';
import { AnnotationEditor } from './components/AnnotationEditor';
import { MythologyGallery } from './components/MythologyGallery';

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
const GalleryIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);
const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const PauseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

const LoadingOverlay = () => {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-[#272822]/70 backdrop-blur-md transition-all duration-500">
      <div className="flex flex-col items-center gap-4 bg-[#1e1f1c]/95 p-8 rounded-3xl shadow-2xl border border-[#3e3d32] text-[#f8f8f2]">
        <div className="w-12 h-12 border-4 border-[#a6e22e]/30 border-t-[#a6e22e] rounded-full animate-spin"></div>
        <div className="font-semibold text-sm tracking-wide text-[#e6db74]">加载 3D 艺术画作 {Math.round(progress)}%</div>
      </div>
    </div>
  );
};

const DropOverlay = ({ isDragging }: { isDragging: boolean }) => {
    if (!isDragging) return null;
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#a6e22e]/10 backdrop-blur-md border-8 border-[#a6e22e] border-dashed m-6 rounded-[2rem] pointer-events-none animate-in fade-in zoom-in duration-200">
            <div className="text-center">
                <div className="w-24 h-24 bg-[#a6e22e]/20 text-[#a6e22e] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#a6e22e]/20">
                    <UploadIcon />
                </div>
                <h2 className="text-4xl font-bold text-[#e6db74] tracking-tight">释放即可拖入文件</h2>
            </div>
        </div>
    );
}

export default function App() {
  // Default to the first auto-scanned art piece
  const defaultArt = ALL_GALLERY_ITEMS[0];
  const [file, setFile] = useState<UploadedFile | null>(
    defaultArt
      ? {
          url: defaultArt.url,
          name: defaultArt.title,
          type: FileType.IMAGE,
          description: defaultArt.description,
        }
      : null
  );

  const [settings, setSettings] = useState<ViewerSettings>(DEFAULT_SETTINGS);
  const [controlMode, setControlMode] = useState<'rotate' | 'pan'>('rotate');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Annotation State
  const [annotationImage, setAnnotationImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const orbitControlsRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Auto Slideshow Logic
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setFile(prev => {
        if (!prev) return prev;
        const currentIndex = ALL_GALLERY_ITEMS.findIndex(item => item.url === prev.url);
        const nextIndex = (currentIndex + 1) % ALL_GALLERY_ITEMS.length;
        const nextItem = ALL_GALLERY_ITEMS[nextIndex];
        return {
          url: nextItem.url,
          name: nextItem.title,
          type: FileType.IMAGE,
          description: nextItem.description,
        };
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleSelectGalleryItem = (item: GalleryItem) => {
    setFile({
      url: item.url,
      name: item.title,
      type: FileType.IMAGE,
      description: item.description,
    });
  };

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
    if (file && file.url.startsWith('blob:')) URL.revokeObjectURL(file.url);
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

  const handleNextArt = useCallback(() => {
    setFile(prev => {
      if (!prev) return prev;
      const currentIndex = ALL_GALLERY_ITEMS.findIndex(item => item.url === prev.url);
      const nextIndex = (currentIndex + 1) % ALL_GALLERY_ITEMS.length;
      const nextItem = ALL_GALLERY_ITEMS[nextIndex];
      return {
        url: nextItem.url,
        name: nextItem.title,
        type: FileType.IMAGE,
        description: nextItem.description,
      };
    });
  }, []);

  const handlePrevArt = useCallback(() => {
    setFile(prev => {
      if (!prev) return prev;
      const currentIndex = ALL_GALLERY_ITEMS.findIndex(item => item.url === prev.url);
      const prevIndex = (currentIndex - 1 + ALL_GALLERY_ITEMS.length) % ALL_GALLERY_ITEMS.length;
      const prevItem = ALL_GALLERY_ITEMS[prevIndex];
      return {
        url: prevItem.url,
        name: prevItem.title,
        type: FileType.IMAGE,
        description: prevItem.description,
      };
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!file || annotationImage) return;
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                setControlMode(prev => prev === 'pan' ? 'rotate' : 'pan');
                break;
            case 'KeyR':
                handleResetCamera();
                break;
            case 'Equal':
            case 'NumpadAdd':
                handleZoomIn();
                break;
            case 'Minus':
            case 'NumpadSubtract':
                handleZoomOut();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                handlePrevArt();
                break;
            case 'ArrowRight':
                e.preventDefault();
                handleNextArt();
                break;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, handleResetCamera, handleZoomIn, handleZoomOut, handlePrevArt, handleNextArt, annotationImage]);

  const handleSnapshot = () => {
      const canvas = canvasContainerRef.current?.querySelector('canvas');
      if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          setAnnotationImage(dataUrl);
      }
  };

  return (
    <div 
        className="w-full h-full relative overflow-hidden select-none bg-slate-950 text-slate-100 font-sans"
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept={Object.keys(ACCEPTED_IMAGE_TYPES).join(',')} className="hidden" />

      {/* --- Top Navigation Bar --- */}
      <div className="absolute top-0 left-0 w-full p-5 z-20 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
             {/* Logo & Exhibit Unified Title Bar */}
             <div className="bg-[#272822]/90 backdrop-blur-2xl px-4 py-2.5 rounded-2xl shadow-2xl border border-[#3e3d32] flex items-center gap-3 transition-all hover:border-[#66d9ef] group">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f92672] via-[#fd971f] to-[#e6db74] flex items-center justify-center shadow-md text-base font-bold text-[#272822] shrink-0">
                    🖼️
                </div>
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-sm font-extrabold tracking-wide flex items-center gap-2 leading-none">
                            <span className="bg-gradient-to-r from-[#f8f8f2] via-[#e6db74] to-[#66d9ef] bg-clip-text text-transparent font-sans">
                                3D Photo Gallery
                            </span>
                            <span className="text-[9px] bg-[#a6e22e]/20 text-[#a6e22e] border border-[#a6e22e]/40 px-1.5 py-0.2 rounded font-mono font-bold tracking-wider">
                                PRO v2.0
                            </span>
                        </h1>
                    </div>

                    {file && file.description && (
                      <>
                        <div className="w-px h-6 bg-[#3e3d32]"></div>
                        <div className="flex items-center gap-2 max-w-md">
                            <span className="text-[10px] bg-[#e6db74]/15 text-[#e6db74] border border-[#e6db74]/30 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                              #{ALL_GALLERY_ITEMS.findIndex(i => i.url === file.url) + 1}
                            </span>
                            <span className="text-xs font-bold text-[#f8f8f2] truncate max-w-[140px]">{file.name}</span>
                            <span className="text-[11px] text-[#75715e] truncate hidden md:inline max-w-[200px]">{file.description}</span>
                        </div>
                      </>
                    )}
                </div>
            </div>

            {/* Gallery Drawer Button */}
            <button
              onClick={() => setIsGalleryOpen(!isGalleryOpen)}
              className="bg-[#272822]/90 hover:bg-[#3e3d32] backdrop-blur-2xl text-[#e6db74] border border-[#3e3d32] px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all hover:scale-105 active:scale-95 h-[42px]"
            >
              <GalleryIcon />
              <span>图册 ({ALL_GALLERY_ITEMS.length})</span>
            </button>

            {/* Replace / Clear */}
            {file && !annotationImage && (
                 <div className="bg-[#272822]/90 backdrop-blur-2xl px-2 py-1.5 rounded-2xl shadow-xl border border-[#3e3d32] flex gap-1.5 animate-in slide-in-from-left-4 fade-in duration-300 h-[42px] items-center">
                    <Button variant="secondary" className="!py-1 !px-2.5 !text-xs !rounded-xl !bg-[#3e3d32] !text-[#f8f8f2] hover:!bg-[#49483e] active:scale-95" onClick={() => fileInputRef.current?.click()}>
                        导入
                    </Button>
                    <Button variant="danger" className="!py-1 !px-2.5 !text-xs !rounded-xl !bg-[#f92672] !text-white active:scale-95" onClick={handleClear}>
                        清空
                    </Button>
                 </div>
            )}
        </div>

        {file && !annotationImage && (
             <div className="pointer-events-auto flex items-center gap-2 animate-in slide-in-from-right-4 fade-in duration-300">
                {/* Slideshow Button */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl shadow-xl border border-[#3e3d32] backdrop-blur-2xl text-xs font-bold transition-all hover:scale-105 active:scale-95 h-[42px] ${
                    isPlaying ? 'bg-[#a6e22e] text-[#272822] border-[#a6e22e]' : 'bg-[#272822]/90 text-[#f8f8f2] hover:bg-[#3e3d32]'
                  }`}
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  <span>{isPlaying ? '暂停' : '幻灯片'}</span>
                </button>

                <button 
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    className="bg-[#272822]/90 hover:bg-[#3e3d32] text-[#66d9ef] p-2.5 rounded-2xl shadow-xl border border-[#3e3d32] backdrop-blur-2xl transition-all hover:scale-105 active:scale-95 h-[42px] w-[42px] flex items-center justify-center"
                    title="显示参数设置"
                >
                    <SettingsIcon />
                </button>
             </div>
        )}
      </div>

      {/* --- Gallery Drawer --- */}
      <MythologyGallery 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)} 
        currentUrl={file?.url}
        onSelectGalleryItem={handleSelectGalleryItem}
      />

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
                    gl={{ preserveDrawingBuffer: true, antialias: true }}
                >
                    <Suspense fallback={null}>
                    <Environment preset="city" />
                    <ambientLight intensity={settings.ambientIntensity} />
                    <directionalLight position={[20, 20, 20]} intensity={1.5} castShadow shadow-mapSize={2048} />
                    <pointLight position={[-20, -20, -20]} intensity={0.5} />
                    
                    <group position={[0, -5, 0]}>
                        <ContentWrapper file={file} settings={settings} />
                        <ContactShadows position={[0, -80, 0]} opacity={0.6} scale={300} blur={2} far={10} color="#000000" />
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
                            color="#272822"
                            strokeColor="#3e3d32"
                            textColor="#f8f8f2"
                            hoverColor="#a6e22e"
                            opacity={0.9}
                        />
                    </GizmoHelper>

                    </Suspense>
                </Canvas>
            </div>



            {/* --- Bottom Controls (Floating Island) --- */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 w-full px-4 pointer-events-none">
                
                {/* Mode Switcher */}
                <div className="pointer-events-auto flex items-center bg-[#272822]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-[#3e3d32] p-1.5 gap-1 animate-in slide-in-from-bottom-8 fade-in duration-500">
                    <button
                        onClick={() => setControlMode('pan')}
                        title="Pan Tool (Space)"
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${
                            controlMode === 'pan' 
                            ? 'bg-[#a6e22e] text-[#272822] shadow-lg shadow-[#a6e22e]/30' 
                            : 'text-[#75715e] hover:bg-[#3e3d32] hover:text-[#f8f8f2]'
                        }`}
                    >
                        <PanIcon /> <span>平移</span>
                    </button>
                    <button
                        onClick={() => setControlMode('rotate')}
                        title="Rotate Tool (Space)"
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${
                            controlMode === 'rotate' 
                            ? 'bg-[#a6e22e] text-[#272822] shadow-lg shadow-[#a6e22e]/30' 
                            : 'text-[#75715e] hover:bg-[#3e3d32] hover:text-[#f8f8f2]'
                        }`}
                    >
                        <RotateIcon /> <span>3D 旋转</span>
                    </button>
                    
                    <div className="w-px h-8 bg-[#3e3d32] mx-2"></div>
                    
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={handlePrevArt}
                            className="p-2.5 text-[#75715e] hover:bg-[#3e3d32] hover:text-[#e6db74] rounded-xl transition-all active:scale-95"
                            title="上一张展品 (← 键)"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button 
                            onClick={handleNextArt}
                            className="p-2.5 text-[#75715e] hover:bg-[#3e3d32] hover:text-[#e6db74] rounded-xl transition-all active:scale-95"
                            title="下一张展品 (→ 键)"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    <div className="w-px h-8 bg-[#3e3d32] mx-2"></div>
                    
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={handleZoomIn}
                            className="p-2.5 text-[#75715e] hover:bg-[#3e3d32] hover:text-[#66d9ef] rounded-xl transition-all active:scale-95"
                            title="放大 (+)"
                        >
                            <ZoomInIcon />
                        </button>
                        <button 
                            onClick={handleZoomOut}
                            className="p-2.5 text-[#75715e] hover:bg-[#3e3d32] hover:text-[#66d9ef] rounded-xl transition-all active:scale-95"
                            title="缩小 (-)"
                        >
                            <ZoomOutIcon />
                        </button>
                        <button 
                            onClick={handleResetCamera}
                            className="p-2.5 text-[#75715e] hover:bg-[#3e3d32] hover:text-[#66d9ef] rounded-xl transition-all active:scale-95"
                            title="重置视角 (R)"
                        >
                            <HomeIcon />
                        </button>
                    </div>

                    <div className="w-px h-8 bg-[#3e3d32] mx-2"></div>

                    <button 
                        onClick={handleSnapshot}
                        className="flex items-center gap-2 px-4 py-2.5 text-[#e6db74] bg-[#e6db74]/10 hover:bg-[#e6db74]/20 rounded-xl transition-all active:scale-95 font-bold text-sm border border-[#e6db74]/30"
                        title="截屏并开启 2D/3D 画布标注编辑器"
                    >
                        <CameraIcon /> 开启画布标注
                    </button>
                </div>
                
                <div className="flex items-center gap-2 text-[11px] text-[#75715e] font-mono bg-[#272822]/90 backdrop-blur-md px-4 py-1.5 rounded-full shadow-lg border border-[#3e3d32]">
                    <span><strong className="text-[#a6e22e]">Space:</strong> 切换平移/旋转</span>
                    <span>•</span>
                    <span><strong className="text-[#e6db74]">← / →:</strong> 切换展品</span>
                    <span>•</span>
                    <span><strong className="text-[#66d9ef]">R:</strong> 复位视角</span>
                    <span>•</span>
                    <span><strong className="text-[#fd971f]">+/-:</strong> 缩放视角</span>
                    <span>•</span>
                    <span><strong className="text-[#f92672]">拖拽:</strong> 3D 原地探索</span>
                </div>
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
                className="group relative flex flex-col items-center p-16 bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-slate-700/50 shadow-2xl hover:border-amber-500/50 transition-all duration-500 cursor-pointer max-w-lg w-full mx-6 active:scale-[0.98]"
            >
                <div className="w-28 h-28 bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-slate-700">
                    <svg className="w-12 h-12 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <h2 className="text-3xl font-black text-slate-100 mb-3 tracking-tight group-hover:text-amber-300 transition-colors">上传 2D 资源</h2>
                <p className="text-slate-400 text-center mb-8 max-w-xs leading-relaxed font-medium">
                    支持 <span className="font-bold text-amber-300 font-mono">.SVG</span> 矢量与 <span className="font-bold text-amber-300 font-mono">.PNG / .JPG</span> 3D 照片墙。
                </p>
                <Button variant="primary" className="!rounded-full !px-10 !py-3 !text-lg shadow-xl !bg-amber-500 hover:!bg-amber-400 !text-slate-950 font-bold">
                    选择文件
                </Button>
            </div>
        </div>
    )
}
