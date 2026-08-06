import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readPhotos, updateLocalPhotosOrder } from '@/lib/photos';
import {
  isCloudinaryConfigured,
  updateImageContext,
} from '@/lib/cloudinary';

// PUT /api/photos/reorder — 批量更新照片排序（需认证）
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await request.json();
  const { orders } = body as { orders: { id: string; sortOrder: number }[] };

  if (!orders || !Array.isArray(orders)) {
    return NextResponse.json({ error: '参数格式错误' }, { status: 400 });
  }

  // 更新本地记录
  updateLocalPhotosOrder(orders);

  // 更新 Cloudinary context（逐个处理，避免并行限流）
  if (isCloudinaryConfigured()) {
    const photos = await readPhotos();
    const photoMap = new Map(photos.map(p => [p.id, p]));

    let failed = 0;
    for (const { id, sortOrder } of orders) {
      const photo = photoMap.get(id);
      if (photo?.publicId) {
        try {
          await updateImageContext(photo.publicId, { sortOrder });
        } catch (err) {
          failed++;
          console.error(`[reorder] Cloudinary 更新失败: ${id}`, err);
        }
      }
    }
    if (failed > 0) {
      console.error(`[reorder] ${failed}/${orders.length} Cloudinary 更新失败`);
    }
  }

  // 返回更新后的照片列表
  const updatedPhotos = await readPhotos();
  return NextResponse.json({ success: true, photos: updatedPhotos });
}
