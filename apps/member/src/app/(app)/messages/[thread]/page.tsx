import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { sendMessage } from "@/lib/actions/messages";
import { formatSlot } from "@/lib/format";
import { BackLink } from "@/components/back-link";
import { MessageTextarea } from "@/components/message-textarea";

export default async function MessageThreadPage({ params }: { params: { thread: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isRm = params.thread === "rm";
  const partnerId = isRm ? null : params.thread;
  const partner = isRm
    ? null
    : await prisma.user.findFirst({ where: { id: params.thread, role: "PARTNER" } });
  if (!isRm && !partner) notFound();

  await prisma.message.updateMany({
    where: { memberId: user.id, partnerId, senderRole: { not: "MEMBER" }, read: false },
    data: { read: true },
  });

  const messages = await prisma.message.findMany({
    where: { memberId: user.id, partnerId },
    orderBy: { createdAt: "asc" },
  });

  const title = isRm ? "Your Relationship Manager" : partner!.name;

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 font-display text-4xl italic leading-tight text-ink sm:text-5xl">{title}</h1>
      <p className="mb-10 text-sm text-grey">
        {isRm ? "Separate from concierge." : "A direct line, separate from your RM."}
      </p>

      <div className="mb-8 flex flex-col gap-4">
        {messages.length === 0 && (
          <p className="text-sm text-grey">Nothing here yet. Say hello.</p>
        )}
        {messages.map((message) => (
          <div key={message.id} className={message.senderRole === "MEMBER" ? "text-right" : ""}>
            <p
              className={`inline-block max-w-sm rounded-md px-3 py-2 text-left text-sm ${
                message.senderRole === "MEMBER" ? "bg-ink text-paper" : "bg-orange/10 text-ink"
              }`}
            >
              {message.body}
            </p>
            <p className="mt-1 text-xs text-grey">{formatSlot(message.createdAt)}</p>
          </div>
        ))}
      </div>

      <form action={sendMessage} className="flex flex-col gap-3">
        {!isRm && <input type="hidden" name="partnerId" value={partner!.id} />}
        <MessageTextarea
          key={messages.length}
          name="body"
          rows={3}
          required
          autoFocus
          placeholder={isRm ? "Write to your RM. Enter to send, shift+enter for a new line." : `Write to ${partner!.name}. Enter to send, shift+enter for a new line.`}
          className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
        />
        <button
          type="submit"
          className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
        >
          Send
        </button>
      </form>

      <BackLink href="/messages" />
    </div>
  );
}
