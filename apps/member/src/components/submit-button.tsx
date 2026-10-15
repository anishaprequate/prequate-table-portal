"use client";

import { useFormStatus } from "react-dom";

// A submit button that shows it is working. Use inside any <form action>.
export function SubmitButton({
  children,
  pendingLabel,
  className = "btn-primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className} tap`}>
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}
