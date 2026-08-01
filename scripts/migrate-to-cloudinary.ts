/**
 * 迁移脚本：将本地 public/uploads/ 中的照片上传到 Cloudinary
 *
 * 使用方式：
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/migrate-to-cloudinary.ts
 *
 * 前置条件：.env 中已配置 CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

// 加载 .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('❌ 请先在 .env 中配置 CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

const FOLDER = 'photography-diary';
const PHOTOS_FILE = path.join(__dirname, '..', 'data', 'photos.json');
const ORIGINALS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'originals');

interface Photo {
  id: string;
  publicId?: string;
  filename?: string;
  thumbFilename?: string;
  title: string;
  description: string;
  category: string;
  uploadedAt: string;
  width: number;
  height: number;
  originalName: string;
}

async function main() {
  if (!fs.existsSync(PHOTOS_FILE)) {
    console.error('❌ data/photos.json 不存在');
    process.exit(1);
  }

  const photos: Photo[] = JSON.parse(fs.readFileSync(PHOTOS_FILE, 'utf-8'));
  console.log(`📸 共 ${photos.length} 张照片待处理\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const photo of photos) {
    // 已有 publicId 的照片跳过
    if (photo.publicId) {
      console.log(`  ⏭️  跳过: ${photo.title} (已有 publicId)`);
      skipped++;
      continue;
    }

    if (!photo.filename) {
      console.log(`  ⚠️  跳过: ${photo.title} (无 filename)`);
      skipped++;
      continue;
    }

    const filePath = path.join(ORIGINALS_DIR, photo.filename);
    if (!fs.existsSync(filePath)) {
      console.log(`  ❌ 文件不存在: ${photo.filename}`);
      failed++;
      continue;
    }

    try {
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload(
          filePath,
          {
            folder: FOLDER,
            context: [
              `title=${photo.title}`,
              `description=${photo.description || ''}`,
              `category=${photo.category || ''}`,
              `originalName=${photo.originalName || ''}`,
            ].join('|'),
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
      });

      photo.publicId = result.public_id;
      // 清除本地文件引用（可选，保留向后兼容）
      // photo.filename = undefined;
      // photo.thumbFilename = undefined;

      console.log(`  ✅ 迁移: ${photo.title} → ${result.public_id} (${result.width}x${result.height})`);
      migrated++;
    } catch (err: any) {
      console.log(`  ❌ 上传失败: ${photo.title} — ${err.message}`);
      failed++;
    }
  }

  // 保存更新后的 photos.json
  fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf-8');
  console.log(`\n📝 已更新 data/photos.json`);
  console.log(`   迁移: ${migrated} | 跳过: ${skipped} | 失败: ${failed}`);
}

main().catch(console.error);
