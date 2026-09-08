import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { UnreadBadge } from "@/components/unread-badge";
import { PageHero } from "@/components/page-hero";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [rmMessages, rmUnread, partners, partnerMessages, partnerUnread] = await Promise.all([
    prisma.message.findMany({
      where: { memberId: user.id, partnerId: null },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
    prisma.message.count({
      where: { memberId: user.id, partnerId: null, senderRole: { not: "MEMBER" }, read: false },
    }),
    prisma.user.findMany({ where: { role: "PARTNER" }, orderBy: { name: "asc" } }),
    prisma.message.findMany({
      where: { memberId: user.id, partnerId: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.message.groupBy({
      by: ["partnerId"],
      where: { memberId: user.id, partnerId: { not: null }, senderRole: { not: "MEMBER" }, read: false },
      _count: true,
    }),
  ]);

  const lastByPartner = new Map<string, (typeof partnerMessages)[number]>();
  for (const message of partnerMessages) {
    if (message.partnerId && !lastByPartner.has(message.partnerId)) {
      lastByPartner.set(message.partnerId, message);
    }
  }

  const unreadByPartner = new Map(
    partnerUnread.map((row) => [row.partnerId as string, row._count]),
  );

  return (
    <div className="max-w-lg">
      <PageHero
        title="Messages"
        subtitle="A direct line to your relationship manager and partners."
      />

      <ul className="flex flex-col divide-y divide-grey/15">
        <li className="py-4">
          <Link href="/messages/rm" className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-xl italic leading-tight text-ink">
                Your Relationship Manager
              </p>
              <p className="text-sm text-grey">
                {rmMessages[0] ? rmMessages[0].body.slice(0, 60) : "Say hello."}
              </p>
            </div>
            <UnreadBadge count={rmUnread} />
          </Link>
        </li>
        {partners.map((partner) => {
          const last = lastByPartner.get(partner.id);
          return (
            <li key={partner.id} className="py-4">
              <Link href={`/messages/${partner.id}`} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xl italic leading-tight text-ink">{partner.name}</p>
                  <p className="text-sm text-grey">
                    {last ? last.body.slice(0, 60) : "No messages yet."}
                  </p>
                </div>
                <UnreadBadge count={unreadByPartner.get(partner.id) ?? 0} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
