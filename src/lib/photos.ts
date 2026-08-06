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

/** 安全写入（Vercel 文件系统只读时记录日志但不中断请求） */
function safeWrite(fn: () => void): void {
  try {
    fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[safeWrite] 写入失败（文件系统只读？）:', msg);
  }
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    safeWrite(() => fs.mkdirSync(DATA_DIR, { recursive: true }));
  }
  if (!fs.existsSync(PHOTOS_FILE)) {
    safeWrite(() => fs.writeFileSync(PHOTOS_FILE, '[]', 'utf-8'));
  }
}

function readLocalPhotos(): Photo[] {
  try {
    ensureDataDir();
    const raw = fs.readFileSync(PHOTOS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocalPhotos(photos: Photo[]): void {
  safeWrite(() => {
    ensureDataDir();
    fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf-8');
  });
}

/**
 * 读取所有照片（云端 + 本地）
 * Cloudinary 配置时以云端为准：已从云端删除的照片不会出现在列表中
 */
export async function readPhotos(): Promise<Photo[]> {
  const localPhotos = readLocalPhotos();

  if (isCloudinaryConfigured()) {
    const resources = await listCloudPhotos();
    const cloudPhotos = resources.map((r) =>
      resourceToPhoto(r, r.public_id.replace(/^.*\//, ''))
    );

    const cloudPublicIds = new Set(cloudPhotos.map((p) => p.publicId));

    // 本地照片：只保留未迁移的，或云端仍然存在的（已删除的过滤掉）
    const validLocalPhotos = localPhotos.filter((p) => {
      if (!p.publicId) return true;
      return cloudPublicIds.has(p.publicId);
    });

    // 去重
    const localPublicIds = new Set(
      validLocalPhotos.map((p) => p.publicId).filter(Boolean)
    );
    const newCloudPhotos = cloudPhotos.filter(
      (p) => !localPublicIds.has(p.publicId)
    );

    return [...validLocalPhotos, ...newCloudPhotos];
  }

  return localPhotos;
}

export function readLocalPhotosSync(): Photo[] {
  return readLocalPhotos();
}

export function writePhotos(photos: Photo[]): void {
  writeLocalPhotos(photos);
}

export function getPhotoById(allPhotos: Photo[], id: string): Photo | undefined {
  return allPhotos.find((p) => p.id === id);
}

export function addLocalPhotos(newPhotos: Photo[]): Photo[] {
  const photos = readLocalPhotos();
  photos.push(...newPhotos);
  writeLocalPhotos(photos);
  return newPhotos;
}

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

export function deleteLocalPhoto(id: string): Photo | null {
  const photos = readLocalPhotos();
  const index = photos.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const [deleted] = photos.splice(index, 1);
  writeLocalPhotos(photos);

  // 删除本地文件（Vercel 上文件系统只读，静默跳过）
  if (deleted.thumbFilename || deleted.filename) {
    const uploadsDir = path.join(STORAGE_BASE, 'uploads');
    if (deleted.filename) {
      try {
        const p = path.join(uploadsDir, 'originals', deleted.filename);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {}
    }
    if (deleted.thumbFilename) {
      try {
        const p = path.join(uploadsDir, 'thumbnails', deleted.thumbFilename);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {}
    }
  }

  return deleted;
}

export async function getCategories(): Promise<string[]> {
  const photos = await readPhotos();
  return [...new Set(photos.map((p) => p.category).filter(Boolean))];
}

export async function getPhotosByCategory(category: string): Promise<Photo[]> {
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
