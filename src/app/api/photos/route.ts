import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { isAuthenticated } from '@/lib/auth';
import {
  readPhotos,
  addLocalPhotos,
  getPhotosByCategory,
  getUploadsDir,
} from '@/lib/photos';
import { isCloudinaryConfigured, uploadImage } from '@/lib/cloudinary';

// GET /api/photos — 获取照片列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';
  const photos = await getPhotosByCategory(category);
  return NextResponse.json(photos);
}

// POST /api/photos — 上传照片（需认证）
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];
    const metadataStr = (formData.get('metadata') as string) || '[]';
    const metadataList = JSON.parse(metadataStr);

    const useCloudinary = isCloudinaryConfigured();

    if (useCloudinary) {
      // ====== Cloudinary 上传路径 ======
      const newPhotos = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!(file instanceof File)) continue;

        const buffer = Buffer.from(await file.arrayBuffer());
        const id = uuidv4();
        const meta = metadataList[i] || {};
        const originalName = file.name;
        const title = meta.title || originalName.replace(/\.[^.]+$/, '');
        const description = meta.description || '';
        const category = meta.category || '未分类';

        const result = await uploadImage(buffer, {
          title,
          description,
          category,
          originalName,
        });

        const photo = {
          id,
          publicId: result.publicId,
          title,
          description,
          category,
          uploadedAt: new Date().toISOString(),
          width: result.width,
          height: result.height,
          originalWidth: result.width,
          originalHeight: result.height,
          originalName,
        };

        addLocalPhotos([photo]);
        newPhotos.push(photo);
      }

      return NextResponse.json({ success: true, photos: newPhotos });
    }

    // ====== 本地文件系统上传路径（兼容 Railway / 本地开发）======
    const MAX_WIDTH = parseInt(process.env.IMAGE_MAX_WIDTH || '2400');
    const QUALITY = parseInt(process.env.IMAGE_QUALITY || '80');
    const uploadsDir = getUploadsDir();
    const originalsDir = path.join(uploadsDir, 'originals');
    const thumbsDir = path.join(uploadsDir, 'thumbnails');

    [uploadsDir, originalsDir, thumbsDir].forEach((d) => {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });

    const allPhotos = await readPhotos();
    const newPhotos = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!(file instanceof File)) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const id = uuidv4();
      const displayFilename = `display_${id}.jpg`;
      const thumbFilename = `thumb_${id}.jpg`;
      const displayPath = path.join(originalsDir, displayFilename);
      const thumbPath = path.join(thumbsDir, thumbFilename);

      const displayInfo = await sharp(buffer)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: QUALITY, progressive: true })
        .toFile(displayPath);

      await sharp(buffer)
        .resize({ width: 600, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(thumbPath);

      const imgMeta = await sharp(buffer).metadata();
      const originalName = file.name;
      const meta = metadataList[i] || {};
      const title = meta.title || originalName.replace(/\.[^.]+$/, '');
      const description = meta.description || '';
      const category = meta.category || '未分类';

      const photo = {
        id,
        filename: displayFilename,
        thumbFilename,
        title,
        description,
        category,
        uploadedAt: new Date().toISOString(),
        width: displayInfo.width,
        height: Math.round(
          imgMeta.height! * (displayInfo.width / imgMeta.width!)
        ),
        originalWidth: imgMeta.width || displayInfo.width,
        originalHeight: imgMeta.height || displayInfo.height,
        originalName,
      };

      allPhotos.push(photo);
      newPhotos.push(photo);
    }

    addLocalPhotos(newPhotos);
    return NextResponse.json({ success: true, photos: newPhotos });
  } catch (err) {
    console.error('上传失败:', err);
    return NextResponse.json({ error: '上传处理失败' }, { status: 500 });
  }
}
