import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { updateCannedResponse, deleteCannedResponse } from "@/lib/actions/canned-responses";
import { BackLink } from "@/components/back-link";

export default async function CannedResponseDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; edit?: string; error?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/settings/canned-responses");
  const editing = searchParams.edit === "1";

  const response = await prisma.cannedResponse.findUnique({ where: { id: params.id } });
  if (!response) notFound();

  return (
    <div className="max-w-md">
      {searchParams.saved && !editing && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>
      )}
      {searchParams.error === "incomplete" && (
        <p className="mb-6 text-sm text-deep-orange">Add a title and body before saving.</p>
      )}

      <div className="mb-10 flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl italic leading-tight text-ink sm:text-5xl">{response.title}</h1>
        {!editing && (
          <Link
            href={`/settings/canned-responses/${response.id}?edit=1`}
            className="flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Edit
          </Link>
        )}
      </div>

      {editing ? (
        <form action={updateCannedResponse} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={response.id} />
          <label className="flex flex-col gap-1.5 text-sm">
            Title
            <input
              type="text"
              name="title"
              defaultValue={response.title}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Body
            <textarea
              name="body"
              defaultValue={response.body}
              rows={5}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
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
              href={`/settings/canned-responses/${response.id}`}
              className="flex w-fit items-center rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Cancel
            </Link>
          </div>
        </form>
      ) : (
        <p className="mb-8 whitespace-pre-wrap text-sm">{response.body}</p>
      )}

      {!editing && (
        <form action={deleteCannedResponse}>
          <input type="hidden" name="id" value={response.id} />
          <button
            type="submit"
            className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Delete
          </button>
        </form>
      )}

      <BackLink href="/settings/canned-responses" />
    </div>
  );
}
