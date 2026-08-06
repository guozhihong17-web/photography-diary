'use client';

import Link from 'next/link';

/**
 * 着陆页 — 全屏背景 + 居中 Explore 按钮
 * 背景图：罗弗敦群岛亨宁斯韦尔晚霞全景
 * 替换图片：将新图片放入 public/bg.png 即可
 */
const BACKGROUND_IMAGE_URL = '/bg.png';

export default function LandingPage() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-dark-950">
      {/* 背景图层 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${BACKGROUND_IMAGE_URL}')` }}
      />

      {/* 暗色叠加层 — 保证按钮可读性 */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />

      {/* 中心内容 */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 gap-8">
        <h1 className="text-5xl md:text-7xl font-serif font-light tracking-[0.15em] text-white text-center">
          摄影日记
        </h1>
        <p className="text-sm md:text-base text-white/50 font-light tracking-[0.3em] uppercase -mt-4">
          Photography Diary
        </p>
        <Link
          href="/gallery"
          className="group relative inline-flex items-center gap-3 px-10 py-4 text-sm font-light tracking-[0.25em] text-white/90 uppercase border border-white/30 backdrop-blur-sm transition-all duration-500 hover:bg-white/10 hover:border-white/60 hover:px-12 hover:text-white"
        >
          <span className="transition-transform duration-500 group-hover:-translate-x-1">
            Explore My Work
          </span>
          <span className="text-white/50 transition-transform duration-500 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
