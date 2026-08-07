/**
 * Cloudinary 服务端 API — 仅用于 API Routes / Server Components
 * 客户端组件请使用 cloudinary-url.ts 中的工具函数
 */
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (CLOUD_NAME && API_KEY && API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
  });
}

export const FOLDER = 'photography-diary';

export function isCloudinaryConfigured(): boolean {
  return !!(CLOUD_NAME && API_KEY && API_SECRET);
}

// ==================== Upload / Delete / Update ====================

interface UploadParams {
  title: string;
  description: string;
  category: string;
  originalName: string;
  sortOrder?: number;
}

interface UploadResult {
  publicId: string;
  width: number;
  height: number;
}

export function uploadImage(
  buffer: Buffer,
  metadata: UploadParams
): Promise<UploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary 未配置');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: FOLDER,
        context: [
          `title=${metadata.title}`,
          `description=${metadata.description}`,
          `categories=${metadata.category}`,
          `originalName=${metadata.originalName}`,
          `sortOrder=${metadata.sortOrder ?? 0}`,
        ].join('|'),
        resource_type: 'image',
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          reject(error || new Error('上传失败'));
        } else {
          resolve({
            publicId: result.public_id,
            width: result.width,
            height: result.height,
          });
        }
      }
    );
    uploadStream.end(buffer);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured()) throw new Error('Cloudinary 未配置');
  await cloudinary.uploader.destroy(publicId);
}

export async function updateImageContext(
  publicId: string,
  metadata: { title?: string; description?: string; category?: string; sortOrder?: number }
): Promise<void> {
  if (!isCloudinaryConfigured()) throw new Error('Cloudinary 未配置');

  const ctx: Record<string, string> = {};
  if (metadata.title) ctx.title = metadata.title;
  if (metadata.description) ctx.description = metadata.description;
  if (metadata.category) ctx.categories = metadata.category;
  if (metadata.sortOrder !== undefined) ctx.sortOrder = String(metadata.sortOrder);

  const existing = await cloudinary.api.resource(publicId, { context: true });
  const merged = { ...(existing?.context?.custom || {}), ...ctx };
  const contextStr = Object.entries(merged)
    .map(([k, v]) => `${k}=${v}`)
    .join('|');

  await cloudinary.api.update(publicId, { context: contextStr });
}

// ==================== List / Convert ====================

interface CloudinaryResource {
  public_id: string;
  context?: {
    custom?: {
      title?: string;
      description?: string;
      category?: string;
      categories?: string;
      originalName?: string;
      sortOrder?: string;
    };
  };
  width: number;
  height: number;
  created_at: string;
}

export async function listCloudPhotos(): Promise<CloudinaryResource[]> {
  if (!isCloudinaryConfigured()) return [];

  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: FOLDER,
      max_results: 500,
      context: true,
    });
    return result.resources as CloudinaryResource[];
  } catch {
    return [];
  }
}

// ==================== Photo Order Raw JSON (durable storage) ====================

const ORDER_PUBLIC_ID = `${FOLDER}/photo-order`;

/** 上传照片排序到 Cloudinary（raw JSON 文件，持久存储） */
export async function uploadPhotoOrder(order: string[]): Promise<void> {
  if (!isCloudinaryConfigured()) return;

  const jsonBuffer = Buffer.from(JSON.stringify(order), 'utf-8');

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: ORDER_PUBLIC_ID,
        resource_type: 'raw',
        overwrite: true,
        invalidate: true, // 清除 CDN 缓存，确保下次读取拿到最新
      },
      (error) => {
        if (error) reject(error);
        else resolve();
      }
    );
    uploadStream.end(jsonBuffer);
  });
}

/** 从 Cloudinary 读取照片排序，不存在则返回 null */
export async function fetchPhotoOrder(): Promise<string[] | null> {
  if (!isCloudinaryConfigured()) return null;

  try {
    // 先检查资源是否存在
    await cloudinary.api.resource(ORDER_PUBLIC_ID, { resource_type: 'raw' });
  } catch {
    return null; // 资源不存在
  }

  try {
    // 从 CDN URL 下载 JSON
    const url = cloudinary.url(ORDER_PUBLIC_ID, {
      resource_type: 'raw',
      type: 'upload',
      // 不加 version 参数，Cloudinary 会返回最新版本
    });
    const res = await fetch(url);
    if (!res.ok) return null;
    const order = await res.json();
    return Array.isArray(order) ? order : null;
  } catch {
    return null;
  }
}

export function resourceToPhoto(
  resource: CloudinaryResource,
  id: string
): import('@/types').Photo {
  const ctx = resource.context?.custom || {};

  // 兼容新旧格式：categories（逗号分隔）优先，category 单值回退
  const rawCategories = ctx.categories || ctx.category || '';
  const categories = rawCategories
    ? rawCategories.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  const sortOrderRaw = ctx.sortOrder;
  const sortOrder = sortOrderRaw !== undefined ? parseInt(sortOrderRaw, 10) : undefined;

  return {
    id,
    publicId: resource.public_id,
    title: ctx.title || resource.public_id.split('/').pop() || '',
    description: ctx.description || '',
    category: categories[0] || '未分类',
    categories: categories.length > 0 ? categories : ['未分类'],
    originalName: ctx.originalName || '',
    width: resource.width,
    height: resource.height,
    uploadedAt: resource.created_at,
    sortOrder: isNaN(sortOrder as number) ? undefined : sortOrder,
  };
}
