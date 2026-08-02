import React, { useState } from 'react';
import { GalleryItem } from '../types';
import { GALLERY_CATEGORIES } from '../constants';

interface MythologyGalleryProps {
  onSelectGalleryItem: (item: GalleryItem) => void;
  currentUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MythologyGallery: React.FC<MythologyGalleryProps> = ({
  onSelectGalleryItem,
  currentUrl,
  isOpen,
  onClose,
}) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('mythology');

  if (!isOpen) return null;

  const currentCategory = GALLERY_CATEGORIES.find(cat => cat.id === activeCategoryId) || GALLERY_CATEGORIES[0];

  return (
    <div className="absolute inset-y-0 left-0 w-96 bg-[#272822]/95 backdrop-blur-2xl border-r border-[#3e3d32] z-30 flex flex-col text-[#f8f8f2] shadow-2xl animate-in slide-in-from-left duration-300">
      {/* Header */}
      <div className="p-5 border-b border-[#3e3d32] flex justify-between items-center bg-[#1e1f1c]/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <h2 className="font-extrabold text-lg text-[#e6db74] tracking-wide">3D 精选画廊</h2>
          </div>
          <p className="text-xs text-[#75715e] mt-0.5">艺术典藏 • 沉浸式 3D 视觉探索</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-[#75715e] hover:text-[#f8f8f2] hover:bg-[#3e3d32] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex p-2 bg-[#1e1f1c]/40 border-b border-[#3e3d32] gap-1.5">
        {GALLERY_CATEGORIES.map(cat => {
          const isCatActive = cat.id === activeCategoryId;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                isCatActive
                  ? 'bg-[#a6e22e]/20 text-[#a6e22e] border border-[#a6e22e]/40 shadow-sm'
                  : 'text-[#75715e] hover:text-[#f8f8f2] hover:bg-[#3e3d32]'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Content Gallery Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-[#3e3d32]">
        {currentCategory.items.map((item, index) => {
          const isActive = currentUrl === item.url;
          return (
            <div
              key={item.id}
              onClick={() => onSelectGalleryItem(item)}
              className={`group relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-300 ${
                isActive
                  ? 'border-[#a6e22e] bg-[#a6e22e]/10 shadow-lg shadow-[#a6e22e]/10 scale-[1.02]'
                  : 'border-[#3e3d32] bg-[#1e1f1c]/50 hover:border-[#66d9ef]/60 hover:bg-[#3e3d32]/60 hover:scale-[1.01]'
              }`}
            >
              <div className="flex items-center gap-4 p-3">
                {/* Thumbnail */}
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#1e1f1c] flex-shrink-0 border border-[#3e3d32]">
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-mono text-[#e6db74] font-bold">
                    #{index + 1}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-[#f8f8f2] group-hover:text-[#66d9ef] transition-colors flex items-center justify-between">
                    <span>{item.title}</span>
                    {isActive && <span className="text-[#a6e22e] text-xs font-semibold">展示中</span>}
                  </h3>
                  <p className="text-xs text-[#75715e] mt-1 line-clamp-2 leading-relaxed font-light">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#3e3d32] bg-[#1e1f1c]/90 text-center text-xs text-[#75715e] font-medium">
        ✨ 支持在右侧控制面板自由调整 3D 立体画框厚度与光影质感
      </div>
    </div>
  );
};
