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

### Storage: Cloudinary 为主，本地文件系统为辅

```
┌─ Cloudinary ─────────────────────────────────────────────┐
│  Context metadata: title|description|categories|originalName
│  图片通过 URL 构建: https://res.cloudinary.com/<cloud>/q_auto,f_auto,w_<size>/<publicId>
│  → src/lib/cloudinary-url.ts — 客户端 URL 构建（仅需 NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME）
│  → src/lib/cloudinary.ts — 服务端 SDK（上传/删除/更新/列表）
└──────────────────────────────────────────────────────────┘
┌─ data/photos.json ───────────────────────────────────────┐
│  本地元数据缓存（Vercel 上文件系统只读，safeWrite 跳过）
│  → src/lib/photos.ts 封装读写，Cloudinary 配置时以云端为准去重合并
└──────────────────────────────────────────────────────────┘
```

**关键原则**：Cloudinary 是唯一真实数据源（source of truth）。本地 `photos.json` 仅做缓存和兼容。Vercel 文件系统只读时所有本地写入通过 `safeWrite()` 静默跳过，读取始终从 Cloudinary API 拉取最新列表。

### Data Flow

```
上传: AdminPage → POST /api/photos → sharp 压缩 → Cloudinary upload_stream
     → 提取 EXIF (exifr) → 写本地 photos.json (可选)
读取: GalleryPage → GET /api/photos → readPhotos()
     → listCloudPhotos() + readLocalPhotos() → 合并去重 → JSON 响应
编辑: AdminPage → PUT /api/photos/[id] → updateImageContext (Cloudinary)
     → 同时尝试 updateLocalPhoto → 云端成功即返回 success
删除: AdminPage → DELETE /api/photos/[id] → deleteImage (Cloudinary)
     → deleteLocalPhoto (本地文件 + 记录)
```

### Photo Type & Multi-Category

`src/types/index.ts` — `Photo` 接口包含：
- `category: string` — 主分类（取 `categories[0]`，兼容旧数据）
- `categories?: string[]` — 多分类标签数组
- `exif?: PhotoExif` — 拍摄参数（相机/镜头/光圈/快门/ISO/焦距）
- `publicId?: string` — Cloudinary 图片 ID（云端照片必有）
- `filename?` / `thumbFilename?` — 本地文件名（仅本地照片）

分类在 Cloudinary context 中以 `categories=风景,旅行,航拍`（逗号分隔）存储，`resourceToPhoto()` 自动兼容旧格式 `category=单值`。

### Authentication

`src/lib/auth.ts` — HMAC Cookie 认证：
- 密码通过 `crypto.createHmac('sha256')` + SESSION_SECRET 生成 token
- 保护路由调用 `await isAuthenticated()` 验证 cookie
- Next.js 15 中 `cookies()` 返回 Promise，必须 `await`
- 登录 API 返回 401 时客户端在密码框下方显示红色内联错误提示

### Fonts

- 标题：Noto Serif SC（思源宋体），通过 Google Fonts CDN 加载（`src/app/layout.tsx`）
- 正文：系统字体栈（PingFang SC / Microsoft YaHei）
- Tailwind 中通过 `font-serif` 类使用

### Components

- **LandingPage** (`'use client'`): 全屏背景图 + 居中「摄影日记」标题 + Explore 按钮
- **GalleryPage** (`'use client'`): 画廊首页 — fetch 数据、分类筛选（支持多分类 `includes`）、CSS columns 瀑布流、灯箱状态管理
- **Lightbox** (`'use client'`): 桌面端 16:9 容器 + 5:1 黄金分割分栏（左图右信息），移动端图片居中 + 底部精简信息卡。标题/信息/EXIF 切换时淡入动画，键盘 ←→ 导航 + 触摸滑动 + 相邻图片预加载
- **AdminPage** (`'use client'`): 登录/上传/编辑/删除。拖拽上传预览，分类输入支持逗号分隔多标签，编辑弹窗同样支持
- **PhotoCard**: 瀑布流卡片，hover 显示标题 + 最多 3 个金色分类标签

### Deployment (Vercel)

- **身体限制**: Vercel Hobby 请求体 4.5MB，上传前 sharp 压缩但入站原始文件仍受限。建议大文件走客户端直传 Cloudinary
- **文件系统**: 只读（除 `/tmp`），所有 `data/photos.json` 写入通过 `safeWrite()` 静默跳过
- **自动部署**: `git push` 到 GitHub main 分支触发，[vercel.com/dashboard](https://vercel.com/dashboard) 查看进度
- **国内访问**: `*.vercel.app` 域名被 GFW 封锁，需绑定自定义域名

### EXIF Extraction

上传时 `exifr` 从原始 buffer 提取：Make/Model（合并为相机型号）、LensModel、FNumber、ExposureTime、ISO、FocalLength、DateTimeOriginal。提取失败静默跳过（`Photo.exif` 为 undefined），灯箱信息面板仅在有数据时显示「拍摄参数」区块。

### Tailwind Customizations

- 颜色：`dark-950` ~ `dark-500` 暗色梯度，`accent-gold` (#c9a96e)，`accent-gray` (#999)
- 动画：`fade-in`（0.3s 入场）、`toast-in`（Toast 滑入）、`image-fade-in`（0.35s 图片淡入）
- 字体：`font-serif` → Noto Serif SC

### Unused Dependencies

`multer` 和 `express-session` 是 Express 旧版本的遗留依赖，当前代码不使用它们。
