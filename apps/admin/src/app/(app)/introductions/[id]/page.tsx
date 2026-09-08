import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { updateIntroductionRequest } from "@/lib/actions/introductions";
import { INTRODUCTION_STATUS_LABELS, type IntroductionStatus } from "@prequate/core";
import { formatDateOnly } from "@/lib/format";
import { BackLink } from "@/components/back-link";

export default async function IntroductionDetailPage({
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

  const request = await prisma.introductionRequest.findUnique({
    where: { id: params.id },
    include: { requester: true, target: true },
  });
  if (!request) notFound();

  return (
    <div className="max-w-md">
      {searchParams.saved && !editing && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>
      )}

      <div className="mb-1 flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl italic leading-tight text-ink sm:text-5xl">
          {request.requester.name} <span className="text-deep-orange">→ {request.target.name}</span>
        </h1>
        {writable && !editing && (
          <Link
            href={`/introductions/${request.id}?edit=1`}
            className="flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Edit
          </Link>
        )}
      </div>
      <p className="mb-10 text-sm text-grey">Sent {formatDateOnly(request.createdAt)}</p>

      {editing ? (
        <form action={updateIntroductionRequest} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={request.id} />

          <label className="flex flex-col gap-1.5 text-sm">
            Status
            <select
              name="status"
              defaultValue={request.status}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            >
              <option value="SENT">Sent</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="DECLINED">Declined</option>
              <option value="FULFILLED">Fulfilled</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Note
            <textarea
              name="adminNote"
              defaultValue={request.adminNote ?? ""}
              rows={3}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-grey">
            <input
              type="checkbox"
              name="routed"
              defaultChecked={Boolean(request.routedAt)}
              className="h-4 w-4 accent-orange"
            />
            Routed to {request.target.name} — they can now see this in their Introductions list
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
            >
              Save
            </button>
            <Link
              href={`/introductions/${request.id}`}
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
              {INTRODUCTION_STATUS_LABELS[request.status as IntroductionStatus] ?? request.status}
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Note</dt>
            <dd className="text-sm">{request.adminNote ?? "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Routed</dt>
            <dd className="text-sm">
              {request.routedAt ? `Yes, to ${request.target.name}` : "Not yet"}
            </dd>
          </div>
        </dl>
      )}

      <BackLink href="/introductions" />
    </div>
  );
}
