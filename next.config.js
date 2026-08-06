/** @type {import('next').NextConfig} */
const nextConfig = {
  // 上传文件大小限制（App Router 的默认 4MB 不够用）
  // 注：App Router 使用 Web API formData()，实际限制由部署平台决定
  // Vercel Hobby 限制为 4.5MB，但 sharp 压缩后照片通常 < 2MB
};

module.exports = nextConfig;
