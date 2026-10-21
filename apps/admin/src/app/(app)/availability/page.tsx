import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { availability } from "@prequate/core";
import { getCurrentAdmin } from "@/lib/session";
import { PageHero } from "@/components/page-hero";
import { AvailabilityDay, type DaySlotView } from "@/components/availability-day";

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Availability for the next two weeks. A partner sees and changes their own.
// The owner and full admins pick a partner and can change theirs too. Tap a
// time to mark it unavailable; members see the change straight away.
export default async function AvailabilityPage({ searchParams }: { searchParams: { partner?: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const isPartner = admin.role === "PARTNER";
  const isFull = admin.role === "ADMIN_OWNER" || admin.role === "ADMIN_RM";
  if (!isPartner && !isFull) redirect("/");

  const partners = isFull
    ? await prisma.user.findMany({ where: { hostsHours: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];
  const partnerId = isPartner ? admin.id : (partners.find((p) => p.id === searchParams.partner)?.id ?? partners[0]?.id);
  const partner = partnerId
    ? await prisma.user.findUnique({
        where: { id: partnerId },
        select: { id: true, name: true, email: true, tableHoursCalendarId: true },
      })
    : null;

  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15);
  const states = partner ? await availability.getSlotStates(partner, now, to) : [];

  const byDay = new Map<string, DaySlotView[]>();
  for (const s of states) {
    const key = dayKey(s.start);
    byDay.set(key, [
      ...(byDay.get(key) ?? []),
      // A block that comes from the calendar itself (not one of yours) cannot be changed here.
      { start: s.start.toISOString(), state: s.state, editable: s.state !== "blocked" || Boolean(s.blockId) },
    ]);
  }

  const days = [...byDay.entries()];
  const synced = Boolean(partner?.tableHoursCalendarId);
  const first = partner?.name.split(" ")[0];

  return (
    <div className="max-w-2xl">
      <PageHero
        title={isPartner ? "Your" : `${first ?? "Partner"}'s`}
        accent="availability."
        subtitle="Tap a time to mark it unavailable. Tap it again to open it."
      />

      {isFull && partners.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Partner">
          {partners.map((p) => (
            <Link
              key={p.id}
              href={`/availability?partner=${p.id}`}
              aria-current={p.id === partnerId ? "page" : undefined}
              className={`flex min-h-[44px] items-center rounded-full border px-4 text-sm transition ${
                p.id === partnerId ? "border-ink bg-ink text-paper" : "border-grey/30 text-ink hover:border-grey/60"
              }`}
            >
              {p.name.split(" ")[0]}
            </Link>
          ))}
        </div>
      )}

      <p className="mb-8 text-sm text-grey">
        {synced
          ? "These times come from Google Calendar. Anything changed here applies as well."
          : "Table hours follow a weekday pattern for now. When Google Calendar is connected, this screen reads it, and anything changed here still applies."}
      </p>

      {days.length === 0 && <p className="text-sm text-grey">No times in the next two weeks.</p>}
      <ul className="flex flex-col gap-4">
        {days.map(([key, slots]) => {
          const [y, m, d] = key.split("-").map(Number);
          const label = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
          return <AvailabilityDay key={`${partnerId}-${key}`} dayKey={key} label={label} slots={slots} partnerId={isFull ? partnerId : undefined} />;
        })}
      </ul>
    </div>
  );
}
