import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { updateTableRequest } from "@/lib/actions/requests";
import { formatSlot } from "@/lib/format";
import { PageHero } from "@/components/page-hero";

const TYPE_LABELS: Record<string, string> = {
  BRIEF: "Brief",
  PEER_HOUR: "Peer Hour",
  RESTAURANT: "Reservation",
};
const STATUS_LABELS: Record<string, string> = { NEW: "New", IN_PROGRESS: "In progress", DONE: "Done" };

// What members ask for from Home: a brief, a peer Hour, a reservation.
// Introductions have their own page.
export default async function RequestsPage({ searchParams }: { searchParams: { saved?: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);

  const requests = await prisma.tableRequest.findMany({
    include: { member: { select: { name: true, seatNumber: true } } },
    orderBy: [{ createdAt: "desc" }],
  });
  const open = requests.filter((r) => r.status !== "DONE");
  const done = requests.filter((r) => r.status === "DONE");

  const card = (r: (typeof requests)[number]) => (
    <li key={r.id} className="rounded-md border border-grey/15 p-4">
      <p className="font-display text-2xl italic leading-tight text-ink">
        {r.member.name} <span className="text-deep-orange">· {TYPE_LABELS[r.type] ?? r.type}</span>
      </p>
      <p className="mb-3 text-xs text-grey">
        {formatSlot(r.createdAt)} · {STATUS_LABELS[r.status] ?? r.status}
      </p>
      <div className="mb-4 flex flex-col gap-0.5 text-sm text-ink">
        {r.details.split("\n").map((line, i) => {
          const url = line.match(/^Map: (https:\/\/www\.google\.com\/maps\/\S+)$/);
          return url ? (
            <a key={i} href={url[1]} target="_blank" rel="noopener noreferrer" className="text-deep-orange underline">
              Open the place on the map
            </a>
          ) : (
            <p key={i}>{line}</p>
          );
        })}
      </div>
      {writable && (
        <form action={updateTableRequest} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={r.id} />
          <textarea
            name="adminNote"
            defaultValue={r.adminNote ?? ""}
            rows={2}
            placeholder="Note for the team"
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
          />
          <div className="flex items-center gap-2">
            <select
              name="status"
              defaultValue={r.status}
              className="rounded-md border border-grey/30 bg-paper px-2 py-1.5 text-sm text-ink"
            >
              {Object.entries(STATUS_LABELS).map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-grey/30 px-4 py-1.5 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Save
            </button>
          </div>
        </form>
      )}
    </li>
  );

  return (
    <div className="max-w-2xl">
      <PageHero title="Requests" subtitle="Briefs, peer Hours and reservations members ask for from Home." />
      {searchParams.saved && <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>}

      <p className="mb-3 text-xs uppercase tracking-wide text-grey">Open ({open.length})</p>
      <ul className="mb-10 flex flex-col gap-4">
        {open.map(card)}
        {open.length === 0 && <p className="text-sm text-grey">Nothing waiting.</p>}
      </ul>

      {done.length > 0 && (
        <>
          <p className="mb-3 text-xs uppercase tracking-wide text-grey">Done ({done.length})</p>
          <ul className="flex flex-col gap-4">{done.map(card)}</ul>
        </>
      )}
    </div>
  );
}
