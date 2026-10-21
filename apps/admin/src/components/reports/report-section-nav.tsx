import Link from "next/link";

const SECTIONS = [
  { href: "/reports", label: "Overview" },
  { href: "/reports/hour", label: "The Hour" },
  { href: "/reports/events", label: "Events" },
  { href: "/reports/members", label: "Members" },
  { href: "/reports/directory-content", label: "Directory & Content" },
] as const;

// Persistent sub-navigation shown on every /reports/* page — the "tree
// persists" piece, so a section stays reachable from anywhere else in
// Reports without a trip back to the hub.
export function ReportSectionNav({ active }: { active: (typeof SECTIONS)[number]["href"] }) {
  return (
    <div className="mb-8 flex flex-wrap gap-x-1 border-b border-grey/15 text-sm">
      {SECTIONS.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className={`flex min-h-[44px] items-center px-2.5 font-medium transition ${
            active === s.href ? "border-b-2 border-orange text-ink" : "text-grey hover:text-ink"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}
