import { redirect } from "next/navigation";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { createCannedResponse } from "@/lib/actions/canned-responses";
import { BackLink } from "@/components/back-link";
import { PageHero } from "@/components/page-hero";

export default async function NewCannedResponsePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !(isFullAdmin(admin.role) || admin.role === "PARTNER") || !canWrite(admin.role)) {
    redirect("/settings/canned-responses");
  }

  return (
    <div className="max-w-md">
      <PageHero title="New" accent="canned response" />

      {searchParams.error === "incomplete" && (
        <p className="mb-6 text-sm text-deep-orange">Add a title and body before saving.</p>
      )}

      <form action={createCannedResponse} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          Title
          <input
            type="text"
            name="title"
            placeholder="Shown in the picker, e.g. Reschedule apology"
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          Body
          <textarea
            name="body"
            rows={5}
            placeholder="The text that fills the reply box when this is picked."
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
          />
        </label>

        <button
          type="submit"
          className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
        >
          Save
        </button>
      </form>

      <BackLink href="/settings/canned-responses" />
    </div>
  );
}
