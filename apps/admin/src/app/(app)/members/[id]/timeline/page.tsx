import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { getMemberOrNull } from "@/lib/member-detail";
import { addMemberNote } from "@/lib/actions/members";
import { formatSlot } from "@/lib/format";
import { MemberHeader } from "@/components/members/member-header";
import { MemberDetailNav } from "@/components/members/member-detail-nav";
import { BackLink } from "@/components/back-link";

export default async function MemberTimelinePage({ params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);

  const member = await getMemberOrNull(params.id);
  if (!member) notFound();

  const timeline = await prisma.memberTimelineEntry.findMany({
    where: { memberId: member.id },
    include: { author: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-md">
      <MemberHeader member={member} writable={writable} />
      <MemberDetailNav memberId={member.id} active="timeline" showEdit={writable} />

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
            <p className={`text-sm ${entry.type === "SYSTEM" ? "text-grey" : "text-ink"}`}>{entry.body}</p>
            <p className="mt-1 text-xs text-grey">
              {entry.type === "SYSTEM" ? "System" : entry.author.name} · {formatSlot(entry.createdAt)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <BackLink href="/members" />
      </div>
    </div>
  );
}
