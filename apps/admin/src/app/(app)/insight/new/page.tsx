import { redirect } from "next/navigation";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { createInsightPost } from "@/lib/actions/insight";
import { BackLink } from "@/components/back-link";
import { RichTextEditor } from "@/components/rich-text-editor";
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
        <label className="flex flex-col gap-1.5 text-sm">
          Title
          <input
            type="text"
            name="title"
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          Subheading
          <input
            type="text"
            name="subheading"
            placeholder="One line, under the title."
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          Tags
          <input
            type="text"
            name="tags"
            placeholder="Comma-separated, e.g. Fundraising, Hiring"
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          Image (optional)
          <input type="file" name="image" accept="image/*" className="text-sm" />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          Body
          <RichTextEditor name="body" />
        </label>

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
