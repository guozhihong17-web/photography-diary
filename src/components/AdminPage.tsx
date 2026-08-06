'use client';

import { Photo } from '@/types';
import { getPhotoSrc } from '@/lib/cloudinary-url';
import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { ToastContainer, toast } from '@/components/Toast';

interface PendingFile {
  file: File;
  title: string;
  description: string;
  /** 逗号分隔的分类字符串，如 "风景,旅行,航拍" */
  categories: string;
  preview: string;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editPhoto, setEditPhoto] = useState<Photo | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [loginError, setLoginError] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [categoryList, setCategoryList] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // 检查登录状态
  useEffect(() => {
    fetch('/api/auth-check')
      .then(res => res.json())
      .then(data => {
        setAuthenticated(data.authenticated);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  // 加载照片
  const loadPhotos = useCallback(() => {
    fetch('/api/photos')
      .then(res => res.json())
      .then(data => setPhotos(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadPhotos();
      // 加载分类排序
      fetch('/api/categories/order')
        .then(res => res.json())
        .then(data => {
          if (data.order) setCategoryList(data.order);
          else if (data.categories) setCategoryList(data.categories);
        })
        .catch(() => {});
    }
  }, [authenticated, loadPhotos]);

  // 登录
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    if (!password) {
      setLoginError('请输入密码');
      return;
    }
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthenticated(true);
        setLoginError('');
      } else {
        setLoginError('密码错误，请重试');
        toast('密码错误', 'error');
      }
    } catch {
      setLoginError('网络错误，请稍后重试');
      toast('网络错误', 'error');
    }
  };

  // 退出
  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setAuthenticated(false);
  };

  // ========== 拖拽排序照片 ==========

  const handleDragStart = (e: React.DragEvent, photoId: string) => {
    setDragId(photoId);
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).classList.add('opacity-40');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDragId(null);
    setDragOverId(null);
    (e.currentTarget as HTMLElement).classList.remove('opacity-40');
  };

  const handleDragOver = (e: React.DragEvent, photoId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragId && dragId !== photoId) {
      setDragOverId(photoId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);

    if (!dragId || dragId === targetId) return;

    const newPhotos = [...photos];
    const dragIdx = newPhotos.findIndex(p => p.id === dragId);
    const targetIdx = newPhotos.findIndex(p => p.id === targetId);

    if (dragIdx === -1 || targetIdx === -1) return;

    // 移动照片
    const [moved] = newPhotos.splice(dragIdx, 1);
    newPhotos.splice(targetIdx, 0, moved);

    // 重新分配 sortOrder
    const orders = newPhotos.map((p, i) => ({ id: p.id, sortOrder: i }));
    newPhotos.forEach((p, i) => { p.sortOrder = i; });

    setPhotos(newPhotos);
    setSaving(true);

    try {
      await fetch('/api/photos/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });
      toast('排序已保存');
    } catch {
      toast('排序保存失败', 'error');
    }
    setSaving(false);
  };

  // ========== 分类排序 ==========

  const moveCategory = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= categoryList.length) return;

    const newOrder = [...categoryList];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setCategoryList(newOrder);

    try {
      await fetch('/api/categories/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
      });
      toast('分类排序已保存');
    } catch {
      toast('保存失败', 'error');
    }
  };

  // 文件处理
  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const validFiles = Array.from(fileList).filter(f =>
      /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name)
    );
    if (validFiles.length === 0) {
      toast('请选择 JPG、PNG、WebP 格式文件', 'error');
      return;
    }
    if (pendingFiles.length + validFiles.length > 20) {
      toast('最多 20 张', 'error');
      return;
    }
    const newFiles: PendingFile[] = validFiles.map(file => ({
      file,
      title: file.name.replace(/\.[^.]+$/, ''),
      description: '',
      categories: '',
      preview: URL.createObjectURL(file),
    }));
    setPendingFiles(prev => [...prev, ...newFiles]);
  };

  // 拖拽上传
  const handleUploadDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  // 上传
  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    pendingFiles.forEach(item => formData.append('photos', item.file));
    formData.append('metadata', JSON.stringify(
      pendingFiles.map(item => ({
        title: item.title,
        description: item.description,
        categories: item.categories,
      }))
    ));

    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        toast(`成功上传 ${data.photos.length} 张照片`);
        setPendingFiles([]);
        loadPhotos();
      } else {
        const data = await res.json().catch(() => ({ error: '未知错误' }));
        toast(data.error || '上传失败', 'error');
      }
    } catch (err) {
      toast(`上传失败: ${err instanceof Error ? err.message : '网络错误'}`, 'error');
    }
    setUploading(false);
  };

  // 删除
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这张照片吗？此操作不可撤销。')) return;
    const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast('已删除');
      loadPhotos();
    } else {
      toast('删除失败', 'error');
    }
  };

  // 打开编辑
  const openEdit = (photo: Photo) => {
    setEditPhoto(photo);
    setEditTitle(photo.title);
    setEditDesc(photo.description);
    setEditCategory(photo.categories?.join(', ') || photo.category);
  };

  // 保存编辑
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPhoto) return;
    const res = await fetch(`/api/photos/${editPhoto.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        description: editDesc,
        categories: editCategory,
      }),
    });
    if (res.ok) {
      toast('保存成功');
      setEditPhoto(null);
      loadPhotos();
    } else {
      toast('保存失败', 'error');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dark-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // 未登录
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
        <div className="bg-dark-900 border border-dark-800 rounded-lg p-10 max-w-sm w-full text-center">
          <h2 className="text-2xl font-light mb-2">📷 管理登录</h2>
          <p className="text-accent-gray text-sm mb-8">请输入管理密码</p>
          <form onSubmit={handleLogin}>
            <div className="mb-4 text-left">
              <label className="block text-xs text-accent-gray uppercase tracking-wider mb-2" htmlFor="password">密码</label>
              <input
                id="password"
                name="password"
                type="password"
                className={`w-full px-4 py-3 bg-dark-800 border rounded text-sm focus:outline-none transition-colors ${
                  loginError ? 'border-red-500/60' : 'border-dark-600 focus:border-white'
                }`}
                placeholder="请输入管理密码"
                required
                autoFocus
                onChange={() => setLoginError('')}
              />
              {loginError && (
                <p className="text-xs text-red-400 mt-2">{loginError}</p>
              )}
            </div>
            <button type="submit" className="w-full py-3 bg-white text-dark-950 rounded text-sm font-medium hover:bg-gray-200 transition-colors">
              登录
            </button>
          </form>
          <a href="/" className="inline-block mt-5 text-dark-500 text-sm hover:text-white transition-colors">
            ← 返回首页
          </a>
        </div>
      </div>
    );
  }

  // 管理面板
  return (
    <div className="min-h-screen bg-dark-950 text-white">
      <ToastContainer />
      <Header
        title="管理后台"
        rightContent={
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-accent-gray hover:text-white transition-colors border border-dark-600 px-3 py-1 rounded">查看网站</a>
            <button onClick={handleLogout} className="text-xs text-accent-gray hover:text-white transition-colors border border-dark-600 px-3 py-1 rounded">退出</button>
          </div>
        }
      />

      <div className="max-w-[1400px] mx-auto px-6 py-10">
        {/* 上传区域 */}
        <section className="mb-12">
          <h3 className="text-lg font-normal tracking-wider mb-5 pb-3 border-b border-dark-800">上传照片</h3>

          <div
            className="border-2 border-dashed border-dark-600 rounded-lg p-16 text-center cursor-pointer transition-all hover:border-white hover:bg-dark-900"
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-white', 'bg-dark-900'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('border-white', 'bg-dark-900'); }}
            onDrop={(e) => { e.currentTarget.classList.remove('border-white', 'bg-dark-900'); handleUploadDrop(e); }}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <div className="text-5xl opacity-40 mb-3">📤</div>
            <p className="text-accent-gray">拖拽照片到此处，或点击选择文件</p>
            <p className="text-dark-500 text-sm mt-2">支持 JPG、PNG、WebP，单文件最大 50MB，最多 20 张</p>
            <input
              id="fileInput"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {pendingFiles.length > 0 && (
            <div className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                {pendingFiles.map((item, index) => (
                  <div key={index} className="bg-dark-900 border border-dark-800 rounded-lg overflow-hidden">
                    <img src={item.preview} alt="" className="w-full h-48 object-cover bg-dark-800" />
                    <div className="p-4 space-y-2">
                      <div>
                        <label className="text-xs text-accent-gray block mb-1">标题</label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => {
                            const updated = [...pendingFiles];
                            updated[index].title = e.target.value;
                            setPendingFiles(updated);
                          }}
                          className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded text-sm focus:outline-none focus:border-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-accent-gray block mb-1">描述</label>
                        <textarea
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...pendingFiles];
                            updated[index].description = e.target.value;
                            setPendingFiles(updated);
                          }}
                          rows={2}
                          className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded text-sm focus:outline-none focus:border-white resize-y"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-accent-gray block mb-1">分类（逗号分隔）</label>
                        <input
                          type="text"
                          value={item.categories}
                          onChange={(e) => {
                            const updated = [...pendingFiles];
                            updated[index].categories = e.target.value;
                            setPendingFiles(updated);
                          }}
                          placeholder="如：风景,旅行,航拍"
                          className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded text-sm focus:outline-none focus:border-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-6 py-3 bg-white text-dark-950 rounded text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {uploading ? '上传中...' : '开始上传'}
                </button>
                <button
                  onClick={() => setPendingFiles([])}
                  className="px-6 py-3 border border-dark-600 rounded text-sm hover:border-white transition-colors"
                >
                  清空
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 管理区域 */}
        <section>
          {/* 分类排序面板 */}
          <div className="mb-8">
            <button
              onClick={() => setShowCategoryPanel(!showCategoryPanel)}
              className="text-lg font-normal tracking-wider pb-3 border-b border-dark-800 w-full text-left flex items-center justify-between hover:text-accent-gold transition-colors"
            >
              <span>分类管理 ({categoryList.length})</span>
              <span className={`text-sm transition-transform ${showCategoryPanel ? 'rotate-90' : ''}`}>›</span>
            </button>
            {showCategoryPanel && (
              <div className="mt-4 bg-dark-900 border border-dark-800 rounded-lg p-4">
                <p className="text-xs text-dark-500 mb-3">拖拽可调整分类在首页的显示顺序</p>
                {categoryList.length === 0 ? (
                  <p className="text-sm text-dark-500">暂无分类</p>
                ) : (
                  <div className="space-y-1">
                    {categoryList.map((cat, idx) => {
                      const count = photos.filter(p =>
                        (p.categories || [p.category]).includes(cat)
                      ).length;
                      return (
                        <div
                          key={cat}
                          className="flex items-center justify-between bg-dark-800 rounded px-4 py-2.5"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-dark-500 text-xs w-5">{idx + 1}</span>
                            <span className="text-sm">{cat}</span>
                            <span className="text-xs text-dark-500">({count} 张)</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => moveCategory(idx, -1)}
                              disabled={idx === 0}
                              className="w-7 h-7 flex items-center justify-center rounded border border-dark-600 text-dark-400 hover:text-white hover:border-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="上移"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveCategory(idx, 1)}
                              disabled={idx === categoryList.length - 1}
                              className="w-7 h-7 flex items-center justify-center rounded border border-dark-600 text-dark-400 hover:text-white hover:border-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="下移"
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-dark-800 mb-5">
            <h3 className="text-lg font-normal tracking-wider">
              管理照片 ({photos.length})
            </h3>
            {saving && (
              <span className="text-xs text-accent-gold animate-pulse">保存中...</span>
            )}
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-10 text-dark-500">还没有上传任何照片</div>
          ) : (
            <>
              <p className="text-xs text-dark-500 mb-4">拖拽照片可调整排序，或点击编辑/删除</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {photos.map(photo => (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, photo.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, photo.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, photo.id)}
                    className={`bg-dark-900 border rounded-sm overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
                      dragId === photo.id ? 'opacity-40' : ''
                    } ${
                      dragOverId === photo.id
                        ? 'border-accent-gold scale-[1.02] shadow-lg shadow-accent-gold/10'
                        : 'border-dark-800'
                    }`}
                  >
                    <img
                      src={getPhotoSrc(photo, 'thumb')}
                      alt={photo.title}
                      className="w-full h-32 object-cover pointer-events-none"
                      loading="lazy"
                    />
                    <div className="p-3">
                      <h4 className="text-sm font-medium truncate" title={photo.title}>{photo.title}</h4>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(photo.categories || [photo.category]).filter(Boolean).map(cat => (
                          <span key={cat} className="text-[10px] text-dark-500 bg-dark-800 px-1.5 py-0.5 rounded">
                            {cat}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1 mt-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(photo); }}
                          className="flex-1 text-xs py-1.5 border border-dark-600 rounded hover:border-white transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                          className="flex-1 text-xs py-1.5 bg-red-900/30 text-red-400 border border-red-800/50 rounded hover:bg-red-900/50 transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* 编辑弹窗 */}
      {editPhoto && (
        <div
          className="fixed inset-0 z-[1500] bg-black/80 flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setEditPhoto(null); }}
        >
          <div className="bg-dark-900 border border-dark-800 rounded-lg p-8 max-w-md w-full">
            <h3 className="text-xl font-light mb-5">编辑照片信息</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="text-xs text-accent-gray block mb-1">标题</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded text-sm focus:outline-none focus:border-white"
                />
              </div>
              <div>
                <label className="text-xs text-accent-gray block mb-1">描述</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded text-sm focus:outline-none focus:border-white resize-y"
                />
              </div>
              <div>
                <label className="text-xs text-accent-gray block mb-1">分类（逗号分隔）</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="如：风景,旅行,航拍"
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded text-sm focus:outline-none focus:border-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-3 bg-white text-dark-950 rounded text-sm font-medium hover:bg-gray-200 transition-colors">保存</button>
                <button type="button" onClick={() => setEditPhoto(null)} className="flex-1 py-3 border border-dark-600 rounded text-sm hover:border-white transition-colors">取消</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
