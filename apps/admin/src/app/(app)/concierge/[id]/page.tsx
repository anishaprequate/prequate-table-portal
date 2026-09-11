import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { updateConciergeRequest } from "@/lib/actions/concierge";
import { CONCIERGE_STATUS_LABELS, type ConciergeStatus } from "@prequate/core";
import { formatDateOnly } from "@/lib/format";
import { BackLink } from "@/components/back-link";

export default async function ConciergeDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; edit?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);
  const editing = writable && searchParams.edit === "1";

  const request = await prisma.conciergeRequest.findUnique({
    where: { id: params.id },
    include: { member: true, category: true },
  });
  if (!request) notFound();

  return (
    <div className="max-w-md">
      {searchParams.saved && !editing && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>
      )}

      <div className="mb-1 flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl italic leading-tight text-ink sm:text-5xl">
          {request.category?.category ?? request.customText}
        </h1>
        {writable && !editing && (
          <Link
            href={`/concierge/${request.id}?edit=1`}
            className="flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Edit
          </Link>
        )}
      </div>
      <p className="mb-10 text-sm text-grey">
        {request.member.name} · Sent {formatDateOnly(request.createdAt)}
        {request.dueAt && ` · due ${formatDateOnly(request.dueAt)}`}
      </p>

      <div className="mb-8">
        <p className="mb-1 text-xs uppercase tracking-wide text-grey">Request</p>
        <p className="text-sm">{request.category?.category ?? request.customText}</p>
        {request.category && (
          <p className="mt-1 text-xs text-grey">{request.category.group}</p>
        )}
        {request.selectedExamples && (
          <p className="mt-2 text-sm text-grey">
            {(JSON.parse(request.selectedExamples) as string[]).join(", ")}
          </p>
        )}
      </div>

      {request.detail && (
        <div className="mb-8">
          <p className="mb-1 text-xs uppercase tracking-wide text-grey">Detail</p>
          <p className="text-sm">{request.detail}</p>
        </div>
      )}

      {request.locationContext && (
        <div className="mb-8">
          <p className="mb-1 text-xs uppercase tracking-wide text-grey">Requested from</p>
          <p className="text-sm">{request.locationContext} (NFC tap)</p>
        </div>
      )}

      {editing ? (
        <form action={updateConciergeRequest} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={request.id} />

          <label className="flex flex-col gap-1.5 text-sm">
            Status
            <select
              name="status"
              defaultValue={request.status}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            >
              {(Object.keys(CONCIERGE_STATUS_LABELS) as ConciergeStatus[]).map((status) => (
                <option key={status} value={status}>
                  {CONCIERGE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <span className="text-xs text-grey">
              Pick "Awaiting your approval" and add a vendor note below to send it to the member
              for approval.
            </span>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Vendor note
            <textarea
              name="vendorNote"
              defaultValue={request.vendorNote ?? ""}
              rows={3}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Points awarded for this request
            <input
              type="number"
              name="pointsAwarded"
              defaultValue={request.pointsAwarded}
              min={0}
              className="w-32 rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
            >
              Save
            </button>
            <Link
              href={`/concierge/${request.id}`}
              className="flex w-fit items-center rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Cancel
            </Link>
          </div>
        </form>
      ) : (
        <dl className="flex flex-col gap-5">
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Status</dt>
            <dd className="text-sm">
              {CONCIERGE_STATUS_LABELS[request.status as ConciergeStatus] ?? request.status}
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Vendor note</dt>
            <dd className="text-sm">{request.vendorNote ?? "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Points awarded</dt>
            <dd className="text-sm">{request.pointsAwarded}</dd>
          </div>
        </dl>
      )}

      <BackLink href="/concierge" />
    </div>
  );
}
