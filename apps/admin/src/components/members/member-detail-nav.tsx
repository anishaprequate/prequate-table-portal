import Link from "next/link";

// Persistent sub-navigation on every /members/[id]/* page.
export function MemberDetailNav({
  memberId,
  active,
  showEdit,
}: {
  memberId: string;
  active: "overview" | "activity" | "timeline" | "edit";
  showEdit: boolean;
}) {
  const base = `/members/${memberId}`;
  const items = [
    { key: "overview", href: base, label: "Overview" },
    { key: "activity", href: `${base}/activity`, label: "Activity" },
    { key: "timeline", href: `${base}/timeline`, label: "Timeline" },
    ...(showEdit ? [{ key: "edit", href: `${base}/edit`, label: "Edit" }] : []),
  ] as const;

  return (
    <div className="mb-6 flex flex-wrap gap-x-1 border-b border-grey/15 text-sm">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`flex min-h-[44px] items-center px-2.5 font-medium transition ${
            active === item.key ? "border-b-2 border-orange text-ink" : "text-grey hover:text-ink"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
