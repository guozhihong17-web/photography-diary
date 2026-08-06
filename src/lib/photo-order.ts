import fs from 'fs';
import path from 'path';

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

/** 读取照片显示顺序（/tmp 缓存优先，回退到 data/） */
export function readPhotoOrder(): string[] {
  // /tmp 优先（Vercel 运行时缓存，同一实例内持续有效）
  try {
    if (fs.existsSync(TMP_ORDER_FILE)) {
      const raw = fs.readFileSync(TMP_ORDER_FILE, 'utf-8');
      const order = JSON.parse(raw);
      if (Array.isArray(order)) return order;
    }
  } catch { /* ignore */ }

  // 回退到 data/photo-order.json
  try {
    if (fs.existsSync(ORDER_FILE)) {
      const raw = fs.readFileSync(ORDER_FILE, 'utf-8');
      const order = JSON.parse(raw);
      if (Array.isArray(order)) return order;
    }
  } catch { /* ignore */ }

  return [];
}

/** 保存照片显示顺序 */
export function savePhotoOrder(order: string[]): void {
  // 写入 /tmp（Vercel 可写区域，同实例内持久化）
  safeWrite(() => {
    fs.writeFileSync(TMP_ORDER_FILE, JSON.stringify(order), 'utf-8');
  });

  // 同时尝试写入 data/（本地开发直接生效，也方便 git commit 固化）
  safeWrite(() => {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ORDER_FILE, JSON.stringify(order, null, 2), 'utf-8');
  });
}
