import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin } from "@/lib/session";
import { formatSlot } from "@/lib/format";
import { PageHero } from "@/components/page-hero";
import { PostComposer } from "@/components/post-composer";

const KIND_LABELS: Record<string, string> = {
  NOTES: "Meeting notes",
  BRIEF: "Brief",
  OBSERVATION: "Follow-up",
  FILE: "File",
};

const clamp = (s: string, n = 220) => (s.length > n ? `${s.slice(0, n - 1).trim()}…` : s);

// A partner's one home: the Hours coming up, each with what the member wrote
// and a short briefing, and the Hours just held that are waiting for notes.
export default async function HoursPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (admin.role !== "PARTNER") redirect("/");

  const now = new Date();
  const recent = new Date(now.getTime() - 21 * 24 * 3_600_000);

  const bookings = await prisma.booking.findMany({
    where: {
      partnerId: admin.id,
      status: { not: "CANCELLED" },
      startTime: { gte: recent },
    },
    include: {
      member: { select: { id: true, name: true, company: true, sector: true, seatType: true, seatingDate: true, bio: true } },
      briefs: { where: { authorId: admin.id }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { startTime: "asc" },
  });

  const upcoming = bookings.filter((b) => b.startTime >= now);
  const held = bookings.filter((b) => b.startTime < now).reverse();

  // For the briefing: how many Hours each member has had with this partner,
  // and what was posted after the last one.
  const memberIds = [...new Set(upcoming.map((b) => b.member.id))];
  const history = memberIds.length
    ? await prisma.booking.findMany({
        where: { partnerId: admin.id, memberId: { in: memberIds }, startTime: { lt: now }, status: { not: "CANCELLED" } },
        orderBy: { startTime: "desc" },
        include: { briefs: { where: { authorId: admin.id }, orderBy: { createdAt: "desc" }, take: 1 } },
      })
    : [];
  const pastWith = (memberId: string) => history.filter((h) => h.memberId === memberId);

  return (
    <div className="max-w-2xl">
      <PageHero title="My" accent="Hours." subtitle="What is coming up, and what is waiting for your notes." />

      <section className="mb-12">
        <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">Coming up ({upcoming.length})</h2>
        {upcoming.length === 0 && <p className="text-sm text-grey">No Hours booked yet.</p>}
        <ul className="flex flex-col gap-4">
          {upcoming.map((b) => {
            const past = pastWith(b.member.id);
            const last = past[0];
            const lastPost = last?.briefs[0];
            const about = [b.member.company, b.member.sector, b.member.seatType].filter(Boolean).join(" · ");
            return (
              <li key={b.id} className="rounded-lg border border-grey/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-2xl italic leading-tight text-ink">{b.member.name}</p>
                    <p className="text-sm text-grey">{formatSlot(b.startTime)}</p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-grey/10 px-3 py-1 text-xs text-ink">
                    {b.mode === "ONLINE" ? "Online" : "In person"}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="mb-1 text-xs uppercase tracking-wide text-grey">What they would like to bring</p>
                  <p className="text-sm text-ink">{b.memberContext ?? "They have not written anything."}</p>
                </div>

                <div className="mt-4 rounded-md bg-grey/5 p-3">
                  <p className="mb-1 text-xs uppercase tracking-wide text-grey">Briefing</p>
                  <ul className="flex flex-col gap-1 text-sm text-ink">
                    {about && <li>{about}</li>}
                    <li>
                      {past.length === 0
                        ? "Your first Hour together."
                        : `${past.length} earlier Hour${past.length === 1 ? "" : "s"} with you.`}
                    </li>
                    {b.member.seatingDate && (
                      <li>Seated since {new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(b.member.seatingDate)}.</li>
                    )}
                    {lastPost && (
                      <li className="text-grey">
                        Last time ({KIND_LABELS[lastPost.kind] ?? "Notes"}): {lastPost.content ? clamp(lastPost.content, 160) : lastPost.fileName}
                      </li>
                    )}
                  </ul>
                </div>

                <Link
                  href={`/bookings/${b.id}`}
                  className="mt-3 inline-flex min-h-[44px] items-center text-sm text-deep-orange underline underline-offset-2"
                >
                  Open this Hour
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">Held ({held.length})</h2>
        {held.length === 0 && <p className="text-sm text-grey">Nothing in the last three weeks.</p>}
        <ul className="flex flex-col gap-4">
          {held.map((b) => (
            <li key={b.id} className="rounded-lg border border-grey/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-xl italic leading-tight text-ink">{b.member.name}</p>
                  <p className="text-sm text-grey">{formatSlot(b.startTime)}</p>
                </div>
                {b.briefs.length === 0 && (
                  <span className="flex-shrink-0 rounded-full bg-orange/15 px-3 py-1 text-xs text-ink">Needs your notes</span>
                )}
              </div>

              {b.briefs.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2">
                  {b.briefs.map((p) => (
                    <li key={p.id} className="text-sm">
                      <span className="text-xs uppercase tracking-wide text-grey">{KIND_LABELS[p.kind] ?? "Notes"} </span>
                      {p.content ? clamp(p.content, 160) : p.fileName}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4">
                <PostComposer bookingId={b.id} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
