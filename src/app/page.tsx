import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';

export const metadata: Metadata = {
  title: '摄影日记 — 用光影记录世界',
  description: '个人风光摄影作品集，探索镜头下的山川湖海与人文故事',
};

export default function Home() {
  return <LandingPage />;
}
