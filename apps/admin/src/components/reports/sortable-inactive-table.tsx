"use client";

import { useState } from "react";

type Row = { id: string; name: string; lastTouch: Date | null; daysSince: number | null };
type SortKey = "name" | "lastTouch" | "daysSince";

export function SortableInactiveTable({ rows }: { rows: Row[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("daysSince");
  const [asc, setAsc] = useState(false);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(true);
    }
  }

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (sortKey === "lastTouch") cmp = (a.lastTouch ? new Date(a.lastTouch).getTime() : -Infinity) -
      (b.lastTouch ? new Date(b.lastTouch).getTime() : -Infinity);
    else cmp = (a.daysSince ?? Infinity) - (b.daysSince ?? Infinity);
    return asc ? cmp : -cmp;
  });

  const headerButton = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className="flex items-center gap-1 font-normal text-grey hover:text-ink"
    >
      {label}
      {sortKey === key && <span>{asc ? "↑" : "↓"}</span>}
    </button>
  );

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-grey/20 text-xs">
          <th className="pb-2 pr-4">{headerButton("name", "Name")}</th>
          <th className="pb-2 pr-4">{headerButton("lastTouch", "Last touch")}</th>
          <th className="pb-2">{headerButton("daysSince", "Days since")}</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((m) => (
          <tr key={m.id} className="border-b border-grey/10">
            <td className="py-2 pr-4">
              <a href={`/members/${m.id}`} className="font-medium text-deep-orange hover:underline">
                {m.name}
              </a>
            </td>
            <td className="py-2 pr-4 text-grey">
              {m.lastTouch
                ? new Date(m.lastTouch).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "Never"}
            </td>
            <td className="py-2 text-grey">{m.daysSince ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
