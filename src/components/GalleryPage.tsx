'use client';

import { Photo } from '@/types';
import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import PhotoCard from '@/components/PhotoCard';
import Lightbox from '@/components/Lightbox';
import Footer from '@/components/Footer';

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  useEffect(() => {
    fetch('/api/photos')
      .then(res => res.json())
      .then(data => { setPhotos(data); setLoading(false); })
      .catch(() => setLoading(false));

    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(() => {});
  }, []);

  const filteredPhotos = useMemo(() => {
    if (activeCategory === 'all') return photos;
    return photos.filter(p => p.category === activeCategory);
  }, [photos, activeCategory]);

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      <Header
        rightContent={
          <a href="/admin/login" className="text-xs text-dark-500 hover:text-white transition-colors">管理</a>
        }
      />

      <Hero />

      {/* 分类筛选 */}
      <nav className="flex justify-center flex-wrap gap-2 px-6 pb-10">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-5 py-2 rounded-full text-sm transition-all cursor-pointer border ${
            activeCategory === 'all'
              ? 'bg-white text-dark-950 border-white'
              : 'bg-dark-900 text-accent-gray border-dark-800 hover:text-white hover:border-dark-600'
          }`}
        >
          全部
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 rounded-full text-sm transition-all cursor-pointer border ${
              activeCategory === cat
                ? 'bg-white text-dark-950 border-white'
                : 'bg-dark-900 text-accent-gray border-dark-800 hover:text-white hover:border-dark-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </nav>

      {/* 画廊 */}
      <main className="max-w-[1400px] mx-auto px-4 pb-20">
        {loading ? (
          <div className="text-center py-20 text-dark-500">
            <div className="w-8 h-8 border-2 border-dark-600 border-t-white rounded-full animate-spin mx-auto mb-3" />
            <p>加载中...</p>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-20 text-dark-500">
            <div className="text-6xl mb-4 opacity-30">📸</div>
            <h2 className="text-2xl font-light mb-2">暂无作品</h2>
            <p>精彩的作品即将上线，敬请期待</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
            {filteredPhotos.map(photo => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onClick={() => {
                  const idx = filteredPhotos.findIndex(p => p.id === photo.id);
                  setLightboxIndex(idx);
                }}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* 灯箱 */}
      {lightboxIndex >= 0 && (
        <Lightbox
          photos={filteredPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
