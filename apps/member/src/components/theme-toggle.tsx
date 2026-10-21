"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function current(): Theme {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// One tap switches between the light and the dark Table. The choice is kept on
// this device; until it is made, the device's own setting applies.
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(current());
    // Follow the device while the member has not chosen.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!document.documentElement.getAttribute("data-theme")) setTheme(current());
    };
    mq.addEventListener("change", onChange);
    // The menu and the sidebar each hold a toggle; keep them in step.
    const onChosen = () => setTheme(current());
    window.addEventListener("table-theme", onChosen);
    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener("table-theme", onChosen);
    };
  }, []);

  function toggle() {
    const next: Theme = current() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("table-theme", next);
    } catch {
      /* private mode: the choice lasts for this visit only */
    }
    setTheme(next);
    window.dispatchEvent(new Event("table-theme"));
  }

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Switch to the light Table" : "Switch to the dark Table"}
      className={`tap flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 text-sm text-taupe transition-colors duration-300 hover:bg-ink/[0.06] hover:text-ink ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        )}
      </svg>
      <span>{theme === null ? "Appearance" : dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
