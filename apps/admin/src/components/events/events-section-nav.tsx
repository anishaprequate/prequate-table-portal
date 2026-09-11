import Link from "next/link";

const SECTIONS = [
  { href: "/events", label: "Overview" },
  { href: "/events/live", label: "Live" },
  { href: "/events/draft", label: "Draft" },
  { href: "/events/archive", label: "Archive" },
  { href: "/events/import", label: "Import from Luma" },
] as const;

// Persistent sub-navigation on every /events/* page — Live/Draft/Archive
// were query-param tabs on one page before; now they're real routes, and
// this keeps the tree navigable from any of them without a trip to the hub.
export function EventsSectionNav({ active }: { active: (typeof SECTIONS)[number]["href"] }) {
  return (
    <div className="mb-6 flex flex-wrap gap-6 border-b border-grey/15 text-sm">
      {SECTIONS.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className={`pb-3 font-medium transition ${
            active === s.href ? "border-b-2 border-orange text-ink" : "text-grey hover:text-ink"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}
