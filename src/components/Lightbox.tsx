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

  const hasNav = photos.length > 1;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/96 animate-fade-in"
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

      {/* ========== Desktop 布局 — 16:9 容器 + 5:1 分栏 ========== */}
      <div className="hidden md:flex items-center justify-center w-full h-full p-8 md:p-10">
        <div className="flex w-full h-full max-h-[calc(100vh-5rem)] max-w-[calc(100vw-5rem)] aspect-[16/9] rounded-xl overflow-hidden shadow-2xl">
          {/* 左：图片区域 — 5/6 */}
          <div className="relative w-5/6 flex items-center justify-center bg-dark-950">
            {hasNav && (
              <button
                onClick={goPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-[1001] w-12 h-12 flex items-center justify-center text-2xl text-gray-400 bg-white/6 rounded-full hover:bg-white/12 hover:text-white transition-all"
                aria-label="上一张"
              >
                ‹
              </button>
            )}
            <img
              key={photo.id}
              src={getPhotoSrc(photo, 'display')}
              alt={photo.title}
              className="max-w-full max-h-full object-contain animate-image-fade-in"
            />
            {hasNav && (
              <button
                onClick={goNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-[1001] w-12 h-12 flex items-center justify-center text-2xl text-gray-400 bg-white/6 rounded-full hover:bg-white/12 hover:text-white transition-all"
                aria-label="下一张"
              >
                ›
              </button>
            )}
          </div>

          {/* 右：信息面板 — 1/6 */}
          <div className="w-1/6 flex flex-col bg-dark-900/90 backdrop-blur-sm border-l border-dark-800 min-w-[200px]">
            {/* 信息内容 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <h2 className="text-lg font-light tracking-wide leading-snug">
                {photo.title}
              </h2>

              {photo.description ? (
                <div>
                  <p className="text-[10px] text-accent-gray uppercase tracking-widest mb-2">
                    描述
                  </p>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {photo.description}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-dark-500 italic">暂无描述</p>
              )}

              <span className="inline-block px-2.5 py-1 text-[10px] text-accent-gray bg-dark-800 rounded-full border border-dark-700">
                {photo.category || '未分类'}
              </span>

              {photo.originalName && (
                <p className="text-[10px] text-dark-500 pt-1 truncate">
                  {photo.originalName}
                </p>
              )}
            </div>

            {/* 底部翻页栏 */}
            {hasNav && (
              <div className="border-t border-dark-800 px-5 py-4 flex items-center justify-between">
                <button
                  onClick={goPrev}
                  className="text-xs text-accent-gray hover:text-white transition-colors"
                >
                  ‹ 上一张
                </button>
                <span className="text-xs text-dark-500 tabular-nums">
                  {currentIndex + 1} / {photos.length}
                </span>
                <button
                  onClick={goNext}
                  className="text-xs text-accent-gray hover:text-white transition-colors"
                >
                  下一张 ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== Mobile 布局（上下堆叠） ========== */}
      <div className="flex md:hidden flex-col h-full p-4">
        {/* 图片区域 */}
        <div className="relative flex-1 flex items-center justify-center min-h-0 max-h-[58vh] rounded-xl overflow-hidden bg-dark-950">
          {hasNav && (
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-[1001] w-10 h-10 flex items-center justify-center text-xl text-gray-400 bg-white/6 rounded-full hover:bg-white/12 hover:text-white transition-all"
              aria-label="上一张"
            >
              ‹
            </button>
          )}
          <img
            key={photo.id}
            src={getPhotoSrc(photo, 'display')}
            alt={photo.title}
            className="max-w-full max-h-full object-contain animate-image-fade-in"
          />
          {hasNav && (
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-[1001] w-10 h-10 flex items-center justify-center text-xl text-gray-400 bg-white/6 rounded-full hover:bg-white/12 hover:text-white transition-all"
              aria-label="下一张"
            >
              ›
            </button>
          )}
        </div>

        {/* 信息区域 */}
        <div className="mt-3 bg-dark-900/90 backdrop-blur-sm rounded-2xl px-5 py-5 space-y-4 max-h-[38vh] overflow-y-auto">
          {/* 移动端翻页按钮 */}
          {hasNav && (
            <div className="flex items-center justify-between pb-3 border-b border-dark-800">
              <button onClick={goPrev} className="text-sm text-accent-gray hover:text-white transition-colors">
                ‹ 上一张
              </button>
              <span className="text-sm text-dark-500 tabular-nums">
                {currentIndex + 1} / {photos.length}
              </span>
              <button onClick={goNext} className="text-sm text-accent-gray hover:text-white transition-colors">
                下一张 ›
              </button>
            </div>
          )}

          <h2 className="text-lg font-light tracking-wide leading-snug">
            {photo.title}
          </h2>

          {photo.description ? (
            <div>
              <p className="text-xs text-accent-gray uppercase tracking-widest mb-1.5">
                描述
              </p>
              <p className="text-sm text-gray-300 leading-relaxed">
                {photo.description}
              </p>
            </div>
          ) : (
            <p className="text-sm text-dark-500 italic">暂无描述</p>
          )}

          <span className="inline-block px-2.5 py-1 text-xs text-accent-gray bg-dark-800 rounded-full border border-dark-700">
            {photo.category || '未分类'}
          </span>
        </div>
      </div>
    </div>
  );
}
