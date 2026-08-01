import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readLocalPhotosSync, writePhotos } from '@/lib/photos';
import { isCloudinaryConfigured, uploadImage } from '@/lib/cloudinary';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: 'Cloudinary 未配置' }, { status: 400 });
  }

  const photos = readLocalPhotosSync();
  const originalsDir = path.join(process.cwd(), 'public', 'uploads', 'originals');

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  const results: string[] = [];

  for (const photo of photos) {
    if (photo.publicId) {
      skipped++;
      continue;
    }

    if (!photo.filename) {
      skipped++;
      continue;
    }

    const filePath = path.join(originalsDir, photo.filename);
    if (!fs.existsSync(filePath)) {
      results.push(`❌ 文件不存在: ${photo.title}`);
      failed++;
      continue;
    }

    try {
      const buffer = fs.readFileSync(filePath);
      const result = await uploadImage(buffer, {
        title: photo.title,
        description: photo.description || '',
        category: photo.category || '',
        originalName: photo.originalName || '',
      });

      photo.publicId = result.publicId;
      results.push(`✅ ${photo.title} → ${result.publicId}`);
      migrated++;
    } catch (err: any) {
      results.push(`❌ ${photo.title}: ${err.message}`);
      failed++;
    }
  }

  writePhotos(photos);

  return NextResponse.json({
    success: true,
    summary: `迁移: ${migrated} | 跳过: ${skipped} | 失败: ${failed}`,
    results,
  });
}
