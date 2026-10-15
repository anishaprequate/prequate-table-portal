"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastItem = { id: number; message: string };

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

// One short confirmation at a time, bottom of the screen, gone in a few
// seconds. Replaces "Saved." banners that sit at the top of a reloaded page.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((message: string) => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), message });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-6"
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-lg bg-ink px-5 py-3 text-sm text-bone shadow-lg"
            style={{ animation: "toast-in 250ms cubic-bezier(0.16, 1, 0.3, 1) both" }}
          >
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
