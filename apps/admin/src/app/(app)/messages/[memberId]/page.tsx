import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { sendReply } from "@/lib/actions/messages";
import { MessageTextarea } from "@/components/message-textarea";
import { CannedResponsePicker } from "@/components/canned-response-picker";
import { MessageThread } from "@/components/message-thread";

export default async function MessageThreadPage({
  params,
  searchParams,
}: {
  params: { memberId: string };
  searchParams: { error?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const member = await prisma.user.findUnique({ where: { id: params.memberId } });
  if (!member || member.role !== "MEMBER") notFound();

  const fullAdmin = canView(admin.role);
  const partnerId = fullAdmin ? null : admin.id;
  const writable = canWrite(admin.role);

  await prisma.message.updateMany({
    where: { memberId: member.id, partnerId, senderRole: "MEMBER", read: false },
    data: { read: true },
  });

  const messages = await prisma.message.findMany({
    where: { memberId: member.id, partnerId },
    orderBy: { createdAt: "asc" },
  });

  const blocked = !fullAdmin && !member.allowPartnerMessages;
  const showForm = writable && !blocked;

  const cannedResponses = showForm
    ? await prisma.cannedResponse.findMany({
        where: { audience: fullAdmin ? "ADMIN" : "PARTNER" },
        orderBy: { title: "asc" },
      })
    : [];

  const backButtonClass =
    "flex-1 rounded-md border border-grey/30 px-4 py-3 text-center text-sm font-medium text-ink transition hover:border-grey/60";

  return (
    <div className="flex h-[calc(100vh-5rem)] max-w-lg flex-col md:h-[calc(100vh-12rem)]">
      <div className="flex-shrink-0 pb-4">
        <h1 className="mb-1 font-display text-4xl italic leading-tight text-ink sm:text-5xl">{member.name}</h1>
        <p className="text-sm text-grey">
          {fullAdmin ? "Direct thread, separate from concierge." : "Your own thread with this member."}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <MessageThread
          key={messages.length}
          initialMessages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
          memberId={member.id}
        />
      </div>

      {blocked && (
        <p className="mb-3 flex-shrink-0 text-sm text-grey">
          {member.name} has turned off partner messaging. Reach them through the RM thread instead.
        </p>
      )}
      {showForm ? (
        <form action={sendReply} className="flex flex-shrink-0 flex-col gap-3 pt-3">
          <input type="hidden" name="memberId" value={member.id} />
          {searchParams.error === "blocked" && (
            <p className="text-xs text-orange">That message was not sent. This member has partner messaging turned off.</p>
          )}
          <CannedResponsePicker responses={cannedResponses} targetId="reply-body" />
          <MessageTextarea
            key={messages.length}
            id="reply-body"
            name="body"
            rows={3}
            required
            autoFocus
            placeholder={`Reply to ${member.name}. Enter to send, shift+enter for a new line.`}
            className="w-full rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
            >
              Send
            </button>
            <Link href="/messages" className={backButtonClass}>
              Back
            </Link>
          </div>
        </form>
      ) : (
        <div className="flex-shrink-0 pt-3">
          <Link href="/messages" className={backButtonClass}>
            Back
          </Link>
        </div>
      )}
    </div>
  );
}
