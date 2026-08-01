/* ═══════════════════════════════════════════
   摄影日记 — 管理后台逻辑
   ═══════════════════════════════════════════ */

// ── DOM 元素 ──
const app = document.getElementById('app');
const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');

// 上传
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadPreview = document.getElementById('uploadPreview');
const previewGrid = document.getElementById('previewGrid');
const uploadBtn = document.getElementById('uploadBtn');
const clearUploadBtn = document.getElementById('clearUploadBtn');

// 管理
const manageGrid = document.getElementById('manageGrid');
const manageEmpty = document.getElementById('manageEmpty');
const manageLoading = document.getElementById('manageLoading');
const photoCount = document.getElementById('photoCount');

// 编辑弹窗
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const editTitle = document.getElementById('editTitle');
const editDesc = document.getElementById('editDesc');
const editCategory = document.getElementById('editCategory');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Toast
const toastContainer = document.getElementById('toastContainer');

// ── 状态 ──
let pendingFiles = []; // { file, title, description, category }
let currentEditId = null;

// ── 工具函数 ──
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  toastContainer.appendChild(el);
  setTimeout(() => { el.remove(); }, 3000);
}

// ── 认证检查 ──
async function checkAuth() {
  try {
    const res = await fetch('/api/auth-check');
    const data = await res.json();
    if (data.authenticated) {
      loginOverlay.style.display = 'none';
      app.style.display = 'block';
      loadPhotos();
    } else {
      loginOverlay.style.display = '';
      app.style.display = 'none';
    }
  } catch {
    loginOverlay.style.display = '';
    app.style.display = 'none';
  }
}

// ── 登录 ──
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.remove('show');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: loginPassword.value })
    });

    if (res.ok) {
      loginOverlay.style.display = 'none';
      app.style.display = 'block';
      loadPhotos();
    } else {
      const data = await res.json();
      loginError.textContent = data.error || '密码错误';
      loginError.classList.add('show');
      loginPassword.value = '';
      loginPassword.focus();
    }
  } catch {
    loginError.textContent = '网络错误';
    loginError.classList.add('show');
  }
});

// ── 退出 ──
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  app.style.display = 'none';
  loginOverlay.style.display = '';
  loginPassword.value = '';
});

// ── 文件选择和拖拽 ──
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
  fileInput.value = '';
});

function handleFiles(fileList) {
  const validFiles = Array.from(fileList).filter(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
  });

  if (validFiles.length === 0) {
    toast('请选择图片文件（JPG、PNG、WebP、GIF）', 'error');
    return;
  }

  if (pendingFiles.length + validFiles.length > 20) {
    toast('最多同时上传 20 张照片', 'error');
    return;
  }

  validFiles.forEach(file => {
    const name = file.name.replace(/\.[^.]+$/, '');
    pendingFiles.push({
      file,
      title: name,
      description: '',
      category: ''
    });
  });

  renderPreviews();
}

function renderPreviews() {
  if (pendingFiles.length === 0) {
    uploadPreview.style.display = 'none';
    return;
  }
  uploadPreview.style.display = 'block';

  previewGrid.innerHTML = '';
  pendingFiles.forEach((item, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const card = document.createElement('div');
      card.className = 'preview-card';
      card.innerHTML = `
        <img src="${e.target.result}" alt="">
        <div class="preview-card-info">
          <div class="form-group">
            <label>标题</label>
            <input type="text" value="${escapeHtml(item.title)}" data-index="${index}" data-field="title">
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea data-index="${index}" data-field="description">${escapeHtml(item.description)}</textarea>
          </div>
          <div class="form-group">
            <label>分类</label>
            <input type="text" value="${escapeHtml(item.category)}" data-index="${index}" data-field="category" placeholder="如：风景、人像...">
          </div>
        </div>
      `;
      previewGrid.appendChild(card);
    };
    reader.readAsDataURL(item.file);
  });
}

// 预览区字段变更
previewGrid.addEventListener('input', (e) => {
  const target = e.target;
  if (!target.dataset.index) return;
  const index = parseInt(target.dataset.index);
  const field = target.dataset.field;
  if (pendingFiles[index]) {
    pendingFiles[index][field] = target.value;
  }
});

