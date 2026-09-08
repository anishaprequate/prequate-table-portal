import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { formatSlot } from "@/lib/format";
import { UnreadBadge } from "@/components/unread-badge";
import { PageHero } from "@/components/page-hero";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const fullAdmin = canView(admin.role);
  const partnerId = fullAdmin ? null : admin.id;
  const tab = searchParams.tab === "dms" ? "dms" : "conversations";

  const [members, unreadRows] = await Promise.all([
    prisma.user.findMany({
      where: { role: "MEMBER" },
      orderBy: { name: "asc" },
      include: {
        memberThread: {
          where: { partnerId },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.message.groupBy({
      by: ["memberId"],
      where: { partnerId, senderRole: "MEMBER", read: false },
      _count: true,
    }),
  ]);

  const unreadByMember = new Map(unreadRows.map((row) => [row.memberId, row._count]));

  const conversations = members.filter((member) => member.memberThread.length > 0);
  const dms = members.filter((member) => member.memberThread.length === 0);
  const shown = tab === "dms" ? dms : conversations;

  return (
    <div className="max-w-2xl">
      <PageHero
        title="Messages"
        subtitle={fullAdmin ? "One thread per member." : "Your own thread with each member."}
      />

      <div className="mb-8 flex gap-6 border-b border-grey/15">
        <Link
          href="/messages?tab=conversations"
          className={`pb-3 text-sm font-medium transition ${
            tab === "conversations" ? "border-b-2 border-orange text-ink" : "text-grey hover:text-ink"
          }`}
        >
          Conversations ({conversations.length})
        </Link>
        <Link
          href="/messages?tab=dms"
          className={`pb-3 text-sm font-medium transition ${
            tab === "dms" ? "border-b-2 border-orange text-ink" : "text-grey hover:text-ink"
          }`}
        >
          DMs ({dms.length})
        </Link>
      </div>

      <ul className="flex flex-col divide-y divide-grey/15">
        {shown.length === 0 && (
          <li className="py-4 text-sm text-grey">
            {tab === "dms" ? "Nobody left to start a thread with." : "No ongoing conversations yet."}
          </li>
        )}
        {shown.map((member) => {
          const last = member.memberThread[0];
          return (
            <li key={member.id} className="py-4">
              <Link href={`/messages/${member.id}`} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-2xl italic leading-tight text-ink">
                    {member.name}
                    {!fullAdmin && !member.allowPartnerMessages && (
                      <span className="ml-2 text-xs font-sans not-italic text-grey">(messaging off)</span>
                    )}
                  </p>
                  <p className="text-sm text-grey">
                    {last ? `${last.body.slice(0, 60)} · ${formatSlot(last.createdAt)}` : "Say hello."}
                  </p>
                </div>
                <UnreadBadge count={unreadByMember.get(member.id) ?? 0} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
