import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { sendMessage } from "@/lib/actions/messages";
import { MessageTextarea } from "@/components/message-textarea";
import { MessageThread } from "@/components/message-thread";

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

  const title = isRm ? "Your Relationship Manager" : partner!.name;

  return (
    <div className="flex h-[calc(100vh-5rem)] max-w-lg flex-col md:h-[calc(100vh-12rem)]">
      <div className="flex-shrink-0 pb-4">
        <h1 className="mb-1 font-display text-4xl italic leading-tight text-ink sm:text-5xl">{title}</h1>
        <p className="text-sm text-grey">
          {isRm ? "Separate from concierge." : "A direct line, separate from your RM."}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <MessageThread
          key={messages.length}
          initialMessages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
          partnerKey={isRm ? "rm" : partnerId!}
        />
      </div>

      <form action={sendMessage} className="flex flex-shrink-0 flex-col gap-3 pt-3">
        {!isRm && <input type="hidden" name="partnerId" value={partner!.id} />}
        <MessageTextarea
          key={messages.length}
          name="body"
          rows={3}
          required
          autoFocus
          placeholder={isRm ? "Write to your RM. Enter to send, shift+enter for a new line." : `Write to ${partner!.name}. Enter to send, shift+enter for a new line.`}
          className="w-full rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
        />
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Send
          </button>
          <Link
            href="/messages"
            className="flex-1 rounded-md border border-grey/30 px-4 py-3 text-center text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Back
          </Link>
        </div>
      </form>
    </div>
  );
}
