import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { respondToConciergeProposal } from "@/lib/actions/concierge";
import { CONCIERGE_STATUS_LABELS, type ConciergeStatus } from "@prequate/core";
import { formatDateOnly } from "@/lib/format";
import { BackLink } from "@/components/back-link";

export default async function ConciergeRequestPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { responded?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const request = await prisma.conciergeRequest.findFirst({
    where: { id: params.id, memberId: user.id },
    include: { category: true },
  });
  if (!request) notFound();

  const chosen = request.selectedExamples ? (JSON.parse(request.selectedExamples) as string[]) : [];

  return (
    <div className="max-w-md">
      <h1 className="mb-1 font-display text-4xl italic leading-tight text-ink sm:text-5xl">
        {request.category?.category ?? request.customText}
      </h1>
      <p className="mb-10 text-sm text-grey">Sent {formatDateOnly(request.createdAt)}</p>

      {searchParams.responded && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Thanks — noted.</p>
      )}

      {request.category && (
        <div className="mb-6">
          <p className="mb-1 text-xs uppercase tracking-wide text-grey">Category</p>
          <p className="text-sm">{request.category.group}</p>
        </div>
      )}

      {chosen.length > 0 && (
        <div className="mb-6">
          <p className="mb-1 text-xs uppercase tracking-wide text-grey">Specifically</p>
          <p className="text-sm">{chosen.join(", ")}</p>
        </div>
      )}

      {request.detail && (
        <div className="mb-6">
          <p className="mb-1 text-xs uppercase tracking-wide text-grey">What you shared</p>
          <p className="text-sm whitespace-pre-wrap">{request.detail}</p>
        </div>
      )}

      <div className="mb-6">
        <p className="mb-1 text-xs uppercase tracking-wide text-grey">Status</p>
        <p className="text-sm">
          {CONCIERGE_STATUS_LABELS[request.status as ConciergeStatus] ?? request.status}
          {request.dueAt && request.status !== "FULFILLED" && ` · expected by ${formatDateOnly(request.dueAt)}`}
        </p>
      </div>

      {request.vendorNote && (
        <div className="mb-6">
          <p className="mb-1 text-xs uppercase tracking-wide text-grey">From your RM</p>
          <p className="text-sm whitespace-pre-wrap">{request.vendorNote}</p>
        </div>
      )}

      {request.status === "AWAITING_APPROVAL" && (
        <form action={respondToConciergeProposal} className="flex gap-3">
          <input type="hidden" name="id" value={request.id} />
          <button
            type="submit"
            name="decision"
            value="ACCEPTED"
            className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Approve
          </button>
          <button
            type="submit"
            name="decision"
            value="DECLINED"
            className="w-fit rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Decline
          </button>
        </form>
      )}

      <BackLink href="/concierge" />
    </div>
  );
}
