import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView } from "@/lib/session";
import { INTRODUCTION_STATUS_LABELS, type IntroductionStatus } from "@prequate/core";
import { formatDateOnly } from "@/lib/format";
import { PageHero } from "@/components/page-hero";

export default async function IntroductionsPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");

  const requests = await prisma.introductionRequest.findMany({
    include: { requester: true, target: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl">
      <PageHero title="Introductions" subtitle="Requests to be introduced to another member." />

      <ul className="flex flex-col divide-y divide-grey/15">
        {requests.map((request) => (
          <li key={request.id} className="py-4">
            <Link href={`/introductions/${request.id}`} className="block">
              <p className="font-display text-2xl italic leading-tight text-ink">
                {request.requester.name} <span className="text-deep-orange">→ {request.target.name}</span>
              </p>
              <p className="text-sm text-grey">
                {formatDateOnly(request.createdAt)} ·{" "}
                {INTRODUCTION_STATUS_LABELS[request.status as IntroductionStatus] ?? request.status}
                {" · "}
                {request.routedAt ? "Routed" : "Not routed"}
              </p>
            </Link>
          </li>
        ))}
        {requests.length === 0 && <p className="py-4 text-sm text-grey">Nothing yet.</p>}
      </ul>
    </div>
  );
}
