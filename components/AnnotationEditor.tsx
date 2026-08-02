
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
  text?: Point & { 
    content: string; 
    fontSize: number;
    bgStyle?: 'none' | 'pill' | 'shadow'; // 'pill' for modern tag box, 'shadow' for dark text shadow
    fontFamily?: string;
    isBold?: boolean;
    isItalic?: boolean;
  };
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
const ZoomInIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4"/></svg>;
const ZoomOutIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 12H4"/></svg>;


// Monokai Classic Palette
const PALETTE = [
  '#f92672', // Monokai Pink / Magenta
  '#a6e22e', // Monokai Green
  '#e6db74', // Monokai Yellow
  '#66d9ef', // Monokai Cyan / Blue
  '#fd971f', // Monokai Orange
  '#ae81ff', // Monokai Purple
  '#ffffff', // Pure White
];

// --- Shared Rendering Logic ---
const renderScene = (
  ctx: CanvasRenderingContext2D,
  imageObj: HTMLImageElement,
  pixelatedImage: HTMLCanvasElement | null,
  history: DrawingAction[],
  tempAction: DrawingAction | null,
  scale: number = 1,
  offset: Point = { x: 0, y: 0 },
  selectedIndex: number | null = null
) => {
    // 1. Draw Base Image
    ctx.drawImage(imageObj, 0, 0);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const renderAction = (action: DrawingAction, actionIndex?: number) => {
       ctx.save();
       ctx.strokeStyle = action.color;
       ctx.fillStyle = action.color;
       
       const lw = action.lineWidth || 4;
       ctx.lineWidth = lw; 

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
           ctx.lineWidth = lw;
           ctx.beginPath();
           ctx.moveTo(action.points[0].x, action.points[0].y);
           for (let i = 1; i < action.points.length; i++) ctx.lineTo(action.points[i].x, action.points[i].y);
           ctx.stroke();
       } else if (action.type === 'rect' && action.start && action.end) {
           ctx.lineWidth = lw;
           const w = action.end.x - action.start.x;
           const h = action.end.y - action.start.y;
           ctx.strokeRect(action.start.x, action.start.y, w, h);
       } else if (action.type === 'circle' && action.start && action.end) {
           ctx.lineWidth = lw;
           const w = Math.abs(action.end.x - action.start.x);
           const h = Math.abs(action.end.y - action.start.y);
           const cx = Math.min(action.start.x, action.end.x) + w/2;
           const cy = Math.min(action.start.y, action.end.y) + h/2;
           ctx.beginPath();
           ctx.ellipse(cx, cy, w/2, h/2, 0, 0, 2 * Math.PI);
           ctx.stroke();
       } else if (action.type === 'arrow' && action.start && action.end) {
           ctx.lineWidth = lw;
           const headLen = Math.max(16, lw * 4);
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
            const isBold = action.text.isBold ?? true;
            const isItalic = action.text.isItalic ?? false;
            const family = action.text.fontFamily || '"Noto Sans SC", -apple-system, sans-serif';
            const bgStyle = action.text.bgStyle || 'pill';

            const fontStyleStr = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSize}px ${family}`;
            ctx.font = fontStyleStr;
            ctx.textBaseline = 'top'; 
            
            const lines = action.text.content.split('\n');
            const lineHeight = fontSize * 1.3; 
            
            let maxLineWidth = 0;
            lines.forEach(line => {
                const w = ctx.measureText(line).width;
                if (w > maxLineWidth) maxLineWidth = w;
            });

            const totalHeight = lines.length * lineHeight;
            const padX = fontSize * 0.4;
            const padY = fontSize * 0.25;

            // 1. Draw Pill / Tag Background Box if pill style
            if (bgStyle === 'pill') {
                const rectX = action.text.x - padX;
                const rectY = action.text.y - padY;
                const rectW = maxLineWidth + padX * 2;
                const rectH = totalHeight + padY * 1.6;
                const radius = Math.min(rectH / 2, 8);

                ctx.save();
                ctx.fillStyle = 'rgba(30, 31, 28, 0.88)';
                ctx.strokeStyle = action.color;
                ctx.lineWidth = Math.max(1.5, fontSize / 14);
                
                ctx.beginPath();
                if (typeof (ctx as any).roundRect === 'function') {
                    (ctx as any).roundRect(rectX, rectY, rectW, rectH, radius);
                } else {
                    ctx.rect(rectX, rectY, rectW, rectH);
                }
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            // 2. Draw Lines with Text Shadow & Stroke
            lines.forEach((line, index) => {
                const y = action.text!.y + (index * lineHeight);

                if (bgStyle !== 'pill') {
                    ctx.save();
                    ctx.shadowColor = 'rgba(0,0,0,0.85)';
                    ctx.shadowBlur = Math.max(4, fontSize / 4);
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;
                    
                    const strokeWidth = Math.max(2, fontSize / 10);
                    ctx.lineWidth = strokeWidth;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineJoin = 'round';
                    ctx.miterLimit = 2;
                    ctx.strokeText(line, action.text!.x, y);
                    ctx.restore();
                }

                ctx.fillStyle = action.color;
                ctx.fillText(line, action.text!.x, y);
            });

            // 3. Selection Box Highlighting when selectedIndex matches
            if (actionIndex !== undefined && actionIndex === selectedIndex) {
                const rectX = action.text.x - padX - 4;
                const rectY = action.text.y - padY - 4;
                const rectW = maxLineWidth + padX * 2 + 8;
                const rectH = totalHeight + padY * 1.6 + 8;

                ctx.save();
                ctx.strokeStyle = '#66d9ef';
                ctx.lineWidth = 2 / scale;
                ctx.setLineDash([6 / scale, 4 / scale]);
                ctx.strokeRect(rectX, rectY, rectW, rectH);
                
                // Draw 4 corner handles for selected item
                ctx.fillStyle = '#a6e22e';
                ctx.setLineDash([]);
                const hs = 6 / scale;
                ctx.fillRect(rectX - hs/2, rectY - hs/2, hs, hs);
                ctx.fillRect(rectX + rectW - hs/2, rectY - hs/2, hs, hs);
                ctx.fillRect(rectX - hs/2, rectY + rectH - hs/2, hs, hs);
                ctx.fillRect(rectX + rectW - hs/2, rectY + rectH - hs/2, hs, hs);
                ctx.restore();
            }
        }
        ctx.restore();
     };

    history.forEach((act, idx) => renderAction(act, idx));
    if (tempAction) renderAction(tempAction);
};


export const AnnotationEditor: React.FC<AnnotationEditorProps> = ({ imageSrc, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [pixelatedImage, setPixelatedImage] = useState<HTMLCanvasElement | null>(null);
  
  const [history, setHistory] = useState<DrawingAction[]>([]);
  const [redoHistory, setRedoHistory] = useState<DrawingAction[]>([]);
  const [tempAction, setTempAction] = useState<DrawingAction | null>(null);
  
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  
  const [baseFontSize, setBaseFontSize] = useState(16);
  const [lineWidth, setLineWidth] = useState(4);
  const [textBgStyle, setTextBgStyle] = useState<'pill' | 'none'>('pill');
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);
  const [fontFamily, setFontFamily] = useState<string>('"Noto Sans SC", -apple-system, sans-serif');
  
  const [currentTool, setCurrentTool] = useState<ToolType>('rect');
  const [currentColor, setCurrentColor] = useState<string>('#f92672'); 
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [interactionStart, setInteractionStart] = useState<Point | null>(null);
  const [hoverCursor, setHoverCursor] = useState<'default' | 'move' | 'text' | 'crosshair' | 'grab'>('default');
  
  // Text State
  const [textInput, setTextInput] = useState<{ 
      x: number; y: number; worldX: number; worldY: number; visible: boolean;
  }>({ x: 0, y: 0, worldX: 0, worldY: 0, visible: false });
  const textValueRef = useRef(''); 

  const [draggingTextIndex, setDraggingTextIndex] = useState<number | null>(null);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
  const [dragOriginalPos, setDragOriginalPos] = useState<Point | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  // --- 1. Load Resources ---
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setImageObj(img);
      // Calc reasonable font size but prefer 16px as base
      const fs = Math.max(14, Math.min(Math.max(img.width, img.height) * 0.02, 60));
      setBaseFontSize(16); // Strict default

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

  // --- 2. Reactive Render Logic ---
  const renderCanvas = useCallback(() => {
     const canvas = canvasRef.current;
     const ctx = canvas?.getContext('2d');
     if (!canvas || !ctx || !imageObj || !containerRef.current) return;
     
     const { clientWidth, clientHeight } = containerRef.current;
     const dpr = window.devicePixelRatio || 1;
     
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

     renderScene(ctx, imageObj, pixelatedImage, history, tempAction, scale, offset, selectedTextIndex ?? draggingTextIndex);
     
     ctx.restore();
  }, [imageObj, pixelatedImage, scale, offset, history, tempAction, selectedTextIndex, draggingTextIndex]);

  useEffect(() => {
      renderCanvas();
  }, [renderCanvas]);

  // --- 3. Zoom Logic (Native Listener) ---
  useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleWheel = (e: WheelEvent) => {
          if (textInput.visible) return; 
          e.preventDefault();

          const delta = -e.deltaY * 0.001;
          const factor = 1 + delta;
          
          const rect = container.getBoundingClientRect();
          const mx = e.clientX - rect.left; 
          const my = e.clientY - rect.top;
          
          const wx = (mx - offset.x) / scale; 
          const wy = (my - offset.y) / scale;
          
          const newScale = Math.min(Math.max(0.05, scale * factor), 10);
          const newOffset = { 
              x: mx - wx * newScale, 
              y: my - wy * newScale 
          };

          setScale(newScale);
          setOffset(newOffset);
      };

      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
  }, [scale, offset, textInput.visible]); 

  const zoomIn = useCallback(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mx = rect.width / 2;
      const my = rect.height / 2;
      const wx = (mx - offset.x) / scale; 
      const wy = (my - offset.y) / scale;
      const newScale = Math.min(10, scale * 1.25);
      setOffset({ x: mx - wx * newScale, y: my - wy * newScale });
      setScale(newScale);
  }, [offset, scale]);

  const zoomOut = useCallback(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mx = rect.width / 2;
      const my = rect.height / 2;
      const wx = (mx - offset.x) / scale; 
      const wy = (my - offset.y) / scale;
      const newScale = Math.max(0.05, scale / 1.25);
      setOffset({ x: mx - wx * newScale, y: my - wy * newScale });
      setScale(newScale);
  }, [offset, scale]);

  const resetZoom = useCallback(() => {
      if (!containerRef.current || !imageObj) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const scaleX = (clientWidth * 0.9) / imageObj.width;
      const scaleY = (clientHeight * 0.8) / imageObj.height;
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(newScale);
      setOffset({
          x: (clientWidth - imageObj.width * newScale) / 2,
          y: (clientHeight - imageObj.height * newScale) / 2
      });
  }, [imageObj]);

  const handleClearAll = useCallback(() => {
      if (history.length === 0) return;
      setHistory([]);
      setRedoHistory([]);
      setToast("已清空当前所有标注！");
      setTimeout(() => setToast(null), 2000);
  }, [history.length]);


  // --- 4. Text & Input Logic ---
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
              text: { 
                x: textInput.worldX, 
                y: textInput.worldY, 
                content, 
                fontSize: baseFontSize,
                bgStyle: textBgStyle,
                isBold,
                isItalic,
                fontFamily
              },
              color: currentColor,
              lineWidth: 1
          }]);
      }
      textValueRef.current = '';
      setTextInput(p => ({ ...p, visible: false }));
  }, [textInput.visible, textInput.worldX, textInput.worldY, baseFontSize, currentColor, textBgStyle, isBold, isItalic, fontFamily]);

  useEffect(() => {
    if (textInput.visible && textInputRef.current) {
        textInputRef.current.focus();
        resizeTextarea();
    }
  }, [textInput.visible]);

  // --- 5. Event Handlers ---

  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
          x: (screenX - rect.left - offset.x) / scale,
          y: (screenY - rect.top - offset.y) / scale
      };
  }, [offset, scale]);

  // Helper to check if mouse is over a text element
  const hitTestText = (worldPos: Point, ctx: CanvasRenderingContext2D): number => {
      ctx.textBaseline = 'top'; 
      
      // Loop backwards to find top-most
      for (let i = history.length - 1; i >= 0; i--) {
          const action = history[i];
          if (action.type === 'text' && action.text) {
              const fontSize = action.text.fontSize;
              const isBold = action.text.isBold ?? true;
              const isItalic = action.text.isItalic ?? false;
              const family = action.text.fontFamily || '"Noto Sans SC", -apple-system, sans-serif';
              ctx.font = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSize}px ${family}`;
              
              const lines = action.text.content.split('\n');
              let maxWidth = 0;
              lines.forEach(l => maxWidth = Math.max(maxWidth, ctx.measureText(l).width));
              const totalHeight = lines.length * fontSize * 1.3;
              
              // Add some padding for easier grabbing
              const padding = 10 / scale; 
              
              if (
                  worldPos.x >= action.text.x - padding && 
                  worldPos.x <= action.text.x + maxWidth + padding &&
                  worldPos.y >= action.text.y - padding && 
                  worldPos.y <= action.text.y + totalHeight + padding
              ) {
                  return i;
              }
          }
      }
      return -1;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (!imageObj) return;

      if (textInput.visible) {
          if (e.target === textInputRef.current) return;
          commitText();
          return;
      }

      const worldPos = screenToWorld(e.clientX, e.clientY);

      // Pan
      if (e.button === 1 || isPanning || e.buttons === 4) {
          setInteractionStart({ x: e.clientX, y: e.clientY });
          return;
      }

      // Start Text Tool OR Drag/Select existing Text
      if (currentTool === 'text') {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) {
             const hitIndex = hitTestText(worldPos, ctx);
             if (hitIndex !== -1) {
                  // HIT: Start dragging & set active selected index
                  setDraggingTextIndex(hitIndex);
                  setSelectedTextIndex(hitIndex);
                  setInteractionStart(worldPos);
                  setDragOriginalPos({ x: history[hitIndex].text!.x, y: history[hitIndex].text!.y });
                  return;
             }
          }

          // NO HIT: Clear selection and Create New Text
          setSelectedTextIndex(null);
          const rect = containerRef.current!.getBoundingClientRect();
          textValueRef.current = ''; 
          setTextInput({ 
              x: e.clientX - rect.left, 
              y: e.clientY - rect.top, 
              worldX: worldPos.x, worldY: worldPos.y, visible: true
          });
          return;
      }
      
      setSelectedTextIndex(null);
      
      // Start Drawing
      setInteractionStart(worldPos);
      setIsDrawing(true);
      if (currentTool === 'pen') {
          setHistory(prev => [...prev, { type: 'pen', points: [worldPos], color: currentColor, lineWidth }]);
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (textInput.visible) return;
      
      const worldPos = screenToWorld(e.clientX, e.clientY);

      // 1. Text Dragging Logic
      if (draggingTextIndex !== null && interactionStart && dragOriginalPos) {
           const dx = worldPos.x - interactionStart.x;
           const dy = worldPos.y - interactionStart.y;
           
           setHistory(prev => {
               const next = [...prev];
               const item = next[draggingTextIndex];
               if (item && item.text) {
                    next[draggingTextIndex] = {
                        ...item,
                        text: {
                            ...item.text,
                            x: dragOriginalPos.x + dx,
                            y: dragOriginalPos.y + dy
                        }
                    };
               }
               return next;
           });
           setHoverCursor('move');
           return;
      }

      // 2. Cursor Update (Hover detection)
      if (!interactionStart && currentTool === 'text') {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx && hitTestText(worldPos, ctx) !== -1) {
              setHoverCursor('move');
          } else {
              setHoverCursor('text');
          }
      } else if (!interactionStart) {
          setHoverCursor(isPanning ? 'grab' : 'crosshair');
      }

      // 3. Panning / Drawing
      if (!interactionStart) return;

      if (e.buttons === 4 || (e.buttons === 1 && isPanning)) {
        const dx = e.clientX - (interactionStart as any).x; 
        const dy = e.clientY - (interactionStart as any).y;
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        setInteractionStart({ x: e.clientX, y: e.clientY } as any);
        renderCanvas();
        return;
      }
      
      if (isDrawing) {
        if (currentTool === 'pen') {
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
                lineWidth: lineWidth
            });
        }
      }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
      // Finish Text Dragging
      if (draggingTextIndex !== null && interactionStart && dragOriginalPos) {
          const worldPos = screenToWorld(e.clientX, e.clientY);
          const dx = worldPos.x - interactionStart.x;
          const dy = worldPos.y - interactionStart.y;
          const dist = Math.sqrt(dx*dx + dy*dy);

          // If moved < 5px, consider it a Click -> Edit Mode
          if (dist < 5) {
               const item = history[draggingTextIndex];
               setHistory(prev => prev.filter((_, i) => i !== draggingTextIndex));
               
               textValueRef.current = item.text!.content;
               setCurrentColor(item.color);
               setBaseFontSize(item.text!.fontSize);
               if (item.text!.bgStyle) setTextBgStyle(item.text!.bgStyle as any);
               if (item.text!.isBold !== undefined) setIsBold(item.text!.isBold);
               if (item.text!.isItalic !== undefined) setIsItalic(item.text!.isItalic);
               if (item.text!.fontFamily) setFontFamily(item.text!.fontFamily);
               
               const screenX = item.text!.x * scale + offset.x;
               const screenY = item.text!.y * scale + offset.y;

               setTextInput({
                   x: screenX, 
                   y: screenY,
                   worldX: item.text!.x,
                   worldY: item.text!.y,
                   visible: true
               });
          }
          
          setDraggingTextIndex(null);
          setInteractionStart(null);
          setDragOriginalPos(null);
          return;
      }

      if (isDrawing) {
          setIsDrawing(false);
          setInteractionStart(null);
          if (tempAction) {
              setHistory(prev => [...prev, tempAction]);
              setRedoHistory([]); // Clear redo stack on new action
              setTempAction(null);
          }
      }
      if (interactionStart && !isDrawing) setInteractionStart(null); 
  };

  // --- Undo & Redo Handlers ---
  const handleUndo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoHistory(redo => [...redo, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setHistory(h => [...h, last]);
      return prev.slice(0, -1);
    });
  }, []);

  // --- 6. Export / Copy ---
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
      link.download = `annotation-${Date.now()}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      setToast("图片已成功保存到本地！");
      setTimeout(() => setToast(null), 2000);
  };

  const handleCopy = async () => {
      try {
          const blob = await generateHighResBlob();
          if (!blob) throw new Error("Failed to generate image");
          await navigator.clipboard.write([
              new ClipboardItem({ [blob.type]: blob })
          ]);
          setToast("已成功复制标注图像到剪贴板！");
          setTimeout(() => setToast(null), 2000);
      } catch (e) {
          console.error(e);
          setToast("复制失败，请重试");
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
          
          // Undo: Ctrl+Z
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
              e.preventDefault();
              handleUndo();
          }
          // Redo: Ctrl+Y or Ctrl+Shift+Z
          if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
              e.preventDefault();
              handleRedo();
          }

          // Delete selected text or top element: Delete / Backspace
          if (e.key === 'Delete' || e.key === 'Backspace') {
              if (history.length > 0) {
                  e.preventDefault();
                  handleUndo();
              }
          }

          if (e.key === 'Escape') onClose();
      };
      const upHandler = (e: KeyboardEvent) => { if (e.code === 'Space') setIsPanning(false); };
      window.addEventListener('keydown', handler);
      window.addEventListener('keyup', upHandler);
      return () => { window.removeEventListener('keydown', handler); window.removeEventListener('keyup', upHandler); };
  }, [textInput.visible, commitText, onClose, handleUndo, handleRedo, history.length]);

  const strokeWidth = Math.max(0.5, (baseFontSize / 12) * scale);
  const textShadowCSS = `
    -${strokeWidth}px -${strokeWidth}px 0 #fff,
    ${strokeWidth}px -${strokeWidth}px 0 #fff,
    -${strokeWidth}px ${strokeWidth}px 0 #fff,
    ${strokeWidth}px ${strokeWidth}px 0 #fff,
    0px -${strokeWidth}px 0 #fff,
    -${strokeWidth}px 0px 0 #fff,
    0px ${strokeWidth}px 0 #fff,
    ${strokeWidth}px 0px 0 #fff
  `;

  return (
    <div className="absolute inset-0 z-50 bg-[#272822] flex flex-col overflow-hidden animate-in fade-in duration-200">
      
      {/* Top Floating Shortcut Badge & Tips Bar */}
      <div className="absolute top-6 left-6 z-40 flex items-center gap-3 pointer-events-none">
        <div className="bg-[#1e1f1c]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#3e3d32] shadow-xl text-xs font-mono text-[#f8f8f2] flex items-center gap-3">
          <span className="text-[#a6e22e] font-bold">⌨️ 快捷操作:</span>
          <span><strong className="text-[#66d9ef]">Ctrl+Z:</strong> 撤销</span>
          <span>•</span>
          <span><strong className="text-[#66d9ef]">Ctrl+Y:</strong> 重做</span>
          <span>•</span>
          <span><strong className="text-[#fd971f]">Del/退格:</strong> 删除</span>
          <span>•</span>
          <span><strong className="text-[#e6db74]">按住空格:</strong> 抓取平移</span>
          <span>•</span>
          <span><strong className="text-[#f92672]">Esc:</strong> 退出编辑</span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[60] bg-[#1e1f1c]/90 text-[#a6e22e] border border-[#3e3d32] px-5 py-2.5 rounded-xl backdrop-blur shadow-2xl animate-in fade-in slide-in-from-top-2 pointer-events-none font-bold text-sm">
              {toast}
          </div>
      )}

      {/* Main Canvas */}
      <div 
        ref={containerRef} 
        className="flex-1 relative overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: hoverCursor }}
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
                className="absolute outline-none z-30 resize-none overflow-hidden whitespace-pre pointer-events-auto rounded-xl transition-all shadow-2xl animate-in zoom-in-95 duration-150"
                style={{ 
                    left: textInput.x, 
                    top: textInput.y,
                    color: currentColor,
                    fontSize: `${baseFontSize * scale}px`, 
                    lineHeight: '1.3', 
                    fontWeight: isBold ? 'bold' : 'normal', 
                    fontStyle: isItalic ? 'italic' : 'normal',
                    fontFamily: fontFamily,
                    padding: `${baseFontSize * scale * 0.25}px ${baseFontSize * scale * 0.4}px`, 
                    margin: 0, 
                    border: `2px dashed ${currentColor}`, 
                    background: textBgStyle === 'pill' ? 'rgba(30, 31, 28, 0.95)' : 'rgba(39, 40, 34, 0.65)', 
                    transformOrigin: '0 0', 
                    minWidth: '3em', 
                    minHeight: '1.5em',
                    textShadow: textBgStyle === 'pill' ? 'none' : textShadowCSS, 
                }}
                placeholder="在此输入文本注释..."
            />
        )}
      </div>

      {/* Toolbar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#272822]/95 backdrop-blur-2xl rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-6 z-20 border border-[#3e3d32] text-[#f8f8f2] animate-in slide-in-from-bottom-6 fade-in duration-300">
         <div className="flex gap-2 border-r border-[#3e3d32] pr-6">
             {[
                 { id: 'rect', icon: <RectIcon />, title: '矩形' },
                 { id: 'circle', icon: <CircleIcon />, title: '圆形' },
                 { id: 'arrow', icon: <ArrowIcon />, title: '箭头' },
                 { id: 'pen', icon: <PenIcon />, title: '画笔' },
                 { id: 'mosaic', icon: <MosaicIcon />, title: '马赛克' },
                 { id: 'text', icon: <TextIcon />, title: '文字标注' },
             ].map(tool => (
                 <button
                    key={tool.id}
                    // @ts-ignore
                    onClick={() => setCurrentTool(tool.id)}
                    title={tool.title}
                    className={`p-2.5 rounded-xl transition-all duration-200 active:scale-95 ${currentTool === tool.id ? 'bg-[#a6e22e] text-[#272822] shadow-md shadow-[#a6e22e]/20 font-bold' : 'text-[#75715e] hover:bg-[#3e3d32] hover:text-[#f8f8f2]'}`}
                 >
                     {tool.icon}
                 </button>
             ))}
         </div>

         {/* Line Width Control for shapes/pen */}
         {currentTool !== 'text' && (
            <div className="flex items-center gap-3 border-r border-[#3e3d32] pr-6 pl-1 animate-in fade-in slide-in-from-left-2 duration-200">
                <span className="text-xs text-[#66d9ef] font-bold uppercase tracking-wider">线宽</span>
                <input 
                    type="range" 
                    min="2" 
                    max="20" 
                    step="1"
                    value={lineWidth} 
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="w-20 h-1.5 bg-[#3e3d32] rounded-full appearance-none cursor-pointer accent-[#a6e22e] hover:accent-[#a6e22e]"
                />
                <span className="text-xs font-mono text-[#e6db74] min-w-[20px] text-right font-medium">{lineWidth}px</span>
            </div>
         )}

         {/* Font Size & Style Control */}
         {currentTool === 'text' && (
            <div className="flex items-center gap-4 border-r border-[#3e3d32] pr-6 pl-1 animate-in fade-in slide-in-from-left-2 duration-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#66d9ef] font-bold uppercase tracking-wider">字号</span>
                  <input 
                      type="range" 
                      min="12" 
                      max="120" 
                      step="2"
                      value={baseFontSize} 
                      onChange={(e) => setBaseFontSize(Number(e.target.value))}
                      className="w-24 h-1.5 bg-[#3e3d32] rounded-full appearance-none cursor-pointer accent-[#a6e22e] hover:accent-[#a6e22e]"
                  />
                  <span className="text-xs font-mono text-[#e6db74] min-w-[24px] text-right font-medium">{baseFontSize}</span>
                </div>

                <div className="w-px h-5 bg-[#3e3d32]"></div>

                {/* Font Weight & Style (B / I) */}
                <div className="flex items-center gap-1 bg-[#1e1f1c] p-1 rounded-xl border border-[#3e3d32]">
                  <button
                    onClick={() => setIsBold(!isBold)}
                    className={`w-7 h-7 text-xs font-black rounded-lg transition-all flex items-center justify-center ${
                      isBold ? 'bg-[#66d9ef] text-[#272822] shadow-sm font-extrabold' : 'text-[#75715e] hover:text-[#f8f8f2]'
                    }`}
                    title="切换加粗 (Bold)"
                  >
                    B
                  </button>
                  <button
                    onClick={() => setIsItalic(!isItalic)}
                    className={`w-7 h-7 text-xs italic font-bold rounded-lg transition-all flex items-center justify-center ${
                      isItalic ? 'bg-[#66d9ef] text-[#272822] shadow-sm' : 'text-[#75715e] hover:text-[#f8f8f2]'
                    }`}
                    title="切换斜体 (Italic)"
                  >
                    I
                  </button>
                </div>

                <div className="w-px h-5 bg-[#3e3d32]"></div>

                {/* Font Family Selector */}
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="bg-[#1e1f1c] text-[#f8f8f2] text-xs font-medium px-2.5 py-1.5 rounded-xl border border-[#3e3d32] outline-none hover:border-[#66d9ef] cursor-pointer"
                  title="选择字体样式"
                >
                  <option value='"Noto Sans SC", -apple-system, sans-serif'>无衬线 (Sans)</option>
                  <option value='"Georgia", "Noto Serif SC", serif'>衬线体 (Serif)</option>
                  <option value='"Fira Code", "Courier New", monospace'>等宽极客 (Mono)</option>
                </select>

                <div className="w-px h-5 bg-[#3e3d32]"></div>

                {/* Text Style Pill Toggle */}
                <div className="flex items-center gap-1.5 bg-[#1e1f1c] p-1 rounded-xl border border-[#3e3d32]">
                  <button
                    onClick={() => setTextBgStyle('pill')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      textBgStyle === 'pill' ? 'bg-[#a6e22e] text-[#272822] shadow-sm' : 'text-[#75715e] hover:text-[#f8f8f2]'
                    }`}
                    title="高亮胶囊框样式"
                  >
                    🏷️ 胶囊框
                  </button>
                  <button
                    onClick={() => setTextBgStyle('none')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      textBgStyle === 'none' ? 'bg-[#a6e22e] text-[#272822] shadow-sm' : 'text-[#75715e] hover:text-[#f8f8f2]'
                    }`}
                    title="高对比度纯文字"
                  >
                    ✍️ 纯文字
                  </button>
                </div>
            </div>
         )}

         <div className="flex gap-2.5 border-r border-[#3e3d32] pr-6 items-center">
             {PALETTE.map(c => (
                 <button
                    key={c}
                    onClick={() => setCurrentColor(c)}
                    className={`w-6 h-6 rounded-full border border-[#3e3d32] transition-all duration-200 hover:scale-110 active:scale-95 ${currentColor === c ? 'scale-125 ring-2 ring-[#66d9ef] ring-offset-2 ring-offset-[#272822]' : ''}`}
                    style={{ backgroundColor: c }}
                 />
             ))}
         </div>

         {/* Zoom Controls */}
         <div className="flex gap-1.5 border-r border-[#3e3d32] pr-6 text-[#75715e]">
             <button onClick={zoomIn} className="p-2.5 hover:bg-[#3e3d32] hover:text-[#66d9ef] rounded-xl transition-all active:scale-95" title="放大"><ZoomInIcon /></button>
             <button onClick={zoomOut} className="p-2.5 hover:bg-[#3e3d32] hover:text-[#66d9ef] rounded-xl transition-all active:scale-95" title="缩小"><ZoomOutIcon /></button>
             <button onClick={resetZoom} className="p-2.5 hover:bg-[#3e3d32] hover:text-[#66d9ef] rounded-xl transition-all active:scale-95 text-xs font-bold font-mono" title="一键居中自适应视角">100%</button>
         </div>

         <div className="flex gap-2 text-[#75715e]">
             <button 
                onClick={handleUndo} 
                disabled={history.length === 0} 
                className={`p-2.5 rounded-xl transition-all active:scale-95 ${history.length > 0 ? 'hover:bg-[#3e3d32] hover:text-[#e6db74]' : 'opacity-40 cursor-not-allowed'}`} 
                title="撤销 (Ctrl+Z)"
             >
                <UndoIcon />
             </button>
             <button 
                onClick={handleRedo} 
                disabled={redoHistory.length === 0} 
                className={`p-2.5 rounded-xl transition-all active:scale-95 ${redoHistory.length > 0 ? 'hover:bg-[#3e3d32] hover:text-[#e6db74]' : 'opacity-40 cursor-not-allowed'}`} 
                title="重做 (Ctrl+Y / Shift+Ctrl+Z)"
             >
                <svg className="w-5 h-5 transform -scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
             </button>
             <button 
                onClick={handleClearAll} 
                disabled={history.length === 0} 
                className={`p-2.5 rounded-xl transition-all active:scale-95 ${history.length > 0 ? 'hover:bg-[#3e3d32] hover:text-[#f92672]' : 'opacity-40 cursor-not-allowed'}`} 
                title="清空所有标注"
             >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
             <button onClick={handleCopy} className="p-2.5 hover:bg-[#3e3d32] hover:text-[#66d9ef] rounded-xl transition-all active:scale-95" title="复制到剪贴板"><CopyIcon /></button>
             <button onClick={handleSave} className="p-2.5 hover:bg-[#3e3d32] hover:text-[#a6e22e] rounded-xl transition-all active:scale-95" title="保存图片"><DownloadIcon /></button>
             <button onClick={onClose} className="p-2.5 hover:bg-[#3e3d32] hover:text-[#f92672] rounded-xl transition-all active:scale-95" title="退出编辑"><CloseIcon /></button>
         </div>
      </div>
    </div>
  );
};
