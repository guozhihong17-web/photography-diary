import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readPhotos } from '@/lib/photos';
import { savePhotoOrder } from '@/lib/photo-order';

// PUT /api/photos/reorder — 保存照片显示顺序（需认证）
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await request.json();
  const { orderedIds } = body as { orderedIds: string[] };

  if (!orderedIds || !Array.isArray(orderedIds)) {
    return NextResponse.json({ error: '参数格式错误' }, { status: 400 });
  }

  // 保存到 /tmp + data/ + Cloudinary（持久存储）
  await savePhotoOrder(orderedIds);

  // 读取并返回排好序的照片列表
  const photos = await readPhotos();
  return NextResponse.json({ success: true, photos });
}
