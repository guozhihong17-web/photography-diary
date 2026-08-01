'use client';

import Link from 'next/link';

/**
 * 着陆页 — 全屏背景 + 居中 Explore 按钮
 * 背景图：挪威罗弗敦群岛晚霞全景
 *
 * 替换背景图：修改下方 BACKGROUND_IMAGE_URL，或放置本地图片到 /public/bg.jpg
 * 然后改为 BACKGROUND_IMAGE_URL = '/bg.jpg'
 */
const BACKGROUND_IMAGE_URL =
  'https://images.unsplash.com/photo-1520769669658-f07657f5a307?auto=format&fit=crop&w=1920&q=80';

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
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
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
