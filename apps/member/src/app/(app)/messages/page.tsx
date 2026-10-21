import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { UnreadBadge } from "@/components/unread-badge";
import { PageHero } from "@/components/page-hero";
import { getRmFirstName } from "@/lib/rm";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rmName = await getRmFirstName();
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
        subtitle={`A direct line to ${rmName} and to the partners.`}
      />

      <ul className="flex flex-col divide-y divide-taupe/15">
        <li>
          <Link
            href="/messages/rm"
            className="-mx-3 flex items-center justify-between gap-3 rounded-md px-3 py-4 transition-colors duration-300 hover:bg-ink/[0.03]"
          >
            <div>
              <p className="font-display text-xl italic leading-tight text-ink">
                {rmName}
              </p>
              <p className="text-sm text-taupe">
                {rmMessages[0] ? rmMessages[0].body.slice(0, 60) : "Your relationship manager. Say hello."}
              </p>
            </div>
            <UnreadBadge count={rmUnread} />
          </Link>
        </li>
        {partners.map((partner) => {
          const last = lastByPartner.get(partner.id);
          return (
            <li key={partner.id}>
              <Link
                href={`/messages/${partner.id}`}
                className="-mx-3 flex items-center justify-between gap-3 rounded-md px-3 py-4 transition-colors duration-300 hover:bg-ink/[0.03]"
              >
                <div>
                  <p className="font-display text-xl italic leading-tight text-ink">{partner.name}</p>
                  <p className="text-sm text-taupe">
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
