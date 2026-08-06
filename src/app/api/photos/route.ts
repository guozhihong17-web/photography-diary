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
import { PhotoExif } from '@/types';

/** 从图片 buffer 提取 EXIF（相机型号、光圈、快门、ISO、焦距） */
async function extractExif(buffer: Buffer): Promise<PhotoExif | undefined> {
  try {
    // 动态导入 exifr（ESM 兼容）
    const exifr = await import('exifr');
    const data = await exifr.parse(buffer, {
      pick: ['Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime', 'ISO', 'FocalLength', 'DateTimeOriginal'],
    });
    if (!data) return undefined;

    const exif: PhotoExif = {};

    // 相机型号
    if (data.Model) {
      exif.camera = data.Make ? `${data.Make} ${data.Model}`.trim() : data.Model;
    }

    // 镜头
    if (data.LensModel) exif.lens = data.LensModel;

    // 光圈
    if (data.FNumber) {
      const f = typeof data.FNumber === 'number' ? data.FNumber : parseFloat(data.FNumber);
      exif.aperture = `f/${f.toFixed(1).replace(/\.0$/, '')}`;
    }

    // 快门
    if (data.ExposureTime !== undefined) {
      const et = data.ExposureTime;
      if (et >= 1) {
        exif.shutter = `${et}s`;
      } else {
        const denom = Math.round(1 / et);
        exif.shutter = `1/${denom}s`;
      }
    }

    // ISO
    if (data.ISO !== undefined) exif.iso = data.ISO;

    // 焦距
    if (data.FocalLength) {
      const fl = typeof data.FocalLength === 'number'
        ? data.FocalLength
        : parseFloat(data.FocalLength);
      exif.focalLength = `${Math.round(fl)}mm`;
    }

    // 拍摄时间
    if (data.DateTimeOriginal) {
      exif.takenAt = data.DateTimeOriginal instanceof Date
        ? data.DateTimeOriginal.toISOString()
        : String(data.DateTimeOriginal);
    }

    // 只有提取到了至少两个字段才返回
    const keys = Object.keys(exif).filter(k => (exif as Record<string, unknown>)[k] != null);
    return keys.length >= 1 ? exif : undefined;
  } catch {
    return undefined;
  }
}

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
      // ====== Cloudinary 上传路径（先 sharp 压缩再上传，减少体积加速）======
      const MAX_WIDTH = parseInt(process.env.IMAGE_MAX_WIDTH || '2400');
      const QUALITY = parseInt(process.env.IMAGE_QUALITY || '80');
      const newPhotos = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!(file instanceof File)) continue;

        const rawBuffer = Buffer.from(await file.arrayBuffer());
        const id = uuidv4();
        const meta = metadataList[i] || {};
        const originalName = file.name;
        const title = meta.title || originalName.replace(/\.[^.]+$/, '');
        const description = meta.description || '';
        const category = meta.category || '未分类';

        // 从原始文件提取 EXIF
        const exif = await extractExif(rawBuffer);

        // 先用 sharp 压缩，大幅减少上传体积
        const compressedBuffer = await sharp(rawBuffer)
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .jpeg({ quality: QUALITY, progressive: true })
          .toBuffer();

        const imgMeta = await sharp(compressedBuffer).metadata();

        const result = await uploadImage(compressedBuffer, {
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
          width: result.width || imgMeta.width || 0,
          height: result.height || imgMeta.height || 0,
          originalWidth: imgMeta.width || result.width || 0,
          originalHeight: imgMeta.height || result.height || 0,
          originalName,
          exif,
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

      // 从原始文件提取 EXIF
      const exif = await extractExif(buffer);

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
        exif,
      };

      allPhotos.push(photo);
      newPhotos.push(photo);
    }

    addLocalPhotos(newPhotos);
    return NextResponse.json({ success: true, photos: newPhotos });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('上传失败:', message, err);
    return NextResponse.json(
      { error: `上传处理失败: ${message}` },
      { status: 500 }
    );
  }
}
