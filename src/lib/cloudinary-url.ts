/**
 * Cloudinary URL 构建工具 — 可安全用于客户端和服务端
 * 无需 Cloudinary SDK，只用 cloud name 拼 URL
 */

export function getCloudName(): string {
  // NEXT_PUBLIC_ 前缀的变量会被 Next.js 内联到客户端代码
  return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
}

export function isCloudNameSet(): boolean {
  return !!getCloudName();
}

/**
 * 根据 publicId 构建 Cloudinary 图片 URL
 */
export function getPhotoUrl(
  publicId: string,
  variant: 'display' | 'thumb' = 'display'
): string {
  const cloudName = getCloudName();
  const w = variant === 'thumb' ? 600 : 2400;
  return `https://res.cloudinary.com/${cloudName}/image/upload/q_auto,f_auto,w_${w}/${publicId}`;
}

/**
 * 获取 Photo 对象的图片 src
 * 自动判断 Cloudinary / 本地文件路径
 */
export function getPhotoSrc(
  photo: {
    publicId?: string;
    filename?: string;
    thumbFilename?: string;
  },
  variant: 'display' | 'thumb' = 'display'
): string {
  if (photo.publicId && isCloudNameSet()) {
    return getPhotoUrl(photo.publicId, variant);
  }
  if (variant === 'thumb' && photo.thumbFilename) {
    return `/uploads/thumbnails/${photo.thumbFilename}`;
  }
  if (photo.filename) {
    return `/uploads/originals/${photo.filename}`;
  }
  return '';
}
