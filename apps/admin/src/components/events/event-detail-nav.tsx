import Link from "next/link";

// Persistent sub-navigation on every /events/[id]/* page — Registration,
// Guests, and Blasts were query-param tabs before; Overview and Edit were
// blended into the same page as everything else. Now each is a real route,
// and this keeps all five reachable from any one of them.
export function EventDetailNav({
  eventId,
  active,
  showEdit,
}: {
  eventId: string;
  active: "overview" | "edit" | "registration" | "guests" | "blasts";
  showEdit: boolean;
}) {
  const base = `/events/${eventId}`;
  const items = [
    { key: "overview", href: base, label: "Overview" },
    ...(showEdit ? [{ key: "edit", href: `${base}/edit`, label: "Edit" }] : []),
    { key: "registration", href: `${base}/registration`, label: "Registration" },
    { key: "guests", href: `${base}/guests`, label: "Guests" },
    { key: "blasts", href: `${base}/blasts`, label: "Blasts" },
  ] as const;

  return (
    <div className="mb-6 flex flex-wrap gap-6 border-b border-grey/15 text-sm">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`pb-3 font-medium transition ${
            active === item.key ? "border-b-2 border-orange text-ink" : "text-grey hover:text-ink"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
