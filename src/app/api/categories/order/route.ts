import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getCategories } from '@/lib/photos';
import { readCategoryOrder, saveCategoryOrder } from '@/lib/category-order';

// GET /api/categories/order — 获取排序后的分类列表
export async function GET() {
  const categories = await getCategories();
  return NextResponse.json({ categories, order: categories });
}

// PUT /api/categories/order — 更新分类排序（需认证）
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await request.json();
  const { order } = body as { order: string[] };

  if (!order || !Array.isArray(order)) {
    return NextResponse.json({ error: '参数格式错误' }, { status: 400 });
  }

  // 获取当前所有分类，确保传入的 order 包含全部
  const currentCategories = await getCategories();
  const currentSet = new Set(currentCategories);

  // 只保留仍然存在的分类
  const filtered = order.filter(cat => currentSet.has(cat));
  // 追加新增的分类（不在 order 中的）
  for (const cat of currentCategories) {
    if (!filtered.includes(cat)) {
      filtered.push(cat);
    }
  }

  saveCategoryOrder(filtered);

  return NextResponse.json({ success: true, order: filtered });
}