clearUploadBtn.addEventListener('click', () => {
  pendingFiles = [];
  renderPreviews();
});

// ── 上传 ──
uploadBtn.addEventListener('click', async () => {
  if (pendingFiles.length === 0) return;

  uploadBtn.disabled = true;
  uploadBtn.textContent = '上传中...';

  const formData = new FormData();

  // 添加所有照片文件
  pendingFiles.forEach(item => {
    formData.append('photos', item.file);
  });

  // 以 JSON 方式传递元数据
  const metadata = pendingFiles.map(item => ({
    title: item.title,
    description: item.description,
    category: item.category
  }));
  formData.append('metadata', JSON.stringify(metadata));

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (res.ok) {
      const data = await res.json();
      toast(`成功上传 ${data.photos.length} 张照片`);
      pendingFiles = [];
      renderPreviews();
      loadPhotos();
    } else {
      const data = await res.json();
      toast(data.error || '上传失败', 'error');
    }
  } catch (err) {
    toast('上传失败，请检查网络', 'error');
  }

  uploadBtn.disabled = false;
  uploadBtn.textContent = '开始上传';
});

// ── 加载照片列表 ──
async function loadPhotos() {
  manageLoading.style.display = 'block';
  manageGrid.innerHTML = '';

  try {
    const photos = await (await fetch('/api/photos')).json();
    photoCount.textContent = photos.length;

    if (photos.length === 0) {
      manageEmpty.style.display = 'block';
    } else {
      manageEmpty.style.display = 'none';
      renderManageGrid(photos);
    }
  } catch {
    toast('加载失败', 'error');
  } finally {
    manageLoading.style.display = 'none';
  }
}

function renderManageGrid(photos) {
  manageGrid.innerHTML = '';
  photos.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'manage-card';
    card.innerHTML = `
      <img src="/uploads/thumbnails/${photo.thumbFilename}" alt="${escapeHtml(photo.title)}" loading="lazy">
      <div class="manage-card-info">
        <h4 title="${escapeHtml(photo.title)}">${escapeHtml(photo.title)}</h4>
        <div class="meta">
          <span>${escapeHtml(photo.category || '未分类')}</span>
          <span>${formatDate(photo.uploadedAt)}</span>
        </div>
      </div>
      <div class="manage-card-actions">
        <button class="btn btn-outline btn-sm edit-btn" data-id="${photo.id}">编辑</button>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${photo.id}">删除</button>
      </div>
    `;
    manageGrid.appendChild(card);
  });

  // 编辑按钮
  manageGrid.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id, photos));
  });

  // 删除按钮
  manageGrid.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deletePhoto(btn.dataset.id));
  });
}

// ── 编辑 ──
function openEditModal(id, photos) {
  const photo = photos.find(p => p.id === id);
  if (!photo) return;

  currentEditId = id;
  editTitle.value = photo.title || '';
  editDesc.value = photo.description || '';
  editCategory.value = photo.category || '';
  editModal.classList.add('active');
}

cancelEditBtn.addEventListener('click', () => {
  editModal.classList.remove('active');
  currentEditId = null;
});

editModal.addEventListener('click', (e) => {
  if (e.target === editModal) {
    editModal.classList.remove('active');
    currentEditId = null;
  }
});

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentEditId) return;

  try {
    const res = await fetch(`/api/photos/${currentEditId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle.value,
        description: editDesc.value,
        category: editCategory.value
      })
    });

    if (res.ok) {
      toast('保存成功');
      editModal.classList.remove('active');
      currentEditId = null;
      loadPhotos();
    } else {
      const data = await res.json();
      toast(data.error || '保存失败', 'error');
    }
  } catch {
    toast('保存失败', 'error');
  }
});

// ── 删除 ──
async function deletePhoto(id) {
  if (!confirm('确定要删除这张照片吗？此操作不可撤销。')) return;

  try {
    const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast('已删除');
      loadPhotos();
    } else {
      toast('删除失败', 'error');
    }
  } catch {
    toast('删除失败', 'error');
  }
}

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

// ── 初始化 ──
checkAuth();
