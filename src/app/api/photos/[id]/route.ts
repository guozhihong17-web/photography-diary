import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readPhotos, deleteLocalPhoto, updateLocalPhoto } from '@/lib/photos';
import { getPhotoById } from '@/lib/photos';
import {
  isCloudinaryConfigured,
  deleteImage,
  updateImageContext,
} from '@/lib/cloudinary';

// GET /api/photos/:id — 获取单张照片
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const photos = await readPhotos();
  const photo = getPhotoById(photos, id);
  if (!photo) {
    return NextResponse.json({ error: '照片不存在' }, { status: 404 });
  }
  return NextResponse.json(photo);
}

// PUT /api/photos/:id — 更新照片信息（需认证）
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const { title, description, category } = body;

  const photos = await readPhotos();
  const photo = getPhotoById(photos, id);
  if (!photo) {
    return NextResponse.json({ error: '照片不存在' }, { status: 404 });
  }

  // 云端照片 → 更新 Cloudinary context
  if (photo.publicId && isCloudinaryConfigured()) {
    await updateImageContext(photo.publicId, { title, description, category });
  }

  // 同时更新本地记录
  const result = updateLocalPhoto(id, { title, description, category });
  if (!result) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true, photo: result });
}

// DELETE /api/photos/:id — 删除照片（需认证）
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { id } = await context.params;
  const photos = await readPhotos();
  const photo = getPhotoById(photos, id);
  if (!photo) {
    return NextResponse.json({ error: '照片不存在' }, { status: 404 });
  }

  // 云端照片 → 从 Cloudinary 删除
  if (photo.publicId && isCloudinaryConfigured()) {
    await deleteImage(photo.publicId).catch((err) =>
      console.error('Cloudinary 删除失败:', err)
    );
  }

  // 同时删除本地记录（和文件，如果存在）
  deleteLocalPhoto(id);

  return NextResponse.json({ success: true });
}
