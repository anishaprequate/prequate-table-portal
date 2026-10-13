import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { respondToIntroduction } from "@/lib/actions/members";
import { INTRODUCTION_STATUS_LABELS, type IntroductionStatus } from "@prequate/core";
import { formatDateOnly } from "@/lib/format";
import { PageHero } from "@/components/page-hero";
import { UnreadBadge } from "@/components/unread-badge";
import { MembersFilterBar } from "@/components/members-filter-bar";
import { Avatar } from "@/components/avatar";

export default async function MembersPage({
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
      <PageHero title="The" accent="Members." subtitle="Everyone at the Table, and where your introductions stand." />

      <div className="mb-8 flex gap-6 border-b border-taupe/15 text-sm">
        <Link
          href="/members?tab=directory"
          className={`flex items-center gap-2 border-b-2 pb-3 font-medium transition-all duration-300 ${
            tab === "directory" ? "border-foil text-ink" : "border-transparent text-taupe hover:text-ink"
          }`}
        >
          All Members
        </Link>
        <Link
          href="/members?tab=sent"
          className={`flex items-center gap-2 border-b-2 pb-3 font-medium transition-all duration-300 ${
            tab === "sent" ? "border-foil text-ink" : "border-transparent text-taupe hover:text-ink"
          }`}
        >
          Requested by you
        </Link>
        <Link
          href="/members?tab=received"
          className={`flex items-center gap-2 border-b-2 pb-3 font-medium transition-all duration-300 ${
            tab === "received" ? "border-foil text-ink" : "border-transparent text-taupe hover:text-ink"
          }`}
        >
          Requested to you
          <UnreadBadge count={pendingReceived} />
        </Link>
      </div>

      {tab === "directory" && (
        <>
          <MembersFilterBar
            q={q}
            sector={sectorFilter}
            eventId={eventFilter}
            sectorOptions={sectors}
            eventOptions={eventOptions}
            hasActiveFilter={hasActiveFilter}
          />

          {hasActiveFilter && (
            <p className="mb-4 text-xs uppercase tracking-[0.28em] text-taupe">
              {members.length} match{members.length === 1 ? "" : "es"}
            </p>
          )}

          {members.length === 0 && <p className="py-4 text-sm text-taupe">No one matches that search.</p>}

          <ul className="flex flex-col divide-y divide-taupe/15">
          {members.map((member) => (
            <li key={member.id}>
              <Link
                href={`/members/${member.id}`}
                className="-mx-3 flex items-start gap-4 rounded-md px-3 py-5 transition-colors duration-300 hover:bg-ink/[0.03]"
              >
                <Avatar name={member.name} photoUrl={member.photoUrl} size="md" />
                <div>
                  <p className="font-display text-xl italic leading-tight text-ink">{member.name}</p>
                  {member.seatType && <p className="text-xs text-taupe">{member.seatType}</p>}
                  {member.bio && <p className="mt-2 text-sm text-taupe">{member.bio}</p>}
                </div>
              </Link>
            </li>
          ))}
          </ul>
        </>
      )}

      {tab === "sent" && (
        <ul className="flex flex-col divide-y divide-taupe/15">
          {sent.length === 0 && <p className="py-4 text-sm text-taupe">You haven't requested an introduction yet.</p>}
          {sent.map((request) => (
            <li key={request.id}>
              <Link
                href={`/members/requests/${request.id}`}
                className="-mx-3 block rounded-md px-3 py-4 transition-colors duration-300 hover:bg-ink/[0.03]"
              >
                <p className="font-display text-xl italic leading-tight text-ink">{request.target.name}</p>
                <p className="text-sm text-taupe">
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
            <p className="card mb-6 animate-fade-up bg-foil/5 px-3 py-2 text-sm text-ink">Thanks — noted.</p>
          )}
          <ul className="flex flex-col divide-y divide-taupe/15">
            {received.length === 0 && (
              <p className="py-4 text-sm text-taupe">No one has asked to be introduced yet.</p>
            )}
            {received.map((request) => (
              <li key={request.id} className="py-4">
                <Link
                  href={`/members/requests/${request.id}`}
                  className="-mx-3 block rounded-md px-3 py-2 transition-colors duration-300 hover:bg-ink/[0.03]"
                >
                  <p className="font-display text-xl italic leading-tight text-ink">{request.requester.name}</p>
                  <p className="mb-2 text-sm text-taupe">
                    {formatDateOnly(request.createdAt)} ·{" "}
                    {INTRODUCTION_STATUS_LABELS[request.status as IntroductionStatus] ?? request.status}
                  </p>
                </Link>
                {request.status === "SENT" && (
                  <form action={respondToIntroduction} className="flex gap-3">
                    <input type="hidden" name="id" value={request.id} />
                    <button type="submit" name="decision" value="ACCEPTED" className="btn-primary w-fit !px-4 !py-2">
                      Accept
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="DECLINED"
                      className="btn-secondary w-fit !px-4 !py-2"
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
