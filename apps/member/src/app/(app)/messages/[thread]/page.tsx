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
    <div className="flex h-[calc(100dvh-5rem)] max-w-lg flex-col md:h-[calc(100dvh-12rem)]">
      <div className="flex flex-shrink-0 items-start gap-3 pb-4">
        <Link href="/messages" aria-label="Back to messages" className="mt-2 flex-shrink-0 text-grey transition hover:text-ink">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 4.5L6 10l6.5 5.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="mb-1 font-display text-4xl italic leading-tight text-ink sm:text-5xl">{title}</h1>
          <p className="text-sm text-grey">
            {isRm ? "Separate from concierge." : "A direct line, separate from your RM."}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <MessageThread
          key={messages.length}
          initialMessages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
          partnerKey={isRm ? "rm" : partnerId!}
        />
      </div>

      <form action={sendMessage} className="flex flex-shrink-0 items-end gap-2 pt-3">
        {!isRm && <input type="hidden" name="partnerId" value={partner!.id} />}
        <MessageTextarea
          key={messages.length}
          name="body"
          rows={1}
          required
          autoFocus
          placeholder={isRm ? "Write to your RM..." : `Write to ${partner!.name}...`}
          className="w-full flex-1 rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
        />
        <button
          type="submit"
          aria-label="Send"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-orange text-ink transition hover:bg-deep-orange hover:text-paper"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 15.5V4.5M10 4.5L4.5 10M10 4.5L15.5 10" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  );
}
