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

  // 读取当前照片列表
  const photos = await readPhotos();
  const orderMap = new Map(orders.map(o => [o.id, o.sortOrder]));

  // 直接在内存中应用排序（不依赖 Cloudinary 返回）
  for (const photo of photos) {
    const newOrder = orderMap.get(photo.id);
    if (newOrder !== undefined) {
      photo.sortOrder = newOrder;
    }
  }

  // 按 sortOrder 排序后返回
  const sorted = [...photos].sort((a, b) => {
    const aOrder = a.sortOrder ?? Infinity;
    const bOrder = b.sortOrder ?? Infinity;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  });

  // 更新本地记录（后台）
  updateLocalPhotosOrder(orders);

  // 更新 Cloudinary context（异步后台，不阻塞响应）
  if (isCloudinaryConfigured()) {
    const photoMap = new Map(photos.map(p => [p.id, p]));
    // 使用 Promise 但不 await — 后台执行，不阻塞响应
    Promise.allSettled(
      orders.map(async ({ id, sortOrder }) => {
        const photo = photoMap.get(id);
        if (photo?.publicId) {
          await updateImageContext(photo.publicId, { sortOrder });
        }
      })
    ).then(results => {
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        console.error(`[reorder] ${failed}/${orders.length} Cloudinary 更新失败`);
      }
    });
  }

  // 立即返回内存中排好序的照片
  return NextResponse.json({ success: true, photos: sorted });
}
