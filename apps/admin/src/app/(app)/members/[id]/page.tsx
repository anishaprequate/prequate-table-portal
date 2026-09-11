import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { getMemberOrNull } from "@/lib/member-detail";
import { MemberHeader } from "@/components/members/member-header";
import { MemberDetailNav } from "@/components/members/member-detail-nav";
import { BackLink } from "@/components/back-link";

export default async function MemberOverviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);

  const member = await getMemberOrNull(params.id);
  if (!member) notFound();

  const interests = await prisma.memberInterest.findMany({
    where: { memberId: member.id },
    include: { category: true },
    orderBy: { category: { sortOrder: "asc" } },
  });

  return (
    <div className="max-w-md">
      <MemberHeader member={member} writable={writable} />
      <MemberDetailNav memberId={member.id} active="overview" showEdit={writable} />

      {searchParams.saved && <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>}

      <div className="mb-6 rounded-md border border-grey/15 p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-grey">Contact</p>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Seat</dt>
            <dd className="text-sm text-ink">
              {member.seatNumber ? `Seat ${member.seatNumber}` : "—"} {member.seatType && `· ${member.seatType}`}
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Email</dt>
            <dd className="text-sm text-ink">{member.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Phone</dt>
            <dd className="text-sm text-ink">{member.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">LinkedIn</dt>
            <dd className="text-sm text-ink">
              {member.linkedinUrl ? (
                <a
                  href={member.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-deep-orange hover:underline"
                >
                  {member.linkedinUrl}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mb-6 rounded-md border border-grey/15 p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-grey">About</p>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Bio</dt>
            <dd className="text-sm text-ink">{member.bio ?? "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Detailed bio</dt>
            <dd className="whitespace-pre-wrap text-sm text-ink">{member.longBio ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="mb-6 rounded-md border border-grey/15 p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-grey">Tags</p>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Sector</dt>
            <dd className="text-sm text-ink">{member.sector ?? "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Archetype</dt>
            <dd className="text-sm text-ink">{member.archetype ?? "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Interests</dt>
            <dd className="text-sm">
              {interests.length === 0 ? (
                <span className="text-ink">—</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {interests.map((i) => (
                    <span key={i.id} className="rounded-full bg-orange/10 px-3 py-1 text-xs text-deep-orange">
                      {i.category.label}
                    </span>
                  ))}
                </div>
              )}
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Directory</dt>
            <dd className="text-sm text-ink">{member.directoryOptOut ? "Hidden" : "Visible"}</dd>
          </div>
        </dl>
      </div>

      <BackLink href="/members" />
    </div>
  );
}
