
import React from 'react';
import { ViewerSettings, FileType } from '../types';

interface ControlPanelProps {
  settings: ViewerSettings;
  onSettingsChange: (settings: ViewerSettings) => void;
  fileType: FileType;
  isOpen: boolean;
  onClose: () => void;
}

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const ControlPanel: React.FC<ControlPanelProps> = ({ settings, onSettingsChange, fileType, isOpen, onClose }) => {
  const handleChange = (key: keyof ViewerSettings, value: boolean | string | number) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div 
      className={`absolute top-0 right-0 h-full w-80 bg-[#272822]/95 backdrop-blur-2xl shadow-2xl border-l border-[#3e3d32] z-40 transition-transform duration-300 ease-out transform text-[#f8f8f2] ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#3e3d32] flex justify-between items-center bg-[#1e1f1c]/80">
          <div>
            <h3 className="text-[#66d9ef] font-extrabold text-xl tracking-tight flex items-center gap-2">
              ⚙️ 参数编辑器
            </h3>
            <span className="text-[10px] font-bold tracking-wider text-[#a6e22e] bg-[#a6e22e]/10 px-2 py-0.5 rounded-md mt-1 inline-block border border-[#a6e22e]/20 uppercase">
              {fileType} 模式
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-[#75715e] hover:text-[#f8f8f2] hover:bg-[#3e3d32] transition-colors"
          >
            <CloseIcon />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7 scrollbar-thin scrollbar-thumb-[#3e3d32]">
          
          {/* Transform Controls */}
          <section>
            <h4 className="text-xs font-bold text-[#66d9ef] uppercase tracking-widest mb-4">Geometry & 3D Frame</h4>
            
            {/* 3D Frame Toggle */}
            <div className="mb-5 flex items-center justify-between p-3 bg-[#1e1f1c]/90 rounded-xl border border-[#3e3d32]">
              <label className="text-sm font-semibold text-[#f8f8f2]">3D 立体画框 (3D Frame)</label>
              <input 
                type="checkbox" 
                checked={settings.enable3DFrame} 
                onChange={(e) => handleChange('enable3DFrame', e.target.checked)}
                className="w-5 h-5 accent-[#a6e22e] rounded cursor-pointer"
              />
            </div>

            {settings.enable3DFrame && (
              <div className="space-y-4 mb-6 p-3 bg-[#1e1f1c]/80 rounded-xl border border-[#3e3d32]">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#75715e] mb-1">
                    <span>画框厚度 (Depth)</span>
                    <span className="text-[#e6db74]">{settings.frameDepth}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="30" 
                    value={settings.frameDepth} 
                    onChange={(e) => handleChange('frameDepth', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#3e3d32] rounded-lg appearance-none cursor-pointer accent-[#a6e22e]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#75715e]">画框颜色 (Frame Color)</span>
                  <input 
                    type="color" 
                    value={settings.frameColor} 
                    onChange={(e) => handleChange('frameColor', e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-[#3e3d32] p-0 bg-transparent"
                  />
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#f8f8f2] mb-3">镜像翻转 (Flip Axis)</label>
              <div className="flex rounded-xl bg-[#1e1f1c] p-1.5 gap-1 border border-[#3e3d32]">
                {['X', 'Y', 'Z'].map((axis) => {
                  const key = `flip${axis}` as keyof ViewerSettings;
                  // @ts-ignore
                  const isActive = settings[key];
                  return (
                    <button
                      key={axis}
                      onClick={() => handleChange(key, !isActive)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'bg-[#a6e22e] text-[#272822] shadow-sm font-extrabold' 
                          : 'text-[#75715e] hover:text-[#f8f8f2] hover:bg-[#3e3d32]'
                      }`}
                    >
                      {axis}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#f8f8f2] mb-4">3D 视角旋转 (Rotation)</label>
              <div className="space-y-5">
                {['X', 'Y', 'Z'].map((axis) => {
                   const key = `rotation${axis}` as keyof ViewerSettings;
                   const value = settings[key] as number;
                   return (
                    <div key={axis} className="flex items-center gap-4">
                      <span className="text-xs font-bold text-[#66d9ef] w-3">{axis}</span>
                      <input 
                          type="range" 
                          min="0" 
                          max="360" 
                          value={value} 
                          onChange={(e) => handleChange(key, parseInt(e.target.value))}
                          className="flex-1 h-1.5 bg-[#3e3d32] rounded-lg appearance-none cursor-pointer accent-[#a6e22e] hover:accent-[#a6e22e] transition-all"
                      />
                      <span className="text-xs font-mono font-medium text-[#e6db74] w-9 text-right bg-[#1e1f1c] px-1 py-0.5 rounded border border-[#3e3d32]">{value}°</span>
                    </div>
                   );
                })}
              </div>
            </div>
          </section>

          {/* SVG Specific Controls */}
          {fileType === FileType.SVG && (
            <section className="pt-6 border-t border-[#3e3d32]">
               <h4 className="text-xs font-bold text-[#66d9ef] uppercase tracking-widest mb-4">SVG 样式</h4>
               <div className="space-y-3">
                 {[
                   { key: 'drawFillShapes', label: '填充图形 (Fill Shapes)' },
                   { key: 'drawStrokes', label: '描边线 (Strokes)' },
                   { key: 'fillShapesWireframe', label: '填充网格 (Fill Wireframe)' },
                   { key: 'strokesWireframe', label: '描边网格 (Stroke Wireframe)' },
                 ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between cursor-pointer group p-3 bg-[#1e1f1c]/50 hover:bg-[#1e1f1c] rounded-xl transition-all duration-200 border border-[#3e3d32]">
                      <span className="text-sm text-[#f8f8f2] font-medium transition-colors">{item.label}</span>
                      <div className="relative inline-block w-11 h-6 align-middle select-none transition duration-200 ease-in">
                        <input 
                          type="checkbox" 
                          // @ts-ignore
                          checked={settings[item.key]} 
                          // @ts-ignore
                          onChange={(e) => handleChange(item.key, e.target.checked)}
                          className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-[#f8f8f2] appearance-none cursor-pointer border-transparent shadow-sm checked:right-0.5 transition-all duration-200 top-0.5 accent-[#a6e22e]"
                          style={ settings[item.key as keyof ViewerSettings] ? { right: '2px' } : { right: 'calc(100% - 22px)' }}
                        />
                        <span className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ${settings[item.key as keyof ViewerSettings] ? 'bg-[#a6e22e]' : 'bg-[#3e3d32]'}`}></span>
                      </div>
                    </label>
                 ))}
               </div>
            </section>
          )}

          {/* Background Control */}
          <section className="pt-6 border-t border-[#3e3d32]">
            <h4 className="text-xs font-bold text-[#66d9ef] uppercase tracking-widest mb-4">背景环境 (Environment)</h4>
             <div className="flex items-center justify-between p-3 bg-[#1e1f1c]/90 rounded-xl border border-[#3e3d32]">
                <label className="text-sm font-medium text-[#f8f8f2]">场景背景色</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#e6db74] bg-[#272822] px-2 py-1 rounded border border-[#3e3d32]">{settings.backgroundColor === 'transparent' ? '默认' : settings.backgroundColor}</span>
                  <div className="relative overflow-hidden w-9 h-9 rounded-full shadow-sm ring-2 ring-[#3e3d32] cursor-pointer hover:scale-110 transition-transform">
                    <input 
                      type="color" 
                      value={settings.backgroundColor === 'transparent' ? '#272822' : settings.backgroundColor}
                      onChange={(e) => handleChange('backgroundColor', e.target.value)}
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                    />
                  </div>
                </div>
             </div>
             {settings.backgroundColor !== 'transparent' && (
                <button 
                  onClick={() => handleChange('backgroundColor', 'transparent')}
                  className="mt-3 text-xs font-bold text-[#66d9ef] hover:text-[#a6e22e] w-full text-right px-1"
                >
                  重置背景色
                </button>
             )}
          </section>
        </div>
        
      </div>
    </div>
  );
};
