import Link from "next/link";

// A card as "a shorter version of a specific page" (see docs/design-system.md)
// — 2-4 headline facts and a link to the full page, used on every hub page
// (Reports, Events, and per-event/per-member overviews).
export function HubCard({
  href,
  title,
  facts,
}: {
  href: string;
  title: string;
  facts: { label: string; value: string | number }[];
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-lg border border-grey/15 bg-paper p-6 transition hover:-translate-y-0.5 hover:border-grey/30 hover:shadow-md"
    >
      <h3 className="font-display text-2xl italic leading-tight text-ink group-hover:text-deep-orange">
        {title}
      </h3>
      <dl className="flex flex-col gap-2">
        {facts.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-grey">{f.label}</dt>
            <dd className="font-medium text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}
