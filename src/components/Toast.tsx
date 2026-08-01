'use client';

import { useState, useEffect } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}

let toastId = 0;
let addToastFn: ((text: string, type: 'success' | 'error') => void) | null = null;

export function toast(text: string, type: 'success' | 'error' = 'success') {
  addToastFn?.(text, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToastFn = (text, type) => {
      const id = ++toastId;
      setToasts(prev => [...prev, { id, text, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
    return () => { addToastFn = null; };
  }, []);

  return (
    <div className="fixed top-20 right-6 z-[2000] flex flex-col gap-2 max-sm:left-3 max-sm:right-3">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-5 py-3 rounded text-sm animate-toast-in max-w-sm ${
            t.type === 'success'
              ? 'bg-green-950/50 text-green-400 border border-green-500/30'
              : 'bg-red-950/50 text-red-400 border border-red-500/30'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
