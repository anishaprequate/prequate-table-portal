import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { updateSettings } from "@/lib/actions/settings";
import { PageHero } from "@/components/page-hero";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-md">
      <PageHero title="Settings" />

      {searchParams.saved && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>
      )}

      <form action={updateSettings} className="flex flex-col gap-6">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="showInDirectory"
            defaultChecked={!user.directoryOptOut}
            className="mt-0.5 h-4 w-4 accent-orange"
          />
          <span>
            Show me in the member directory
            <span className="block text-xs text-grey">
              Other members can see your name, seat type, and bio.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="allowPartnerMessages"
            defaultChecked={user.allowPartnerMessages}
            className="mt-0.5 h-4 w-4 accent-orange"
          />
          <span>
            Let partners message me directly
            <span className="block text-xs text-grey">
              Your relationship manager can always reach you either way.
            </span>
          </span>
        </label>

        <button
          type="submit"
          className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
        >
          Save
        </button>
      </form>
    </div>
  );
}
