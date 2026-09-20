import React, { createContext, useCallback, useContext, useState } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}

interface ToastContextState {
  notify: (text: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextState | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.text}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextState {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
