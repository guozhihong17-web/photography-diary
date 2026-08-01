import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '摄影日记',
  description: '个人摄影作品集 — 用光影记录世界',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
