import React, { useRef, useEffect, useState, useCallback } from 'react';

interface AnnotationEditorProps {
  imageSrc: string;
  onClose: () => void;
}

type ToolType = 'rect' | 'circle' | 'arrow' | 'pen' | 'mosaic' | 'text';

interface Point {
  x: number;
  y: number;
}

interface DrawingAction {
  type: ToolType;
  points?: Point[]; // for pen
  start?: Point;    // for shapes
  end?: Point;      // for shapes
  text?: Point & { content: string; fontSize: number };
  color: string;
  lineWidth: number;
}

// --- Icons (Feishu Style) ---
const RectIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /></svg>;
const CircleIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /></svg>;
const ArrowIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12l-7-7-7 7M19 12H5" transform="rotate(180 12 12)"/></svg>;
const PenIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const TextIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 7V4h16v3M9 20h6M12 4v16" /></svg>;
const MosaicIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 7a3 3 0 013-3h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7z" /><path d="M9 4v16M15 4v16M4 9h16M4 15h16" opacity="0.5"/></svg>;
const UndoIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>;
const DownloadIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const CopyIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;
const CloseIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>;

// Feishu-like Colors
const PALETTE = [
  '#F54A45', // Red
  '#FDCB00', // Yellow
  '#22C55E', // Green
  '#3370FF', // Blue
  '#FFFFFF', // White
  '#1F2329', // Black
];

// --- Shared Rendering Logic ---
const renderScene = (
  ctx: CanvasRenderingContext2D,
  imageObj: HTMLImageElement,
  pixelatedImage: HTMLCanvasElement | null,
  history: DrawingAction[],
  tempAction: DrawingAction | null,
  scale: number = 1,
  offset: Point = { x: 0, y: 0 }
) => {
    // 1. Draw Base Image
    ctx.drawImage(imageObj, 0, 0);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const renderAction = (action: DrawingAction) => {
       ctx.save();
       ctx.strokeStyle = action.color;
       ctx.fillStyle = action.color;
       
       ctx.lineWidth = 4; 

       if (action.type === 'mosaic') {
           if (pixelatedImage && action.start && action.end) {
               ctx.beginPath();
               const w = action.end.x - action.start.x;
               const h = action.end.y - action.start.y;
               ctx.rect(action.start.x, action.start.y, w, h);
               ctx.clip();
               ctx.drawImage(pixelatedImage, 0, 0);
           }
       } else if (action.type === 'pen' && action.points && action.points.length > 0) {
           ctx.lineWidth = 4;
           ctx.beginPath();
           ctx.moveTo(action.points[0].x, action.points[0].y);
           for (let i = 1; i < action.points.length; i++) ctx.lineTo(action.points[i].x, action.points[i].y);
           ctx.stroke();
       } else if (action.type === 'rect' && action.start && action.end) {
           ctx.lineWidth = 5;
           const w = action.end.x - action.start.x;
           const h = action.end.y - action.start.y;
           ctx.strokeRect(action.start.x, action.start.y, w, h);
       } else if (action.type === 'circle' && action.start && action.end) {
           ctx.lineWidth = 5;
           const w = Math.abs(action.end.x - action.start.x);
           const h = Math.abs(action.end.y - action.start.y);
           const cx = Math.min(action.start.x, action.end.x) + w/2;
           const cy = Math.min(action.start.y, action.end.y) + h/2;
           ctx.beginPath();
           ctx.ellipse(cx, cy, w/2, h/2, 0, 0, 2 * Math.PI);
           ctx.stroke();
       } else if (action.type === 'arrow' && action.start && action.end) {
           ctx.lineWidth = 5;
           const headLen = 20;
           const angle = Math.atan2(action.end.y - action.start.y, action.end.x - action.start.x);
           
           ctx.beginPath();
           ctx.moveTo(action.start.x, action.start.y);
           ctx.lineTo(action.end.x, action.end.y);
           ctx.stroke();

           ctx.beginPath();
           ctx.moveTo(action.end.x, action.end.y);
           ctx.lineTo(action.end.x - headLen * Math.cos(angle - Math.PI / 6), action.end.y - headLen * Math.sin(angle - Math.PI / 6));
           ctx.lineTo(action.end.x - headLen * Math.cos(angle + Math.PI / 6), action.end.y - headLen * Math.sin(angle + Math.PI / 6));
           ctx.closePath();
           ctx.fill();
       } else if (action.type === 'text' && action.text) {
           const fontSize = action.text.fontSize;
           // STRICT SYNC: Must match CSS exactly
           ctx.font = `bold ${fontSize}px sans-serif`;
           ctx.textBaseline = 'top'; 
           
           const lines = action.text.content.split('\n');
           const lineHeight = fontSize * 1.2; 
           
           lines.forEach((line, index) => {
               const y = action.text!.y + (index * lineHeight);
               // Outline - Reduced thickness for better readability
               ctx.lineWidth = Math.max(2, fontSize / 8);
               ctx.strokeStyle = 'white';
               ctx.lineJoin = 'round';
               ctx.miterLimit = 2;
               ctx.strokeText(line, action.text!.x, y);
               // Fill
               ctx.fillStyle = action.color;
               ctx.fillText(line, action.text!.x, y);
           });
       }
       ctx.restore();
    };

    history.forEach(renderAction);
    if (tempAction) renderAction(tempAction);
};


