import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { getMemberOrNull } from "@/lib/member-detail";
import { adminUpdateMember } from "@/lib/actions/members";
import { MEMBER_LIFECYCLE_STATUSES, MEMBER_LIFECYCLE_LABELS } from "@prequate/core";
import { MemberHeader } from "@/components/members/member-header";
import { MemberDetailNav } from "@/components/members/member-detail-nav";

export default async function MemberEditPage({ params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);
  if (!writable) redirect(`/members/${params.id}`);

  const member = await getMemberOrNull(params.id);
  if (!member) notFound();

  return (
    <div className="max-w-md">
      <MemberHeader member={member} writable={writable} />
      <MemberDetailNav memberId={member.id} active="edit" showEdit={writable} />

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

        <label className="flex flex-col gap-1.5 text-sm">
          Points balance
          <input
            type="number"
            name="points"
            defaultValue={member.points}
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
          />
        </label>

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
    </div>
  );
}
