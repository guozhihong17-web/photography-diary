import fs from 'fs';
import path from 'path';
import { fetchPhotoOrder, uploadPhotoOrder } from '@/lib/cloudinary';

const DATA_DIR = path.join(process.cwd(), 'data');
const ORDER_FILE = path.join(DATA_DIR, 'photo-order.json');
// Vercel 上文件系统只读，/tmp 可写，用作运行时缓存
const TMP_ORDER_FILE = '/tmp/photo-order.json';

function safeWrite(fn: () => void): void {
  try {
    fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[photo-order safeWrite] 写入失败:', msg);
  }
}

/**
 * 读取照片显示顺序
 * 优先级：/tmp 缓存 → Cloudinary（持久存储）→ data/ 本地文件
 */
export async function readPhotoOrder(): Promise<string[]> {
  // 1. /tmp 优先（Vercel 运行时缓存，同实例内有效，最快）
  try {
    if (fs.existsSync(TMP_ORDER_FILE)) {
      const raw = fs.readFileSync(TMP_ORDER_FILE, 'utf-8');
      const order = JSON.parse(raw);
      if (Array.isArray(order)) return order;
    }
  } catch { /* ignore */ }

  // 2. Cloudinary 持久存储（跨冷启动、跨部署持久化）
  try {
    const cloudOrder = await fetchPhotoOrder();
    if (cloudOrder && cloudOrder.length > 0) {
      // 回写到 /tmp 缓存，后续请求走快速路径
      safeWrite(() => {
        fs.writeFileSync(TMP_ORDER_FILE, JSON.stringify(cloudOrder), 'utf-8');
      });
      return cloudOrder;
    }
  } catch { /* ignore */ }

  // 3. data/photo-order.json（本地开发 + git 固化回退）
  try {
    if (fs.existsSync(ORDER_FILE)) {
      const raw = fs.readFileSync(ORDER_FILE, 'utf-8');
      const order = JSON.parse(raw);
      if (Array.isArray(order)) return order;
    }
  } catch { /* ignore */ }

  return [];
}

/**
 * 保存照片显示顺序
 * 同时写入 /tmp、data/ 和 Cloudinary（持久存储）
 */
export async function savePhotoOrder(order: string[]): Promise<void> {
  // /tmp 缓存（Vercel 同实例可见）
  safeWrite(() => {
    fs.writeFileSync(TMP_ORDER_FILE, JSON.stringify(order), 'utf-8');
  });

  // data/ 本地文件（本地开发 + git 可提交固化）
  safeWrite(() => {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ORDER_FILE, JSON.stringify(order, null, 2), 'utf-8');
  });

  // Cloudinary 持久存储（跨冷启动、跨部署持久化）
  try {
    await uploadPhotoOrder(order);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[photo-order] Cloudinary 上传失败:', msg);
  }
}
