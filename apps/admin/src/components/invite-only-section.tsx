"use client";

import { useState } from "react";

export function InviteOnlySection({
  formId,
  defaultChecked,
  children,
}: {
  formId: string;
  defaultChecked: boolean;
  children: React.ReactNode;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="inviteOnly"
          form={formId}
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="h-4 w-4 accent-orange"
        />
        Invite-only — hidden from members until admin-invited
      </label>
      {checked && children}
    </div>
  );
}
