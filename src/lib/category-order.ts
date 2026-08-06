import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const ORDER_FILE = path.join(DATA_DIR, 'category-order.json');
const TMP_ORDER_FILE = '/tmp/category-order.json';

function safeWrite(fn: () => void): void {
  try {
    fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[category-order safeWrite] 写入失败:', msg);
  }
}

function readOrderFile(filePath: string): string[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : (data.order || []);
  } catch {
    return [];
  }
}

/** 读取分类排序列表（/tmp 优先，回退到 data/） */
export function readCategoryOrder(): string[] {
  const tmpOrder = readOrderFile(TMP_ORDER_FILE);
  if (tmpOrder.length > 0) return tmpOrder;
  return readOrderFile(ORDER_FILE);
}

/** 同步版本 */
export function readCategoryOrderSync(): string[] {
  return readCategoryOrder();
}

/** 保存分类排序列表 */
export function saveCategoryOrder(order: string[]): void {
  safeWrite(() => {
    fs.writeFileSync(TMP_ORDER_FILE, JSON.stringify(order), 'utf-8');
  });
  safeWrite(() => {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ORDER_FILE, JSON.stringify({ order }, null, 2), 'utf-8');
  });
}
