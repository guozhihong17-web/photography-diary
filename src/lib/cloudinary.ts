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
  metadata: { title?: string; description?: string; category?: string }
): Promise<void> {
  if (!isCloudinaryConfigured()) throw new Error('Cloudinary 未配置');

  const ctx: Record<string, string> = {};
  if (metadata.title) ctx.title = metadata.title;
  if (metadata.description) ctx.description = metadata.description;
  if (metadata.category) ctx.categories = metadata.category;

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
  };
}
