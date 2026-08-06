import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const ORDER_FILE = path.join(DATA_DIR, 'category-order.json');

/** 安全写入（Vercel 文件系统只读时记录日志但不中断请求） */
function safeWrite(fn: () => void): void {
  try {
    fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[safeWrite] 写入失败（文件系统只读？）:', msg);
  }
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    safeWrite(() => fs.mkdirSync(DATA_DIR, { recursive: true }));
  }
}

interface CategoryOrderData {
  order: string[];
}

function readFile(): CategoryOrderData {
  try {
    ensureDataDir();
    if (!fs.existsSync(ORDER_FILE)) return { order: [] };
    const raw = fs.readFileSync(ORDER_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { order: [] };
  }
}

function writeFile(data: CategoryOrderData): void {
  safeWrite(() => {
    ensureDataDir();
    fs.writeFileSync(ORDER_FILE, JSON.stringify(data, null, 2), 'utf-8');
  });
}

/** 读取分类排序列表 */
export function readCategoryOrder(): string[] {
  return readFile().order;
}

/** 同步版本（供 readPhotos 等同步上下文使用） */
export function readCategoryOrderSync(): string[] {
  return readCategoryOrder();
}

/** 保存分类排序列表 */
export function saveCategoryOrder(order: string[]): void {
  writeFile({ order });
}
