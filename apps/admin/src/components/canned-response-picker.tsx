"use client";

export function CannedResponsePicker({
  responses,
  targetId,
}: {
  responses: { id: string; title: string; body: string }[];
  targetId: string;
}) {
  if (responses.length === 0) return null;

  return (
    <select
      defaultValue=""
      className="w-fit rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
      onChange={(e) => {
        const body = responses.find((r) => r.id === e.target.value)?.body;
        const target = document.getElementById(targetId) as HTMLTextAreaElement | null;
        if (body && target) {
          target.value = body;
          target.focus();
        }
        e.target.value = "";
      }}
    >
      <option value="" disabled>
        Insert a canned response…
      </option>
      {responses.map((response) => (
        <option key={response.id} value={response.id}>
          {response.title}
        </option>
      ))}
    </select>
  );
}
