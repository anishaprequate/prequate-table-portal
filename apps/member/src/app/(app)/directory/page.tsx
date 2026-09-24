import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { respondToIntroduction } from "@/lib/actions/directory";
import { INTRODUCTION_STATUS_LABELS, type IntroductionStatus } from "@prequate/core";
import { formatDateOnly } from "@/lib/format";
import { PageHero } from "@/components/page-hero";
import { UnreadBadge } from "@/components/unread-badge";
import { DirectoryFilterBar } from "@/components/directory-filter-bar";
import { Avatar } from "@/components/avatar";

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: {
    tab?: string;
    requested?: string;
    responded?: string;
    q?: string;
    sector?: string;
    eventId?: string;
  };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tab = searchParams.tab === "sent" || searchParams.tab === "received" ? searchParams.tab : "directory";
  const q = searchParams.q?.trim() ?? "";
  const sectorFilter = searchParams.sector ?? "";
  const eventFilter = searchParams.eventId ?? "";

  const visibleWhere = { role: "MEMBER", directoryOptOut: false, id: { not: user.id } } as const;

  const [members, filterOptions, eventOptions, sent, received] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...visibleWhere,
        ...(q && { name: { contains: q } }),
        ...(sectorFilter && { sector: sectorFilter }),
        ...(eventFilter && { eventAttendances: { some: { eventId: eventFilter, joined: true } } }),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, seatType: true, sector: true, bio: true, photoUrl: true },
    }),
    prisma.user.findMany({
      where: visibleWhere,
      select: { sector: true },
    }),
    prisma.event.findMany({
      where: { archivedAt: null },
      select: { id: true, title: true },
      orderBy: { startTime: "desc" },
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
  const hasActiveFilter = Boolean(q || sectorFilter || eventFilter);

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
          <DirectoryFilterBar
            q={q}
            sector={sectorFilter}
            eventId={eventFilter}
            sectorOptions={sectors}
            eventOptions={eventOptions}
            hasActiveFilter={hasActiveFilter}
          />

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
                <Avatar name={member.name} photoUrl={member.photoUrl} size="md" />
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
