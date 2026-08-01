import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getPhotoById, updatePhoto, deletePhoto } from '@/lib/photos';

// GET /api/photos/:id — 获取单张照片
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const photo = getPhotoById(id);
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

  const result = updatePhoto(id, { title, description, category });
  if (!result) {
    return NextResponse.json({ error: '照片不存在' }, { status: 404 });
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
  const result = deletePhoto(id);
  if (!result) {
    return NextResponse.json({ error: '照片不存在' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
