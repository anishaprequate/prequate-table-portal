"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { PasswordInput } from "@/components/password-input";
import type { PasswordState } from "@/lib/actions/auth";

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[44px] rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-50"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

// Change your own password. The hidden username lets a password manager know
// which login the new password belongs to, so it offers to update the saved one.
export function ChangePasswordForm({
  username,
  action,
}: {
  username: string;
  action: (prev: PasswordState, formData: FormData) => Promise<PasswordState>;
}) {
  const [state, run] = useFormState<PasswordState, FormData>(action, { status: "idle" });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "ok") ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={run} className="flex max-w-sm flex-col gap-3">
      <input type="text" name="username" autoComplete="username" defaultValue={username} readOnly hidden />
      <label className="flex flex-col gap-1.5 text-sm">
        Current password
        <PasswordInput name="current" id="current" required label="Current password" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        New password
        <PasswordInput name="next" id="next" required autoComplete="new-password" label="New password" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        New password again
        <PasswordInput name="confirm" id="confirm" required autoComplete="new-password" label="New password again" />
      </label>
      {state.status === "error" && <p className="text-sm text-deep-orange" role="alert">{state.message}</p>}
      {state.status === "ok" && <p className="text-sm text-ink" role="status">{state.message}</p>}
      <div>
        <Save label="Change password" />
      </div>
    </form>
  );
}

// The owner sets a password for someone else.
export function SetPasswordForm({
  userId,
  username,
  action,
}: {
  userId: string;
  username: string;
  action: (prev: PasswordState, formData: FormData) => Promise<PasswordState>;
}) {
  const [state, run] = useFormState<PasswordState, FormData>(action, { status: "idle" });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "ok") ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={run} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <PasswordInput name="next" id={`next-${userId}`} required autoComplete="new-password" placeholder={`New password for ${username}`} label={`New password for ${username}`} />
        </div>
        <Save label="Set" />
      </div>
      {state.status === "error" && <p className="text-sm text-deep-orange" role="alert">{state.message}</p>}
      {state.status === "ok" && <p className="text-sm text-ink" role="status">{state.message}</p>}
    </form>
  );
}
