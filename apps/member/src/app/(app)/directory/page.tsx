import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { respondToIntroduction } from "@/lib/actions/directory";
import { INTRODUCTION_STATUS_LABELS, type IntroductionStatus } from "@prequate/core";
import { formatDateOnly } from "@/lib/format";
import { PageHero } from "@/components/page-hero";
import { UnreadBadge } from "@/components/unread-badge";

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: { tab?: string; requested?: string; responded?: string; q?: string; sector?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tab = searchParams.tab === "sent" || searchParams.tab === "received" ? searchParams.tab : "directory";
  const q = searchParams.q?.trim() ?? "";
  const sectorFilter = searchParams.sector ?? "";

  const visibleWhere = { role: "MEMBER", directoryOptOut: false } as const;

  const [members, filterOptions, sent, received] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...visibleWhere,
        ...(q && { name: { contains: q } }),
        ...(sectorFilter && { sector: sectorFilter }),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, seatType: true, sector: true, bio: true, photoUrl: true },
    }),
    prisma.user.findMany({
      where: visibleWhere,
      select: { sector: true },
    }),
    prisma.introductionRequest.findMany({
      where: { requesterId: user.id },
      include: { target: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.introductionRequest.findMany({
      where: { targetId: user.id, routedAt: { not: null } },
      include: { requester: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const sectors = [...new Set(filterOptions.map((m) => m.sector).filter((v): v is string => Boolean(v)))].sort();
  const hasActiveFilter = Boolean(q || sectorFilter);

  const pendingReceived = received.filter((r) => r.status === "SENT").length;

  return (
    <div className="max-w-2xl">
      <PageHero title="The" accent="Directory." subtitle="Everyone at the Table, and where your introductions stand." />

      <div className="mb-8 flex gap-6 border-b border-grey/15 text-sm">
        <Link
          href="/directory?tab=directory"
          className={`flex items-center gap-2 pb-3 font-medium transition ${
            tab === "directory" ? "border-b-2 border-orange text-ink" : "text-grey hover:text-ink"
          }`}
        >
          Directory
        </Link>
        <Link
          href="/directory?tab=sent"
          className={`flex items-center gap-2 pb-3 font-medium transition ${
            tab === "sent" ? "border-b-2 border-orange text-ink" : "text-grey hover:text-ink"
          }`}
        >
          Requested by you
        </Link>
        <Link
          href="/directory?tab=received"
          className={`flex items-center gap-2 pb-3 font-medium transition ${
            tab === "received" ? "border-b-2 border-orange text-ink" : "text-grey hover:text-ink"
          }`}
        >
          Requested to you
          <UnreadBadge count={pendingReceived} />
        </Link>
      </div>

      {tab === "directory" && (
        <>
          <form className="mb-6 flex items-center gap-3 border-b border-grey/30 pb-2" action="/directory">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by name"
              className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-grey/70"
            />
            <details className="relative flex-shrink-0">
              <summary
                aria-label="Filter"
                className="flex cursor-pointer list-none items-center text-grey transition hover:text-ink [&::-webkit-details-marker]:hidden"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 2.5h14M4 8h8M6.5 13.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </summary>
              <div className="absolute right-0 top-full z-10 mt-3 w-48 rounded-md border border-grey/20 bg-paper p-3 shadow-md">
                <label className="mb-1 block text-xs uppercase tracking-wide text-grey">Sector</label>
                <select
                  name="sector"
                  defaultValue={sectorFilter}
                  className="w-full rounded-md border border-grey/30 bg-paper px-2 py-1.5 text-sm text-ink"
                >
                  <option value="">All sectors</option>
                  {sectors.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="mt-3 w-full rounded-md bg-orange px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
                >
                  Apply
                </button>
              </div>
            </details>
            {hasActiveFilter && (
              <Link href="/directory" className="flex-shrink-0 text-xs text-grey underline hover:text-ink">
                Clear
              </Link>
            )}
          </form>

          {hasActiveFilter && (
            <p className="mb-4 text-xs uppercase tracking-wide text-grey">
              {members.length} match{members.length === 1 ? "" : "es"}
            </p>
          )}

          {members.length === 0 && <p className="py-4 text-sm text-grey">No one matches that search.</p>}

          <ul className="flex flex-col divide-y divide-grey/15">
          {members.map((member) => (
            <li key={member.id} className="py-5">
              <Link href={`/directory/${member.id}`} className="flex items-start gap-4">
                {member.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.photoUrl}
                    alt=""
                    className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange/10 font-display text-base text-ink">
                    {member.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-display text-xl italic leading-tight text-ink">{member.name}</p>
                  {member.seatType && <p className="text-xs text-grey">{member.seatType}</p>}
                  {member.bio && <p className="mt-2 text-sm text-grey">{member.bio}</p>}
                </div>
              </Link>
            </li>
          ))}
          </ul>
        </>
      )}

      {tab === "sent" && (
        <ul className="flex flex-col divide-y divide-grey/15">
          {sent.length === 0 && <p className="py-4 text-sm text-grey">You haven't requested an introduction yet.</p>}
          {sent.map((request) => (
            <li key={request.id} className="py-4">
              <Link href={`/directory/requests/${request.id}`} className="block">
                <p className="font-display text-xl italic leading-tight text-ink">{request.target.name}</p>
                <p className="text-sm text-grey">
                  {formatDateOnly(request.createdAt)} ·{" "}
                  {INTRODUCTION_STATUS_LABELS[request.status as IntroductionStatus] ?? request.status}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {tab === "received" && (
        <>
          {searchParams.responded && (
            <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Thanks — noted.</p>
          )}
          <ul className="flex flex-col divide-y divide-grey/15">
            {received.length === 0 && (
              <p className="py-4 text-sm text-grey">No one has asked to be introduced yet.</p>
            )}
            {received.map((request) => (
              <li key={request.id} className="py-4">
                <Link href={`/directory/requests/${request.id}`} className="block">
                  <p className="font-display text-xl italic leading-tight text-ink">{request.requester.name}</p>
                  <p className="mb-2 text-sm text-grey">
                    {formatDateOnly(request.createdAt)} ·{" "}
                    {INTRODUCTION_STATUS_LABELS[request.status as IntroductionStatus] ?? request.status}
                  </p>
                </Link>
                {request.status === "SENT" && (
                  <form action={respondToIntroduction} className="flex gap-3">
                    <input type="hidden" name="id" value={request.id} />
                    <button
                      type="submit"
                      name="decision"
                      value="ACCEPTED"
                      className="w-fit rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
                    >
                      Accept
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="DECLINED"
                      className="w-fit rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
                    >
                      Decline
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
