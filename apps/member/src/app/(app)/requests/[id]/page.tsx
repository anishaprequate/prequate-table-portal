import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { formatSlot } from "@/lib/format";
import { BackLink } from "@/components/back-link";
import { EyebrowLabel } from "@/components/eyebrow-label";

const TYPE_LABELS: Record<string, string> = {
  BRIEF: "A brief",
  PEER_HOUR: "A peer Hour",
  RESTAURANT: "A reservation",
};
const STATUS_LABELS: Record<string, string> = { NEW: "Received", IN_PROGRESS: "In progress", DONE: "Done" };

// A request the member sent from Home, where it stands, and the team's note.
// The screen a "your request is done" notification opens.
export default async function TableRequestPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const request = await prisma.tableRequest.findFirst({ where: { id: params.id, memberId: user.id } });
  if (!request) notFound();

  return (
    <div className="max-w-md">
      <EyebrowLabel>{TYPE_LABELS[request.type] ?? "A request"}</EyebrowLabel>
      <h1 className="mb-2 font-display text-4xl italic leading-[1.05] text-ink">{STATUS_LABELS[request.status] ?? request.status}</h1>
      <p className="mb-8 text-sm text-taupe">Sent {formatSlot(request.createdAt)}</p>

      {request.adminNote && (
        <div className="mb-8">
          <p className="mb-1 text-xs uppercase tracking-[0.28em] text-taupe">From the team</p>
          <p className="whitespace-pre-wrap text-sm text-ink">{request.adminNote}</p>
        </div>
      )}

      <div className="mb-8">
        <p className="mb-1 text-xs uppercase tracking-[0.28em] text-taupe">What you asked</p>
        <div className="flex flex-col gap-0.5 text-sm text-ink">
          {request.details
            .split("\n")
            .filter((line) => !/^Map: /.test(line))
            .map((line, i) => (
              <p key={i}>{line}</p>
            ))}
        </div>
      </div>

      <BackLink href="/home" />
    </div>
  );
}
