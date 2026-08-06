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

  // 共享的导航按钮
  const NavArrow = ({ direction, onClick }: { direction: 'prev' | 'next'; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="w-10 h-10 flex items-center justify-center text-xl text-gray-400 bg-white/6 rounded-full hover:bg-white/12 hover:text-white transition-all"
      aria-label={direction === 'prev' ? '上一张' : '下一张'}
    >
      {direction === 'prev' ? '‹' : '›'}
    </button>
  );

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

      {/* ========== Desktop 布局（左右黄金分割） ========== */}
      <div className="hidden md:flex w-full h-full">
        {/* 左：图片区域 — 61.8% */}
        <div className="relative w-[61.8%] flex items-center justify-center bg-dark-950/60">
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
            className="max-w-full max-h-[90vh] object-contain rounded-sm animate-image-fade-in"
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

        {/* 右：信息面板 — 38.2% */}
        <div className="w-[38.2%] flex flex-col bg-dark-900/80 backdrop-blur-sm border-l border-dark-800">
          {/* 信息内容 */}
          <div className="flex-1 overflow-y-auto p-10 space-y-6">
            <h2 className="text-2xl font-light tracking-wide leading-snug">
              {photo.title}
            </h2>

            {photo.description ? (
              <div>
                <p className="text-xs text-accent-gray uppercase tracking-widest mb-3">
                  描述
                </p>
                <p className="text-base text-gray-300 leading-relaxed">
                  {photo.description}
                </p>
              </div>
            ) : (
              <p className="text-sm text-dark-500 italic">暂无描述</p>
            )}

            <div>
              <p className="text-xs text-accent-gray uppercase tracking-widest mb-2">
                分类
              </p>
              <span className="inline-block px-3 py-1 text-xs text-accent-gray bg-dark-800 rounded-full border border-dark-700">
                {photo.category || '未分类'}
              </span>
            </div>

            {photo.originalName && (
              <p className="text-xs text-dark-500 pt-2">
                文件: {photo.originalName}
              </p>
            )}
          </div>

          {/* 底部翻页栏 */}
          {hasNav && (
            <div className="border-t border-dark-800 px-10 py-5 flex items-center justify-between">
              <button
                onClick={goPrev}
                className="text-sm text-accent-gray hover:text-white transition-colors tracking-wider"
              >
                ‹ 上一张
              </button>
              <span className="text-sm text-dark-500 tracking-widest tabular-nums">
                {currentIndex + 1} / {photos.length}
              </span>
              <button
                onClick={goNext}
                className="text-sm text-accent-gray hover:text-white transition-colors tracking-wider"
              >
                下一张 ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========== Mobile 布局（上下堆叠） ========== */}
      <div className="flex md:hidden flex-col h-full">
        {/* 图片区域 */}
        <div className="relative flex-1 flex items-center justify-center min-h-0 max-h-[58vh]">
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
        <div className="bg-dark-900/90 backdrop-blur-sm rounded-t-2xl px-6 py-6 max-h-[42vh] overflow-y-auto space-y-4">
          {/* 移动端翻页按钮（图片下方） */}
          {hasNav && (
            <div className="flex items-center justify-between pb-4 border-b border-dark-800">
              <button onClick={goPrev} className="text-sm text-accent-gray hover:text-white transition-colors">
                ‹ 上一张
              </button>
              <span className="text-sm text-dark-500 tracking-widest tabular-nums">
                {currentIndex + 1} / {photos.length}
              </span>
              <button onClick={goNext} className="text-sm text-accent-gray hover:text-white transition-colors">
                下一张 ›
              </button>
            </div>
          )}

          <h2 className="text-xl font-light tracking-wide leading-snug">
            {photo.title}
          </h2>

          {photo.description ? (
            <div>
              <p className="text-xs text-accent-gray uppercase tracking-widest mb-2">
                描述
              </p>
              <p className="text-sm text-gray-300 leading-relaxed">
                {photo.description}
              </p>
            </div>
          ) : (
            <p className="text-sm text-dark-500 italic">暂无描述</p>
          )}

          <span className="inline-block px-3 py-1 text-xs text-accent-gray bg-dark-800 rounded-full border border-dark-700">
            {photo.category || '未分类'}
          </span>
        </div>
      </div>
    </div>
  );
}
