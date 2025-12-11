
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
      className={`absolute top-0 right-0 h-full w-80 bg-white/90 backdrop-blur-2xl shadow-2xl border-l border-white/50 z-20 transition-transform duration-300 ease-in-out transform ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-6 border-b border-gray-100 flex justify-between items-center bg-white/50">
          <div>
            <h3 className="text-gray-900 font-bold text-xl tracking-tight">Editor</h3>
            <span className="text-[10px] font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-md mt-1 inline-block uppercase">
              {fileType} Mode
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          
          {/* Transform Controls */}
          <section>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Geometry</h4>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Flip Axis</label>
              <div className="flex rounded-xl bg-gray-100/80 p-1.5 gap-1">
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
                          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                          : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                      }`}
                    >
                      {axis}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">Rotation</label>
              <div className="space-y-5">
                {['X', 'Y', 'Z'].map((axis) => {
                   const key = `rotation${axis}` as keyof ViewerSettings;
                   const value = settings[key] as number;
                   return (
                    <div key={axis} className="flex items-center gap-4">
                      <span className="text-xs font-bold text-gray-400 w-3">{axis}</span>
                      <input 
                          type="range" 
                          min="0" 
                          max="360" 
                          value={value} 
                          onChange={(e) => handleChange(key, parseInt(e.target.value))}
                          className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all"
                      />
                      <span className="text-xs font-mono font-medium text-gray-600 w-9 text-right bg-gray-50 px-1 rounded">{value}°</span>
                    </div>
                   );
                })}
              </div>
            </div>
          </section>

          {/* SVG Specific Controls */}
          {fileType === FileType.SVG && (
            <section className="pt-6 border-t border-gray-100">
               <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">SVG Styles</h4>
               <div className="space-y-3">
                 {[
                   { key: 'drawFillShapes', label: 'Fill Shapes', color: 'text-blue-600' },
                   { key: 'drawStrokes', label: 'Strokes', color: 'text-blue-600' },
                   { key: 'fillShapesWireframe', label: 'Fill Wireframe', color: 'text-purple-600' },
                   { key: 'strokesWireframe', label: 'Stroke Wireframe', color: 'text-purple-600' },
                 ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between cursor-pointer group p-3 hover:bg-gray-50/80 rounded-xl transition-all duration-200 border border-transparent hover:border-gray-100">
                      <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">{item.label}</span>
                      <div className="relative inline-block w-11 h-6 align-middle select-none transition duration-200 ease-in">
                        <input 
                          type="checkbox" 
                          // @ts-ignore
                          checked={settings[item.key]} 
                          // @ts-ignore
                          onChange={(e) => handleChange(item.key, e.target.checked)}
                          className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-transparent shadow-sm checked:right-0.5 checked:border-0 transition-all duration-200 top-0.5"
                          style={ settings[item.key as keyof ViewerSettings] ? { right: '2px' } : { right: 'calc(100% - 22px)' }}
                        />
                        <span className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ${settings[item.key as keyof ViewerSettings] ? 'bg-blue-600' : 'bg-gray-200'}`}></span>
                      </div>
                    </label>
                 ))}
               </div>
            </section>
          )}

          {/* Background Control */}
          <section className="pt-6 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Environment</h4>
             <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                <label className="text-sm font-medium text-gray-700">Background Color</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">{settings.backgroundColor === 'transparent' ? 'Auto' : settings.backgroundColor}</span>
                  <div className="relative overflow-hidden w-9 h-9 rounded-full shadow-sm ring-2 ring-white cursor-pointer hover:scale-110 transition-transform">
                    <input 
                      type="color" 
                      value={settings.backgroundColor === 'transparent' ? '#ffffff' : settings.backgroundColor}
                      onChange={(e) => handleChange('backgroundColor', e.target.value)}
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                    />
                  </div>
                </div>
             </div>
             {settings.backgroundColor !== 'transparent' && (
                <button 
                  onClick={() => handleChange('backgroundColor', 'transparent')}
                  className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 w-full text-right px-1"
                >
                  Reset to default
                </button>
             )}
          </section>
        </div>
        
      </div>
    </div>
  );
};
