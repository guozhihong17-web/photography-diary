require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── 路径配置 ──
// 支持 Railway 等云平台的持久化存储卷挂载
const STORAGE_BASE = process.env.STORAGE_DIR || __dirname;
const DATA_DIR = path.join(STORAGE_BASE, 'data');
const PHOTOS_FILE = path.join(DATA_DIR, 'photos.json');
const UPLOADS_DIR = path.join(STORAGE_BASE, 'uploads');
const ORIGINALS_DIR = path.join(UPLOADS_DIR, 'originals');
const THUMBS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

// 确保目录存在
[DATA_DIR, UPLOADS_DIR, ORIGINALS_DIR, THUMBS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── 中间件 ──
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// ── 工具函数 ──
function readPhotos() {
  try {
    const raw = fs.readFileSync(PHOTOS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writePhotos(photos) {
  fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf-8');
}

// 认证中间件
function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.status(401).json({ error: '请先登录' });
}

// ── Multer 配置 ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ORIGINALS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|gif)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPG、PNG、WebP、GIF 格式'));
    }
  }
});

// ── 公开 API ──

// 获取所有照片
app.get('/api/photos', (req, res) => {
  let photos = readPhotos();
  const { category } = req.query;
  if (category && category !== 'all') {
    photos = photos.filter(p => p.category === category);
  }
  // 按上传时间倒序排列
  photos.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  res.json(photos);
});

// 获取单张照片
app.get('/api/photos/:id', (req, res) => {
  const photos = readPhotos();
  const photo = photos.find(p => p.id === req.params.id);
  if (!photo) return res.status(404).json({ error: '照片不存在' });
  res.json(photo);
});

// 获取分类列表
app.get('/api/categories', (req, res) => {
  const photos = readPhotos();
  const categories = [...new Set(photos.map(p => p.category).filter(Boolean))];
  res.json(categories);
});

// ── 认证 API ──

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.authenticated = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: '密码错误' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth-check', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

// ── 管理 API（需认证）──

// 上传照片
app.post('/api/upload', requireAuth, upload.array('photos', 20), async (req, res) => {
  try {
    const photos = readPhotos();
    const newPhotos = [];

    // 解析元数据 JSON（按原始文件名索引）
    let metadataList = [];
    try {
      metadataList = req.body.metadata ? JSON.parse(req.body.metadata) : [];
    } catch {}

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const id = uuidv4();
      const thumbFilename = `thumb_${file.filename}`;
      const thumbPath = path.join(THUMBS_DIR, thumbFilename);

      // 用 sharp 生成缩略图
      const imgMeta = await sharp(file.path).metadata();
      await sharp(file.path)
        .resize({ width: 600, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(thumbPath);

      const meta = metadataList[i] || {};
      const title = meta.title || path.parse(file.originalname).name;
      const description = meta.description || '';
      const category = meta.category || 'uncategorized';

      const photo = {
        id,
        filename: file.filename,
        thumbFilename,
        title,
        description,
        category,
        uploadedAt: new Date().toISOString(),
        width: imgMeta.width,
        height: imgMeta.height,
        originalName: file.originalname
      };

      photos.push(photo);
      newPhotos.push(photo);
    }

    writePhotos(photos);
    res.json({ success: true, photos: newPhotos });
  } catch (err) {
    console.error('上传处理失败:', err);
    res.status(500).json({ error: '上传处理失败' });
  }
});

// 更新照片信息
app.put('/api/photos/:id', requireAuth, (req, res) => {
  const photos = readPhotos();
  const index = photos.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: '照片不存在' });

  const { title, description, category } = req.body;
  if (title !== undefined) photos[index].title = title;
  if (description !== undefined) photos[index].description = description;
  if (category !== undefined) photos[index].category = category;

  writePhotos(photos);
  res.json({ success: true, photo: photos[index] });
});

// 删除照片
app.delete('/api/photos/:id', requireAuth, (req, res) => {
  const photos = readPhotos();
  const index = photos.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: '照片不存在' });

  const photo = photos[index];

  // 删除文件
  const originalPath = path.join(ORIGINALS_DIR, photo.filename);
  const thumbPath = path.join(THUMBS_DIR, photo.thumbFilename);
  try { if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath); } catch {}
  try { if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath); } catch {}

  photos.splice(index, 1);
  writePhotos(photos);
  res.json({ success: true });
});

// ── 页面路由 ──
// SPA 回退：所有非 API 和非静态文件的请求都返回 index.html
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── 启动服务器 ──
app.listen(PORT, () => {
  console.log(`📷 摄影师作品网站已启动: http://localhost:${PORT}`);
});
