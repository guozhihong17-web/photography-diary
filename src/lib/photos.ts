import fs from 'fs';
import path from 'path';
import { Photo } from '@/types';

// STORAGE_BASE 默认指向 public/，让 Next.js 自动提供静态文件服务
const STORAGE_BASE = process.env.STORAGE_DIR || path.join(process.cwd(), 'public');
const DATA_DIR = path.join(process.cwd(), 'data');  // 数据文件单独存放
const PHOTOS_FILE = path.join(DATA_DIR, 'photos.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PHOTOS_FILE)) {
  fs.writeFileSync(PHOTOS_FILE, '[]', 'utf-8');
}

export function readPhotos(): Photo[] {
  try {
    const raw = fs.readFileSync(PHOTOS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function writePhotos(photos: Photo[]): void {
  fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf-8');
}

export function getPhotoById(id: string): Photo | undefined {
  return readPhotos().find(p => p.id === id);
}

export function addPhotos(newPhotos: Photo[]): Photo[] {
  const photos = readPhotos();
  photos.push(...newPhotos);
  writePhotos(photos);
  return newPhotos;
}

export function updatePhoto(id: string, updates: Partial<Pick<Photo, 'title' | 'description' | 'category'>>): Photo | null {
  const photos = readPhotos();
  const index = photos.findIndex(p => p.id === id);
  if (index === -1) return null;

  if (updates.title !== undefined) photos[index].title = updates.title;
  if (updates.description !== undefined) photos[index].description = updates.description;
  if (updates.category !== undefined) photos[index].category = updates.category;

  writePhotos(photos);
  return photos[index];
}

export function deletePhoto(id: string): Photo | null {
  const photos = readPhotos();
  const index = photos.findIndex(p => p.id === id);
  if (index === -1) return null;

  const [deleted] = photos.splice(index, 1);
  writePhotos(photos);

  // 删除文件
  const uploadsDir = path.join(STORAGE_BASE, 'uploads');
  const originalPath = path.join(uploadsDir, 'originals', deleted.filename);
  const thumbPath = path.join(uploadsDir, 'thumbnails', deleted.thumbFilename);
  try { if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath); } catch {}
  try { if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath); } catch {}

  return deleted;
}

export function getCategories(): string[] {
  const photos = readPhotos();
  return [...new Set(photos.map(p => p.category).filter(Boolean))];
}

export function getPhotosByCategory(category: string): Photo[] {
  const photos = readPhotos();
  if (!category || category === 'all') {
    return photos.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }
  return photos
    .filter(p => p.category === category)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export function getUploadsDir(): string {
  return path.join(STORAGE_BASE, 'uploads');
}
