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
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
