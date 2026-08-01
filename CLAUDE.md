# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # 开发服务器 (localhost:3000)，支持热更新
npm run build    # 生产构建，类型检查 + 编译
npm start        # 生产模式启动（需先 build）
npm run lint     # ESLint 检查
```

## Architecture

### Stack
Next.js 15 App Router + TypeScript + Tailwind CSS。React 19 服务端/客户端组件混合。

### Data Flow

```
┌─ public/uploads/ ──────────────────────────────────────┐
│  originals/display_<uuid>.jpg   ← sharp 压缩后的展示图  │
│  thumbnails/thumb_<uuid>.jpg    ← 600px 缩略图          │
│  → Next.js 直接作为静态文件提供                          │
└────────────────────────────────────────────────────────┘
┌─ data/photos.json ─────────────────────────────────────┐
│  Photo[] 元数据 (title, category, 文件名映射等)         │
│  → src/lib/photos.ts 封装所有读写操作                    │
└────────────────────────────────────────────────────────┘
```

### Storage Strategy

- **本地开发**: `STORAGE_DIR` 默认指向 `public/`，图片自动被 Next.js 静态服务
- **云部署** (Railway/Docker): 设置 `STORAGE_DIR=/storage`，将持久卷挂载到该路径。需额外配置 `next.config.js` 的 `rewrites` 将 `/uploads/*` 代理到文件系统路径
- **图片压缩**: `IMAGE_MAX_WIDTH` (默认 2400px) 和 `IMAGE_QUALITY` (默认 80) 通过环境变量控制。原始文件在上传后被丢弃，只保留压缩版

### Authentication

`src/lib/auth.ts` — 无 session 的 HMAC Cookie 认证：
- 登录时用 `crypto.createHmac('sha256')` 签名密码生成 token，写入 `auth_token` cookie
- 保护路由调用 `await isAuthenticated()` 验证 cookie
- 登出时设置同 key 的 maxAge=0 空 cookie 覆盖
- `next/headers` 的 `cookies()` 在 Next.js 15 中返回 Promise，必须 `await`

### Upload Pipeline

`POST /api/photos` 接收 `multipart/form-data`：
1. `request.formData()` 解析文件和 `metadata` JSON 字段
2. Buffer → `sharp` 生成展示图 (可配置宽/质量) + 缩略图 (600px)
3. 写入 `photos.json` 元数据
4. 删除原始上传文件

### Components

- **GalleryPage** (`'use client'`): 首页完整逻辑 — fetch 数据、分类筛选、CSS columns 网格、灯箱状态管理
- **AdminPage** (`'use client'`): 登录/上传/编辑/删除一体化。拖拽上传用 `URL.createObjectURL` 预览
- **Lightbox**: 键盘 ←→ 导航 + 触摸滑动 + 相邻图片预加载
- 其余组件 (Header, Hero, Footer, PhotoCard, Toast) 均为展示型

### Unused Dependencies

`multer` 和 `express-session` 是 Express 旧版本的遗留依赖，当前代码不使用它们。可以在确认无误后移除。

### Category System

分类是自由文本，不是预定义枚举。`getCategories()` 从已有照片中动态提取去重值。新照片上传时可填入任意分类名。
