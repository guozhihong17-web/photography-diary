import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { isAuthenticated } from '@/lib/auth';
import { readPhotos, writePhotos, getPhotosByCategory, getUploadsDir } from '@/lib/photos';

// GET /api/photos — 获取照片列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';
  const photos = getPhotosByCategory(category);
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
    const metadataStr = formData.get('metadata') as string || '[]';
    const metadataList = JSON.parse(metadataStr);

    const MAX_WIDTH = parseInt(process.env.IMAGE_MAX_WIDTH || '2400');
    const QUALITY = parseInt(process.env.IMAGE_QUALITY || '80');
    const uploadsDir = getUploadsDir();
    const originalsDir = path.join(uploadsDir, 'originals');
    const thumbsDir = path.join(uploadsDir, 'thumbnails');

    [uploadsDir, originalsDir, thumbsDir].forEach(d => {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });

    const photos = readPhotos();
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

      // 生成展示图
      const displayInfo = await sharp(buffer)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: QUALITY, progressive: true })
        .toFile(displayPath);

      // 生成缩略图
      await sharp(buffer)
        .resize({ width: 600, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(thumbPath);

      // 获取原图信息
      const imgMeta = await sharp(buffer).metadata();
      const originalName = file.name;

      const meta = metadataList[i] || {};
      const title = meta.title || originalName.replace(/\.[^.]+$/, '');
      const description = meta.description || '';
      const category = meta.category || 'uncategorized';

      const photo = {
        id,
        filename: displayFilename,
        thumbFilename,
        title,
        description,
        category,
        uploadedAt: new Date().toISOString(),
        width: displayInfo.width,
        height: Math.round(imgMeta.height! * (displayInfo.width / imgMeta.width!)),
        originalWidth: imgMeta.width || displayInfo.width,
        originalHeight: imgMeta.height || displayInfo.height,
        originalName,
      };

      photos.push(photo);
      newPhotos.push(photo);
    }

    writePhotos(photos);
    return NextResponse.json({ success: true, photos: newPhotos });
  } catch (err) {
    console.error('上传失败:', err);
    return NextResponse.json({ error: '上传处理失败' }, { status: 500 });
  }
}
