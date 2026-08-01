'use client';

import { Photo } from '@/types';
import { getPhotoSrc } from '@/lib/cloudinary-url';
import { useState, useEffect, useCallback } from 'react';

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ photos, currentIndex, onClose, onNavigate }: LightboxProps) {
  const [touchStart, setTouchStart] = useState(0);

  const goNext = useCallback(() => {
    if (photos.length > 0) onNavigate((currentIndex + 1) % photos.length);
  }, [currentIndex, photos.length, onNavigate]);

  const goPrev = useCallback(() => {
    if (photos.length > 0) onNavigate((currentIndex - 1 + photos.length) % photos.length);
  }, [currentIndex, photos.length, onNavigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goPrev, goNext]);

  // 预加载相邻图片
  useEffect(() => {
    const prev = photos[(currentIndex - 1 + photos.length) % photos.length];
    const next = photos[(currentIndex + 1) % photos.length];
    [prev, next].forEach(p => {
      if (p) {
        const img = new Image();
        img.src = getPhotoSrc(p, 'display');
      }
    });
  }, [currentIndex, photos]);

  const photo = photos[currentIndex];
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/96 flex items-center justify-center animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const delta = touchStart - e.changedTouches[0].clientX;
        if (Math.abs(delta) > 50) delta > 0 ? goNext() : goPrev();
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="fixed top-6 right-6 z-[1002] w-12 h-12 flex items-center justify-center text-2xl text-gray-400 bg-white/8 rounded-full hover:bg-white/15 hover:text-white transition-all"
        aria-label="关闭"
      >
        ✕
      </button>

      {/* 左箭头 */}
      <button
        onClick={goPrev}
        className="fixed top-1/2 -translate-y-1/2 left-4 md:left-6 z-[1001] w-10 md:w-14 h-10 md:h-14 flex items-center justify-center text-2xl md:text-3xl text-gray-400 bg-white/6 rounded-full hover:bg-white/12 hover:text-white transition-all"
        aria-label="上一张"
      >
        ‹
      </button>

      {/* 右箭头 */}
      <button
        onClick={goNext}
        className="fixed top-1/2 -translate-y-1/2 right-4 md:right-6 z-[1001] w-10 md:w-14 h-10 md:h-14 flex items-center justify-center text-2xl md:text-3xl text-gray-400 bg-white/6 rounded-full hover:bg-white/12 hover:text-white transition-all"
        aria-label="下一张"
      >
        ›
      </button>

      {/* 图片 */}
      <div className="relative max-w-[90vw] max-h-[85vh]">
        <img
          src={getPhotoSrc(photo, 'display')}
          alt={photo.title}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-sm"
        />
        {/* 标题 */}
        <div className="absolute -bottom-12 left-0 right-0 text-center">
          <h3 className="text-lg font-medium">{photo.title}</h3>
          {photo.description && (
            <p className="text-sm text-accent-gray mt-1">{photo.description}</p>
          )}
        </div>
      </div>

      {/* 计数器 */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 text-sm text-dark-500 tracking-wider">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
}
