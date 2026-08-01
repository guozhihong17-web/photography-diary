import fs from 'fs';
import path from 'path';
import { Photo } from '@/types';
import {
  isCloudinaryConfigured,
  listCloudPhotos,
  resourceToPhoto,
} from '@/lib/cloudinary';

const STORAGE_BASE =
  process.env.STORAGE_DIR || path.join(process.cwd(), 'public');
const DATA_DIR = path.join(process.cwd(), 'data');
const PHOTOS_FILE = path.join(DATA_DIR, 'photos.json');

// 确保数据目录存在（本地开发用）
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PHOTOS_FILE)) {
    fs.writeFileSync(PHOTOS_FILE, '[]', 'utf-8');
  }
}

/** 读取本地 photos.json */
function readLocalPhotos(): Photo[] {
  try {
    ensureDataDir();
    const raw = fs.readFileSync(PHOTOS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** 写入本地 photos.json */
function writeLocalPhotos(photos: Photo[]): void {
  ensureDataDir();
  fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf-8');
}

/**
 * 读取所有照片（云端 + 本地）
 * 本地 photos.json 中的照片如果已迁移到 Cloudinary 则跳过
 */
export async function readPhotos(): Promise<Photo[]> {
  const localPhotos = readLocalPhotos();

  // 如果 Cloudinary 已配置，同时获取云端照片
  if (isCloudinaryConfigured()) {
    const resources = await listCloudPhotos();
    const cloudPhotos = resources.map((r) =>
      resourceToPhoto(r, r.public_id.replace(/^.*\//, ''))
    );

    // 已有 publicId 的本地照片在云端也会显示，去重（按 publicId）
    const localPublicIds = new Set(
      localPhotos.map((p) => p.publicId).filter(Boolean)
    );
    const newCloudPhotos = cloudPhotos.filter(
      (p) => !localPublicIds.has(p.publicId)
    );

    return [...localPhotos, ...newCloudPhotos];
  }

  return localPhotos;
}

/**
 * 读取本地照片（同步，用于不需要云端数据的场景）
 */
export function readLocalPhotosSync(): Photo[] {
  return readLocalPhotos();
}

/** 写入本地 photos.json（向后兼容旧 API） */
export function writePhotos(photos: Photo[]): void {
  writeLocalPhotos(photos);
}

export function getPhotoById(allPhotos: Photo[], id: string): Photo | undefined {
  return allPhotos.find((p) => p.id === id);
}

/** 添加照片到本地存储 */
export function addLocalPhotos(newPhotos: Photo[]): Photo[] {
  const photos = readLocalPhotos();
  photos.push(...newPhotos);
  writeLocalPhotos(photos);
  return newPhotos;
}

/** 更新本地照片信息 */
export function updateLocalPhoto(
  id: string,
  updates: Partial<Pick<Photo, 'title' | 'description' | 'category'>>
): Photo | null {
  const photos = readLocalPhotos();
  const index = photos.findIndex((p) => p.id === id);
  if (index === -1) return null;

  if (updates.title !== undefined) photos[index].title = updates.title;
  if (updates.description !== undefined)
    photos[index].description = updates.description;
  if (updates.category !== undefined) photos[index].category = updates.category;

  writeLocalPhotos(photos);
  return photos[index];
}

/** 删除本地照片（含文件） */
export function deleteLocalPhoto(id: string): Photo | null {
  const photos = readLocalPhotos();
  const index = photos.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const [deleted] = photos.splice(index, 1);
  writeLocalPhotos(photos);

  if (deleted.thumbFilename || deleted.filename) {
    const uploadsDir = path.join(STORAGE_BASE, 'uploads');
    if (deleted.filename) {
      const originalPath = path.join(uploadsDir, 'originals', deleted.filename);
      try {
        if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
      } catch {}
    }
    if (deleted.thumbFilename) {
      const thumbPath = path.join(uploadsDir, 'thumbnails', deleted.thumbFilename);
      try {
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      } catch {}
    }
  }

  return deleted;
}

export async function getCategories(): Promise<string[]> {
  const photos = await readPhotos();
  return [...new Set(photos.map((p) => p.category).filter(Boolean))];
}

export async function getPhotosByCategory(
  category: string
): Promise<Photo[]> {
  const photos = await readPhotos();
  const filtered =
    !category || category === 'all'
      ? photos
      : photos.filter((p) => p.category === category);
  return filtered.sort(
    (a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}

export function getUploadsDir(): string {
  return path.join(STORAGE_BASE, 'uploads');
}
