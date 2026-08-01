import type { Metadata } from 'next';
import GalleryPage from '@/components/GalleryPage';

export const metadata: Metadata = {
  title: '作品集 — 摄影日记',
  description: '浏览摄影作品，按分类筛选 — 风景、人像、街拍、旅行',
};

export default function Gallery() {
  return <GalleryPage showHero={false} />;
}
