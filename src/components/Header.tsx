'use client';

interface HeaderProps {
  title?: string;
  rightContent?: React.ReactNode;
}

export default function Header({ title, rightContent }: HeaderProps) {
  return (
    <header className="sticky top-0 z-[100] bg-dark-950/85 backdrop-blur-xl border-b border-dark-800 px-6">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between h-16">
        <a href="/" className="text-xl font-light tracking-widest flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-gold">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span className="text-accent-gold">摄影</span>日记
        </a>
        <div className="flex items-center gap-4">
          {title && <span className="text-sm text-accent-gray">{title}</span>}
          {rightContent}
        </div>
      </div>
    </header>
  );
}
