import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canWrite, isFullAdmin } from "@/lib/session";
import { saveAdvisor } from "@/lib/actions/advisors";
import { PageHero } from "@/components/page-hero";
import { Toast } from "@/components/toast";

const ERRORS: Record<string, string> = {
  name: "An advisor needs a name.",
  linkedin: "That is not a LinkedIn address.",
  photo: "The photo must be a JPG, PNG or WebP under 8 MB.",
};

const field = "min-h-[44px] rounded-md border border-grey/30 bg-paper px-3 text-ink";

// Who members see under Advisors on The Hour page. Full admins only.
export default async function AdvisorsSettingsPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role)) redirect("/home");
  const writable = canWrite(admin.role);

  const advisors = await prisma.advisor.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });

  const form = (a?: (typeof advisors)[number]) => (
    <form action={saveAdvisor} encType="multipart/form-data" className="flex flex-col gap-3">
      {a && <input type="hidden" name="id" value={a.id} />}
      <label className="flex flex-col gap-1 text-sm text-ink">
        Name
        <input name="name" defaultValue={a?.name ?? ""} required maxLength={120} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        What they do
        <textarea name="headline" defaultValue={a?.headline ?? ""} rows={2} maxLength={300} className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        LinkedIn address
        <input name="linkedinUrl" defaultValue={a?.linkedinUrl ?? ""} inputMode="url" className={field} />
      </label>
      <div className="flex items-center gap-3">
        {a?.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.photoUrl} alt="" className="h-16 w-16 flex-shrink-0 rounded-full object-cover" />
        )}
        <label className="flex min-w-0 flex-col gap-1 text-sm text-ink">
          Photo
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="min-h-[44px] text-sm" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex min-h-[44px] items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="active" defaultChecked={a ? a.active : true} className="h-5 w-5" />
          Shown to members
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          Order
          <input type="number" name="sortOrder" defaultValue={a?.sortOrder ?? 0} min={0} max={999} className={`${field} w-20`} />
        </label>
      </div>
      {writable && (
        <div>
          <button type="submit" className="min-h-[44px] rounded-md bg-ink px-5 text-sm font-medium text-paper transition hover:bg-ink/90">
            {a ? "Save" : "Add advisor"}
          </button>
        </div>
      )}
    </form>
  );

  return (
    <div className="max-w-md">
      <Toast param="saved" message="Saved." />
      <PageHero title="Advisors" subtitle="Who members can ask for an Hour." />
      {searchParams.error && <p className="mb-6 text-sm text-deep-orange" role="alert">{ERRORS[searchParams.error] ?? "Something went wrong."}</p>}

      <ul className="mb-12 flex flex-col gap-8">
        {advisors.map((a) => (
          <li key={a.id} className="rounded-md border border-grey/15 p-4">
            {form(a)}
          </li>
        ))}
      </ul>

      <h2 className="mb-3 text-xs uppercase tracking-[0.28em] text-grey">Add an advisor</h2>
      <div className="rounded-md border border-grey/15 p-4">{form()}</div>

      <p className="mt-8">
        <Link href="/settings" className="text-sm text-deep-orange underline">
          Back to Settings
        </Link>
      </p>
    </div>
  );
}
