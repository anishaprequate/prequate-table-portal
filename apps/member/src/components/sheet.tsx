"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/lib/use-focus-trap";

// A bottom sheet on phones, a centred panel on wider screens. Closes on
// Escape or a tap on the scrim, keeps keyboard focus inside while it is open,
// and holds the page still behind it.
//
// On a phone the on-screen keyboard shrinks the *visual* viewport, not the
// layout one. The sheet follows the visual viewport, so it sits above the
// keyboard with the focused field in view, instead of hiding behind it.
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, open);

  // Rendered into document.body: page content sits inside animated wrappers,
  // and a transform on an ancestor makes `position: fixed` stick to that
  // wrapper instead of the screen.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Parents pass a fresh onClose on every render; keep the latest in a ref so
  // the effects below depend only on `open`.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const [viewport, setViewport] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    if (!open) return;

    // Hold the page still. `overflow: hidden` alone does not stop iOS from
    // scrolling the page behind, so pin the body and put the scroll back on
    // close.
    const scrollY = window.scrollY;
    const body = document.body;
    const saved = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);

    const vv = window.visualViewport;
    const update = () => vv && setViewport({ top: vv.offsetTop, height: vv.height });
    if (vv) {
      update();
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
    }

    // When a field takes focus (the keyboard is about to open), bring it into
    // view inside the panel once the viewport has settled.
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !panel.current?.contains(el)) return;
      if (!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 280);
    };
    document.addEventListener("focusin", onFocusIn);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      if (vv) {
        vv.removeEventListener("resize", update);
        vv.removeEventListener("scroll", update);
      }
      body.style.position = saved.position;
      body.style.top = saved.top;
      body.style.width = saved.width;
      body.style.overflow = saved.overflow;
      // The page has smooth scrolling on; the restore must not animate.
      window.scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior });
      setViewport(null);
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-50 flex h-[100dvh] items-end justify-center sm:items-center"
      style={viewport ? { top: viewport.top, height: viewport.height } : undefined}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-fade-in"
      />
      <div
        ref={panel}
        tabIndex={-1}
        aria-label={title}
        className="relative w-full overflow-y-auto overscroll-contain rounded-t-xl bg-bone px-6 pb-8 pt-3 shadow-lg sm:max-w-md sm:rounded-xl sm:pt-6"
        style={{
          maxHeight: viewport ? `${Math.floor(viewport.height * 0.94)}px` : "88dvh",
          animation: "sheet-up 300ms cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-taupe/30 sm:hidden" />
        {title && <h2 className="mb-4 font-display text-2xl italic text-ink">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
