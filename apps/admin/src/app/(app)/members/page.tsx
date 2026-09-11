import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { type MemberLifecycleStatus } from "@prequate/core";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { formatSeatDisplay } from "@/lib/format";
import { PageHero } from "@/components/page-hero";
import { LifecycleBadge } from "@/components/lifecycle-badge";
import { MembersFilterBar } from "@/components/members-filter-bar";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: { added?: string; skipped?: string; q?: string; sector?: string; eventId?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");

  const q = searchParams.q ?? "";
  const sector = searchParams.sector ?? "";
  const eventId = searchParams.eventId ?? "";

  const [members, sectorRows, eventOptions] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "MEMBER",
        ...(q && { name: { contains: q } }),
        ...(sector && { sector }),
        ...(eventId && { eventAttendances: { some: { eventId, joined: true } } }),
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ where: { role: "MEMBER" }, select: { sector: true } }),
    prisma.event.findMany({
      where: { archivedAt: null },
      select: { id: true, title: true },
      orderBy: { startTime: "desc" },
    }),
  ]);

  const sectorOptions = Array.from(new Set(sectorRows.map((m) => m.sector).filter(Boolean))).sort() as string[];

  return (
    <div className="max-w-3xl">
      {searchParams.added && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">
          {searchParams.added === "1" ? "Member added." : `${searchParams.added} members added.`}
          {searchParams.skipped && ` ${searchParams.skipped} row(s) skipped (duplicate or missing name).`}
        </p>
      )}

      <div className="flex items-start justify-between gap-6">
        <PageHero
          eyebrow={`${members.length} seated member${members.length === 1 ? "" : "s"}`}
          title="Members"
        />
        {canWrite(admin.role) && (
          <Link
            href="/members/new"
            className="flex-shrink-0 rounded-md bg-orange px-5 py-3 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
          >
            Add member
          </Link>
        )}
      </div>

      <MembersFilterBar
        q={q}
        sector={sector}
        eventId={eventId}
        sectorOptions={sectorOptions}
        eventOptions={eventOptions}
      />

      {members.length === 0 && <p className="mb-10 text-sm text-grey">No members match these filters.</p>}

      {members.length > 0 && (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-grey/20 text-xs text-grey">
              <th className="pb-3 pr-4 font-normal">Name</th>
              <th className="pb-3 pr-4 font-normal">Seat</th>
              <th className="pb-3 pr-4 font-normal">Status</th>
              <th className="pb-3 pr-4 font-normal">Points</th>
              <th className="pb-3 font-normal">Directory</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-grey/10">
                <td className="py-3 pr-4">
                  <Link href={`/members/${member.id}`} className="font-medium text-deep-orange hover:underline">
                    {member.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-grey">{formatSeatDisplay(member.seatNumber)}</td>
                <td className="py-3 pr-4">
                  <LifecycleBadge status={member.lifecycleStatus as MemberLifecycleStatus} />
                </td>
                <td className="py-3 pr-4 text-grey">{member.points}</td>
                <td className="py-3 text-grey">
                  {member.directoryOptOut ? "Hidden" : "Visible"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
