import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { getMemberOrNull, getMemberActivity } from "@/lib/member-detail";
import { provisionCard, deactivateCard } from "@/lib/actions/members";
import { formatSlot } from "@/lib/format";
import { MemberHeader } from "@/components/members/member-header";
import { MemberDetailNav } from "@/components/members/member-detail-nav";
import { BackLink } from "@/components/back-link";

export default async function MemberActivityPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; error?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);

  const member = await getMemberOrNull(params.id);
  if (!member) notFound();

  const { hoursUsed, conciergeUsed, bookingStats } = await getMemberActivity(member.id);

  return (
    <div className="max-w-md">
      <MemberHeader member={member} writable={writable} />
      <MemberDetailNav memberId={member.id} active="activity" showEdit={writable} />

      {searchParams.saved && <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>}

      <div className="mb-6 rounded-md border border-grey/15 p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-grey">Standing</p>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Points</dt>
            <dd className="text-sm text-ink">{member.points}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Last used the app</dt>
            <dd className="text-sm text-ink">{member.lastActiveAt ? formatSlot(member.lastActiveAt) : "Never"}</dd>
          </div>
        </dl>
      </div>

      <div className="mb-6 rounded-md border border-grey/15 p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-grey">The Hour &amp; Concierge</p>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Hours used</dt>
            <dd className="text-sm text-ink">{hoursUsed}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Hour reliability (last 90 days)</dt>
            <dd className="text-sm text-ink">
              {bookingStats.noShows} no-show{bookingStats.noShows === 1 ? "" : "s"} ·{" "}
              {bookingStats.lateCancellations} late cancellation{bookingStats.lateCancellations === 1 ? "" : "s"}
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Concierge services used</dt>
            <dd className="text-sm text-ink">{conciergeUsed}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-md border border-grey/15 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-grey">NFC card</p>
        {searchParams.error === "missing-uid" && (
          <p className="mb-3 text-sm text-deep-orange">Enter the card&apos;s UID before provisioning.</p>
        )}
        {searchParams.error === "uid-taken" && (
          <p className="mb-3 text-sm text-deep-orange">That UID is already bound to a different member.</p>
        )}
        <p className="mb-3 text-sm text-ink">
          {member.chipUid ? (
            <>
              Active — <span className="font-medium">{member.chipUid}</span>
            </>
          ) : (
            "No card provisioned."
          )}
        </p>
        {writable && (
          <div className="flex flex-wrap items-center gap-3">
            <form action={provisionCard} className="flex items-center gap-2">
              <input type="hidden" name="memberId" value={member.id} />
              <input
                type="text"
                name="uid"
                placeholder="Card UID"
                className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
              />
              <button
                type="submit"
                className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
              >
                {member.chipUid ? "Provision new card" : "Provision card"}
              </button>
            </form>
            {member.chipUid && (
              <form action={deactivateCard}>
                <input type="hidden" name="memberId" value={member.id} />
                <button
                  type="submit"
                  className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
                >
                  Deactivate card
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="mt-8">
        <BackLink href="/members" />
      </div>
    </div>
  );
}
