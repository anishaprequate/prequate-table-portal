import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { respondToIntroduction } from "@/lib/actions/members";
import { INTRODUCTION_STATUS_LABELS, type IntroductionStatus } from "@prequate/core";
import { formatDateOnly } from "@/lib/format";
import { BackLink } from "@/components/back-link";
import { EyebrowLabel } from "@/components/eyebrow-label";

export default async function IntroductionRequestPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const request = await prisma.introductionRequest.findUnique({
    where: { id: params.id },
    include: { requester: true, target: true },
  });
  if (!request) notFound();

  const isRequester = request.requesterId === user.id;
  const isTarget = request.targetId === user.id;
  if (!isRequester && !isTarget) notFound();
  if (isTarget && !isRequester && !request.routedAt) notFound();

  const otherParty = isRequester ? request.target : request.requester;
  const backHref = isRequester ? "/members?tab=sent" : "/members?tab=received";

  return (
    <div className="max-w-md">
      <EyebrowLabel>
        {isRequester ? "You asked to be introduced to" : "Wants to be introduced to you"}
      </EyebrowLabel>
      <h1 className="mb-2 font-display text-4xl italic leading-[1.05] text-ink">{otherParty.name}</h1>
      <p className="mb-8 text-sm text-taupe">
        {formatDateOnly(request.createdAt)} ·{" "}
        {INTRODUCTION_STATUS_LABELS[request.status as IntroductionStatus] ?? request.status}
      </p>

      <dl className="mb-8 flex flex-col gap-5">
        <div>
          <dt className="mb-1 text-xs uppercase tracking-[0.28em] text-taupe">Why</dt>
          <dd className="whitespace-pre-wrap text-sm">{request.message ?? "—"}</dd>
        </div>
        <div>
          <dt className="mb-1 text-xs uppercase tracking-[0.28em] text-taupe">
            {isRequester ? "Your preferred contact" : "Best way to reach them"}
          </dt>
          <dd className="text-sm">{request.preferredChannel || "Email"}</dd>
        </div>
        <div>
          <dt className="mb-1 text-xs uppercase tracking-[0.28em] text-taupe">
            {isRequester ? "What you shared" : "What they shared"}
          </dt>
          <dd className="whitespace-pre-wrap text-sm">{request.contactDetails ?? "—"}</dd>
        </div>
      </dl>

      {isTarget && request.status === "SENT" && (
        <form action={respondToIntroduction} className="flex gap-3">
          <input type="hidden" name="id" value={request.id} />
          <button type="submit" name="decision" value="ACCEPTED" className="btn-primary w-fit">
            Accept
          </button>
          <button type="submit" name="decision" value="DECLINED" className="btn-secondary w-fit">
            Decline
          </button>
        </form>
      )}

      <BackLink href={backHref} />
    </div>
  );
}
