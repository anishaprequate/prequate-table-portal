"use client";

import { useState } from "react";

// A real password field, so a browser's password manager (Google Password
// Manager included) can save and fill it. Pass autoComplete="current-password"
// when signing in and "new-password" when choosing one.
export function PasswordInput({
  name,
  placeholder,
  required,
  autoComplete = "current-password",
  id,
  label,
}: {
  name: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: "current-password" | "new-password";
  id?: string;
  label?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        name={name}
        id={id ?? name}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        aria-label={label ?? placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="min-h-[44px] w-full rounded-md border border-grey/30 bg-paper px-3 py-3 pr-12 text-base text-ink md:text-sm"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-grey hover:text-ink"
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
            <path d="M4 4l16 16" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
