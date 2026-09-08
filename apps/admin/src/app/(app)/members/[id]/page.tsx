import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { adminUpdateMember, addMemberNote } from "@/lib/actions/members";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { MEMBER_LIFECYCLE_STATUSES, MEMBER_LIFECYCLE_LABELS, type MemberLifecycleStatus } from "@prequate/core";
import { formatSlot, formatSeatDisplay } from "@/lib/format";
import { BackLink } from "@/components/back-link";
import { EyebrowLabel } from "@/components/eyebrow-label";
import { LifecycleBadge } from "@/components/lifecycle-badge";

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { edit?: string; saved?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");

  const member = await prisma.user.findUnique({ where: { id: params.id } });
  if (!member || member.role !== "MEMBER") notFound();

  const [timeline, hoursUsed, conciergeUsed] = await Promise.all([
    prisma.memberTimelineEntry.findMany({
      where: { memberId: member.id },
      include: { author: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.count({ where: { memberId: member.id, status: "COMPLETED" } }),
    prisma.conciergeRequest.count({ where: { memberId: member.id } }),
  ]);

  const writable = canWrite(admin.role);
  const editing = writable && searchParams.edit === "1";

  return (
    <div className="max-w-md">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <EyebrowLabel>Member profile</EyebrowLabel>
          <h1 className="font-display text-[2.75rem] italic leading-[1.02] tracking-[-0.01em] text-ink">
            {member.name}
          </h1>
        </div>
        {writable && !editing && (
          <Link
            href={`/members/${member.id}?edit=1`}
            className="flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Edit
          </Link>
        )}
      </div>

      {searchParams.saved && !editing && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>
      )}

      {editing ? (
        <form action={adminUpdateMember} className="flex flex-col gap-6">
          <input type="hidden" name="id" value={member.id} />

          <label className="flex flex-col gap-1.5 text-sm">
            Name
            <input
              type="text"
              name="name"
              defaultValue={member.name}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Status
            <select
              name="lifecycleStatus"
              defaultValue={member.lifecycleStatus}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            >
              {MEMBER_LIFECYCLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {MEMBER_LIFECYCLE_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              Seat number
              <input
                type="text"
                name="seatNumber"
                defaultValue={member.seatNumber ?? ""}
                className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Seat type
              <input
                type="text"
                name="seatType"
                defaultValue={member.seatType ?? ""}
                className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            Email
            <input
              type="email"
              name="email"
              defaultValue={member.email ?? ""}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Phone
            <input
              type="tel"
              name="phone"
              defaultValue={member.phone ?? ""}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            LinkedIn
            <input
              type="url"
              name="linkedinUrl"
              defaultValue={member.linkedinUrl ?? ""}
              placeholder="https://linkedin.com/in/..."
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Bio
            <textarea
              name="bio"
              defaultValue={member.bio ?? ""}
              rows={4}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Detailed bio
            <textarea
              name="longBio"
              defaultValue={member.longBio ?? ""}
              rows={6}
              placeholder="Shown behind “Read more” on the directory profile. Typically drawn from their LinkedIn."
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              Sector
              <input
                type="text"
                name="sector"
                defaultValue={member.sector ?? ""}
                placeholder="e.g. FMCG"
                className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Archetype
              <input
                type="text"
                name="archetype"
                defaultValue={member.archetype ?? ""}
                placeholder="e.g. Second-generation"
                className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
              />
            </label>
          </div>
          <p className="-mt-4 text-xs text-grey">
            Used to build targeted event invite lists — freeform, so keep spelling consistent across members.
          </p>

          <label className="flex items-center gap-2 text-sm text-grey">
            <input
              type="checkbox"
              name="showInDirectory"
              defaultChecked={!member.directoryOptOut}
              className="h-4 w-4 accent-orange"
            />
            Visible in the member directory
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              Points balance
              <input
                type="number"
                name="points"
                defaultValue={member.points}
                className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Chip UID
              <input
                type="text"
                name="chipUid"
                defaultValue={member.chipUid ?? ""}
                placeholder="e.g. CHIP-014"
                className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
              />
            </label>
          </div>
          <p className="text-xs text-grey">
            Chip UID is what the stubbed NFC login looks up. Changing it here won't take effect on
            the physical plate until its real chip is provisioned to match.
          </p>

          <div className="flex gap-3">
            <button
              type="submit"
              className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
            >
              Save
            </button>
            <Link
              href={`/members/${member.id}`}
              className="flex w-fit items-center rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Cancel
            </Link>
          </div>
        </form>
      ) : (
        <dl className="mb-10 flex flex-col gap-5">
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Status</dt>
            <dd className="text-sm">
              <LifecycleBadge status={member.lifecycleStatus as MemberLifecycleStatus} />
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Seat</dt>
            <dd className="text-sm">
              {formatSeatDisplay(member.seatNumber) ?? "—"} {member.seatType && `· ${member.seatType}`}
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Email</dt>
            <dd className="text-sm">{member.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Phone</dt>
            <dd className="text-sm">{member.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">LinkedIn</dt>
            <dd className="text-sm">
              {member.linkedinUrl ? (
                <a href={member.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-deep-orange hover:underline">
                  {member.linkedinUrl}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Bio</dt>
            <dd className="text-sm">{member.bio ?? "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Detailed bio</dt>
            <dd className="whitespace-pre-wrap text-sm">{member.longBio ?? "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Sector</dt>
            <dd className="text-sm">{member.sector ?? "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Archetype</dt>
            <dd className="text-sm">{member.archetype ?? "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Directory</dt>
            <dd className="text-sm">{member.directoryOptOut ? "Hidden" : "Visible"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Points</dt>
            <dd className="text-sm">{member.points}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Hours used</dt>
            <dd className="text-sm">{hoursUsed}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Concierge services used</dt>
            <dd className="text-sm">{conciergeUsed}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Last used the app</dt>
            <dd className="text-sm">{member.lastActiveAt ? formatSlot(member.lastActiveAt) : "Never"}</dd>
          </div>
        </dl>
      )}

      <div className="mt-12">
        <p className="mb-4 text-xs uppercase tracking-wide text-grey">Timeline</p>

        {writable && (
          <form action={addMemberNote} className="mb-6 flex flex-col gap-3">
            <input type="hidden" name="memberId" value={member.id} />
            <textarea
              name="body"
              rows={3}
              required
              placeholder="Add a note."
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
            />
            <button
              type="submit"
              className="w-fit rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Add note
            </button>
          </form>
        )}

        <div className="flex flex-col gap-4">
          {timeline.length === 0 && <p className="text-sm text-grey">Nothing recorded yet.</p>}
          {timeline.map((entry) => (
            <div key={entry.id} className="border-l-2 border-grey/20 pl-3">
              <p className={`text-sm ${entry.type === "SYSTEM" ? "text-grey" : "text-ink"}`}>
                {entry.body}
              </p>
              <p className="mt-1 text-xs text-grey">
                {entry.type === "SYSTEM" ? "System" : entry.author.name} · {formatSlot(entry.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <BackLink href="/members" />
    </div>
  );
}