export const AnnotationEditor: React.FC<AnnotationEditorProps> = ({ imageSrc, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [pixelatedImage, setPixelatedImage] = useState<HTMLCanvasElement | null>(null);
  
  const [history, setHistory] = useState<DrawingAction[]>([]);
  const [tempAction, setTempAction] = useState<DrawingAction | null>(null);
  
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  
  // Font Size State
  const [baseFontSize, setBaseFontSize] = useState(32);
  
  const [currentTool, setCurrentTool] = useState<ToolType>('rect');
  const [currentColor, setCurrentColor] = useState<string>('#F54A45');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [interactionStart, setInteractionStart] = useState<Point | null>(null);
  
  // Text State
  const [textInput, setTextInput] = useState<{ 
      x: number; y: number; worldX: number; worldY: number; visible: boolean;
  }>({ x: 0, y: 0, worldX: 0, worldY: 0, visible: false });
  const textValueRef = useRef(''); 

  const [toast, setToast] = useState<string | null>(null);

  // --- 1. Load Resources ---
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setImageObj(img);
      const fs = Math.max(16, Math.min(Math.max(img.width, img.height) * 0.03, 80));
      setBaseFontSize(fs);

      // Generate Pixelated Buffer
      const pCanvas = document.createElement('canvas');
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
          pCanvas.width = img.width;
          pCanvas.height = img.height;
          const pixelSize = Math.max(10, Math.min(img.width, img.height) * 0.015);
          const sw = Math.ceil(img.width / pixelSize);
          const sh = Math.ceil(img.height / pixelSize);
          pCtx.imageSmoothingEnabled = false;
          pCtx.drawImage(img, 0, 0, sw, sh);
          pCtx.drawImage(pCanvas, 0, 0, sw, sh, 0, 0, img.width, img.height);
          setPixelatedImage(pCanvas);
      }

      // Initial Fit
      if (containerRef.current) {
         const { clientWidth, clientHeight } = containerRef.current;
         const scaleX = (clientWidth * 0.9) / img.width;
         const scaleY = (clientHeight * 0.8) / img.height;
         const newScale = Math.min(scaleX, scaleY, 1);
         setScale(newScale);
         setOffset({
             x: (clientWidth - img.width * newScale) / 2,
             y: (clientHeight - img.height * newScale) / 2
         });
      }
    };
  }, [imageSrc]);

  // --- 2. Reactive Render Logic (No Loop) ---
  const renderCanvas = useCallback(() => {
     const canvas = canvasRef.current;
     const ctx = canvas?.getContext('2d');
     if (!canvas || !ctx || !imageObj || !containerRef.current) return;
     
     const { clientWidth, clientHeight } = containerRef.current;
     const dpr = window.devicePixelRatio || 1;
     
     // Resize if needed
     if (canvas.width !== clientWidth * dpr || canvas.height !== clientHeight * dpr) {
         canvas.width = clientWidth * dpr;
         canvas.height = clientHeight * dpr;
         canvas.style.width = `${clientWidth}px`;
         canvas.style.height = `${clientHeight}px`;
         ctx.scale(dpr, dpr);
     } else {
         ctx.clearRect(0, 0, clientWidth, clientHeight);
     }

     ctx.save();
     ctx.translate(offset.x, offset.y);
     ctx.scale(scale, scale);

     renderScene(ctx, imageObj, pixelatedImage, history, tempAction, scale, offset);
     
     ctx.restore();
  }, [imageObj, pixelatedImage, scale, offset, history, tempAction]);

  // Trigger render on state change
  useEffect(() => {
      renderCanvas();
  }, [renderCanvas]);


  // --- 3. Text Logic ---
  const resizeTextarea = () => {
      const el = textInputRef.current;
      if (!el) return;
      el.style.height = '0px'; el.style.width = '0px';
      el.style.height = el.scrollHeight + 'px';
      el.style.width = (el.scrollWidth + 10) + 'px';
  };

  const commitText = useCallback(() => {
      if (!textInput.visible) return;
      
      const content = textValueRef.current;
      if (content && content.trim()) {
          setHistory(prev => [...prev, {
              type: 'text',
              text: { x: textInput.worldX, y: textInput.worldY, content, fontSize: baseFontSize },
              color: currentColor,
              lineWidth: 1
          }]);
      }
      
      textValueRef.current = '';
      setTextInput(p => ({ ...p, visible: false }));
  }, [textInput.visible, textInput.worldX, textInput.worldY, baseFontSize, currentColor]);

  // Auto-focus logic
  useEffect(() => {
    if (textInput.visible && textInputRef.current) {
        textInputRef.current.focus();
        resizeTextarea();
    }
  }, [textInput.visible]);

  // --- 4. Event Handlers ---

  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
          x: (screenX - rect.left - offset.x) / scale,
          y: (screenY - rect.top - offset.y) / scale
      };
  }, [offset, scale]);

  const handleMouseDown = (e: React.MouseEvent) => {
      if (!imageObj) return;

      // 1. If text input is open
      if (textInput.visible) {
          // If clicked inside the box, do nothing
          if (e.target === textInputRef.current) return;
          // If clicked outside, commit
          commitText();
          return;
      }

      const worldPos = screenToWorld(e.clientX, e.clientY);

      // 2. Pan
      if (e.button === 1 || isPanning || e.buttons === 4) {
          setInteractionStart({ x: e.clientX, y: e.clientY });
          return;
      }

      // 3. Start Text Tool
      if (currentTool === 'text') {
          const rect = containerRef.current!.getBoundingClientRect();
          textValueRef.current = ''; 
          setTextInput({ 
              x: e.clientX - rect.left, 
              y: e.clientY - rect.top, 
              worldX: worldPos.x, worldY: worldPos.y, visible: true
          });
          // Focus is handled by useEffect
          return;
      }
      
      // 4. Start Drawing
      setInteractionStart(worldPos);
      setIsDrawing(true);
      if (currentTool === 'pen') {
          setHistory(prev => [...prev, { type: 'pen', points: [worldPos], color: currentColor, lineWidth: 3 }]);
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (textInput.visible) return;
      if (!interactionStart) return;

      if (e.buttons === 4 || (e.buttons === 1 && isPanning)) {
        const dx = e.clientX - (interactionStart as any).x; 
        const dy = e.clientY - (interactionStart as any).y;
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        setInteractionStart({ x: e.clientX, y: e.clientY } as any);
        renderCanvas(); // Force render during interaction
        return;
      }
      
      const worldPos = screenToWorld(e.clientX, e.clientY);
      if (isDrawing) {
        if (currentTool === 'pen') {
            // Update history directly for pen to be responsive
             setHistory(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.type === 'pen' && last.points) last.points.push(worldPos);
                return copy;
            });
        } else {
            setTempAction({
                type: currentTool,
                start: interactionStart,
                end: worldPos,
                color: currentColor,
                lineWidth: 1
            });
        }
      }
  };

  const handleMouseUp = () => {
      if (isDrawing) {
          setIsDrawing(false);
          setInteractionStart(null);
          if (tempAction) {
              setHistory(prev => [...prev, tempAction]);
              setTempAction(null);
          }
      }
      if (interactionStart && !isDrawing) setInteractionStart(null); 
  };

  // --- 5. Export Logic ---
  const generateHighResBlob = async (): Promise<Blob | null> => {
      if (!imageObj) return null;
      const temp = document.createElement('canvas');
      temp.width = imageObj.width;
      temp.height = imageObj.height;
      const ctx = temp.getContext('2d');
      if (!ctx) return null;
      
      renderScene(ctx, imageObj, pixelatedImage, history, null);
      return new Promise(resolve => temp.toBlob(resolve, 'image/png'));
  };

  const handleSave = async () => {
      const blob = await generateHighResBlob();
      if (!blob) return;
      const link = document.createElement('a');
      link.download = `screenshot-${Date.now()}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
  };

  const handleCopy = async () => {
      try {
          const blob = await generateHighResBlob();
          if (!blob) throw new Error("Failed to generate image");
          await navigator.clipboard.write([
              new ClipboardItem({ [blob.type]: blob })
          ]);
          setToast("Copied to clipboard!");
          setTimeout(() => setToast(null), 2000);
      } catch (e) {
          console.error(e);
          setToast("Copy failed");
          setTimeout(() => setToast(null), 2000);
      }
  };

  // --- Keyboard ---
  useEffect(() => {
      const handler = (e: KeyboardEvent) => {
          if (textInput.visible) {
              if (e.key === 'Escape') {
                  textValueRef.current = '';
                  setTextInput(p => ({...p, visible: false}));
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  commitText();
              }
              return;
          }
          if (e.code === 'Space') setIsPanning(true);
          if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
              e.preventDefault();
              setHistory(h => h.slice(0, -1));
          }
          if (e.key === 'Escape') onClose();
      };
      const upHandler = (e: KeyboardEvent) => { if (e.code === 'Space') setIsPanning(false); };
      window.addEventListener('keydown', handler);
      window.addEventListener('keyup', upHandler);
      return () => { window.removeEventListener('keydown', handler); window.removeEventListener('keyup', upHandler); };
  }, [textInput.visible, commitText, onClose]);


  return (
    <div className="absolute inset-0 z-50 bg-[#1F2329] flex flex-col overflow-hidden animate-in fade-in duration-200">
      
      {/* Toast */}
      {toast && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[60] bg-black/80 text-white px-4 py-2 rounded-lg backdrop-blur shadow-xl animate-in fade-in slide-in-from-top-2 pointer-events-none">
              {toast}
          </div>
      )}

      {/* Main Canvas */}
      <div 
        ref={containerRef} 
        className="flex-1 relative overflow-hidden"
        onWheel={(e) => {
            if (textInput.visible) return;
            const delta = -e.deltaY * 0.001;
            const factor = 1 + delta;
            const rect = containerRef.current!.getBoundingClientRect();
            const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
            const wx = (mx - offset.x) / scale; const wy = (my - offset.y) / scale;
            const newScale = Math.min(Math.max(0.05, scale * factor), 10);
            setScale(newScale);
            setOffset({ x: mx - wx * newScale, y: my - wy * newScale });
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: isPanning ? 'grab' : (currentTool === 'text' ? 'text' : 'crosshair') }}
      >
        <canvas ref={canvasRef} className="block pointer-events-none" />

        {/* Text Overlay */}
        {textInput.visible && (
            <textarea
                ref={textInputRef}
                defaultValue={textValueRef.current}
                onChange={(e) => { 
                    textValueRef.current = e.target.value; 
                    resizeTextarea(); 
                }}
                onBlur={() => {
                  // External click handler deals with commit
                }}
                onKeyDown={(e) => e.stopPropagation()} 
                onMouseDown={(e) => e.stopPropagation()} 
                className="absolute bg-transparent outline-none z-30 resize-none overflow-hidden whitespace-pre pointer-events-auto"
                style={{ 
                    left: textInput.x, 
                    top: textInput.y,
                    color: currentColor,
                    fontSize: `${baseFontSize * scale}px`, 
                    lineHeight: '1.2', 
                    fontWeight: 'bold', 
                    fontFamily: 'sans-serif',
                    padding: '2px', 
                    margin: 0, 
                    border: '1px solid ' + currentColor,
                    background: 'rgba(255,255,255,0.1)',
                    transformOrigin: '0 0', 
                    minWidth: '2em', 
                    minHeight: '1.5em',
                    WebkitTextStroke: `${Math.max(2, (baseFontSize / 8) * scale)}px white`, // Thinner stroke logic
                }}
                placeholder="Type..."
            />
        )}
      </div>

      {/* Toolbar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-2xl px-4 py-2 flex items-center gap-4 z-20 border border-gray-100">
         <div className="flex gap-2 border-r border-gray-200 pr-4">
             {[
                 { id: 'rect', icon: <RectIcon /> },
                 { id: 'circle', icon: <CircleIcon /> },
                 { id: 'arrow', icon: <ArrowIcon /> },
                 { id: 'pen', icon: <PenIcon /> },
                 { id: 'mosaic', icon: <MosaicIcon /> },
                 { id: 'text', icon: <TextIcon /> },
             ].map(tool => (
                 <button
                    key={tool.id}
                    // @ts-ignore
                    onClick={() => setCurrentTool(tool.id)}
                    className={`p-2 rounded-lg transition-all ${currentTool === tool.id ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-gray-500 hover:bg-gray-100'}`}
                 >
                     {tool.icon}
                 </button>
             ))}
         </div>

         {/* Font Size Control - Visible only when Text tool is active */}
         {currentTool === 'text' && (
            <div className="flex items-center gap-2 border-r border-gray-200 pr-4 pl-2">
                <span className="text-xs text-gray-400 font-bold uppercase">Size</span>
                <input 
                    type="range" 
                    min="12" 
                    max="120" 
                    step="2"
                    value={baseFontSize} 
                    onChange={(e) => setBaseFontSize(Number(e.target.value))}
                    className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-mono text-gray-600 min-w-[24px] text-right">{baseFontSize}</span>
            </div>
         )}

         <div className="flex gap-2 border-r border-gray-200 pr-4 items-center">
             {PALETTE.map(c => (
                 <button
                    key={c}
                    onClick={() => setCurrentColor(c)}
                    className={`w-5 h-5 rounded-full border border-gray-200 transition-transform ${currentColor === c ? 'scale-125 ring-2 ring-blue-500 ring-offset-1' : ''}`}
                    style={{ backgroundColor: c }}
                 />
             ))}
         </div>

         <div className="flex gap-2 text-gray-600">
             <button onClick={() => setHistory(h => h.slice(0, -1))} className="p-2 hover:bg-gray-100 rounded-lg"><UndoIcon /></button>
             <button onClick={handleCopy} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg" title="Copy to Clipboard"><CopyIcon /></button>
             <button onClick={handleSave} className="p-2 hover:bg-green-50 text-green-600 rounded-lg" title="Save File"><DownloadIcon /></button>
             <button onClick={onClose} className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><CloseIcon /></button>
         </div>
      </div>
    </div>
  );
};