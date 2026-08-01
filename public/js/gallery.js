/* ═══════════════════════════════════════════
   摄影日记 — 画廊前端逻辑
   ═══════════════════════════════════════════ */

// ── 状态 ──
let allPhotos = [];
let currentPhotos = [];
let currentCategory = 'all';
let lightboxIndex = -1;

// ── DOM 元素 ──
const categoryNav = document.getElementById('categoryNav');
const masonryGrid = document.getElementById('masonryGrid');
const emptyState = document.getElementById('emptyState');
const loadingEl = document.getElementById('loading');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxDesc = document.getElementById('lightboxDesc');
const lightboxCounter = document.getElementById('lightboxCounter');

// ── 工具函数 ──
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

// ── API 请求 ──
async function fetchPhotos(category) {
  let url = '/api/photos';
  if (category && category !== 'all') url += `?category=${encodeURIComponent(category)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch photos');
  return res.json();
}

async function fetchCategories() {
  const res = await fetch('/api/categories');
  if (!res.ok) return [];
  return res.json();
}

// ── 渲染分类标签 ──
function renderCategories(categories) {
  categoryNav.innerHTML = '<button class="category-btn active" data-category="all">全部</button>';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.dataset.category = cat;
    btn.textContent = cat;
    categoryNav.appendChild(btn);
  });
}

// ── 渲染画廊 ──
function renderGallery(photos) {
  masonryGrid.innerHTML = '';

  if (photos.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  photos.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.innerHTML = `
      <img src="/uploads/thumbnails/${photo.thumbFilename}"
           alt="${escapeHtml(photo.title)}"
           loading="lazy"
           data-photo-id="${photo.id}">
      <div class="photo-overlay">
        <h3>${escapeHtml(photo.title)}</h3>
        <span class="category-tag">${escapeHtml(photo.category || '未分类')}</span>
      </div>
    `;
    card.addEventListener('click', () => openLightbox(photo.id));
    masonryGrid.appendChild(card);
  });
}

// ── 灯箱 ──
function openLightbox(photoId) {
  const index = currentPhotos.findIndex(p => p.id === photoId);
  if (index === -1) return;
  lightboxIndex = index;
  showLightboxImage();
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
  lightboxImg.src = '';
}

function showLightboxImage() {
  const photo = currentPhotos[lightboxIndex];
  if (!photo) return;
  lightboxImg.src = `/uploads/originals/${photo.filename}`;
  lightboxTitle.textContent = photo.title;
  lightboxDesc.textContent = photo.description || '';
  lightboxCounter.textContent = `${lightboxIndex + 1} / ${currentPhotos.length}`;
  preloadAdjacent();
}

function navigateLightbox(direction) {
  if (currentPhotos.length === 0) return;
  lightboxIndex = (lightboxIndex + direction + currentPhotos.length) % currentPhotos.length;
  showLightboxImage();
}

function preloadAdjacent() {
  const prev = currentPhotos[lightboxIndex - 1];
  const next = currentPhotos[lightboxIndex + 1];
  [prev, next].filter(Boolean).forEach(p => {
    const img = new Image();
    img.src = `/uploads/originals/${p.filename}`;
  });
}

// ── 事件监听 ──

// 分类切换
categoryNav.addEventListener('click', (e) => {
  const btn = e.target.closest('.category-btn');
  if (!btn) return;

  categoryNav.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  currentCategory = btn.dataset.category;
  filterAndRender();
});

// 灯箱关闭
document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

// 灯箱导航
document.getElementById('lightboxPrev').addEventListener('click', () => navigateLightbox(-1));
document.getElementById('lightboxNext').addEventListener('click', () => navigateLightbox(1));

// 键盘事件
document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('active')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') navigateLightbox(-1);
  if (e.key === 'ArrowRight') navigateLightbox(1);
});

// 触摸滑动（移动端灯箱）
let touchStartX = 0;
lightbox.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; });
lightbox.addEventListener('touchend', (e) => {
  const delta = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(delta) > 50) navigateLightbox(delta > 0 ? 1 : -1);
});

// ── 初始化和筛选 ──
function filterAndRender() {
  if (currentCategory === 'all') {
    currentPhotos = allPhotos;
  } else {
    currentPhotos = allPhotos.filter(p => p.category === currentCategory);
  }
  renderGallery(currentPhotos);
}

async function init() {
  try {
    const [photos, categories] = await Promise.all([
      fetchPhotos(),
      fetchCategories()
    ]);

    allPhotos = photos;
    renderCategories(categories);
    filterAndRender();
  } catch (err) {
    console.error('画廊加载失败:', err);
    emptyState.style.display = 'block';
    emptyState.querySelector('h2').textContent = '加载失败';
    emptyState.querySelector('p').textContent = '请检查服务器是否正常运行';
  } finally {
    loadingEl.style.display = 'none';
  }
}

init();
