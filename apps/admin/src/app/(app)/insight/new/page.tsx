import { redirect } from "next/navigation";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { createInsightPost } from "@/lib/actions/insight";
import { BackLink } from "@/components/back-link";
import { InsightFormFields } from "@/components/insight-form-fields";
import { PageHero } from "@/components/page-hero";

export default async function NewInsightPostPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (!canWrite(admin.role)) redirect("/insight");
  const selfPublishes = isFullAdmin(admin.role);

  return (
    <div className="max-w-2xl">
      <PageHero title="New" accent="post" />

      {!selfPublishes && (
        <p className="mb-6 text-sm text-grey">
          Your posts go to a full admin for review before they go live.
        </p>
      )}

      {searchParams.error === "incomplete" && (
        <p className="mb-6 text-sm text-deep-orange">Add a title and body before publishing.</p>
      )}

      <form action={createInsightPost} className="flex flex-col gap-4">
        <InsightFormFields authorName={admin.name} />

        <button
          type="submit"
          className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
        >
          {selfPublishes ? "Publish" : "Submit for review"}
        </button>
      </form>

      <BackLink href="/insight" />
    </div>
  );
}
