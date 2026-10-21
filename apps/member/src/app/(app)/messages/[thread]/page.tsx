import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { ChatPanel } from "@/components/chat/chat-panel";
import { getRmFirstName } from "@/lib/rm";

export default async function MessageThreadPage({ params }: { params: { thread: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isRm = params.thread === "rm";
  const partnerId = isRm ? null : params.thread;
  const partner = isRm
    ? null
    : await prisma.user.findFirst({ where: { id: params.thread, role: "PARTNER" } });
  if (!isRm && !partner) notFound();

  await Promise.all([
    prisma.message.updateMany({
      where: { memberId: user.id, partnerId, senderRole: { not: "MEMBER" }, read: false },
      data: { read: true },
    }),
    prisma.notification.updateMany({
      where: {
        recipientId: user.id,
        type: "new_message",
        relatedEntityId: isRm ? "rm" : partnerId ?? undefined,
        readAt: null,
      },
      data: { readAt: new Date() },
    }),
  ]);

  const messages = await prisma.message.findMany({
    where: { memberId: user.id, partnerId },
    orderBy: { createdAt: "asc" },
  });

  const rmName = await getRmFirstName();
  const title = isRm ? rmName : partner!.name;

  return (
    <ChatPanel
      title={title}
      subtitle={isRm ? "Your relationship manager." : "A direct line, separate from your RM."}
      placeholder={isRm ? `Write to ${rmName}…` : `Write to ${partner!.name}…`}
      partnerKey={isRm ? "rm" : partnerId!}
      initialMessages={messages.map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        body: m.body,
        read: m.read,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}
