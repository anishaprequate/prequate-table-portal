import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { BackLink } from "@/components/back-link";
import { PageHero } from "@/components/page-hero";

export default async function CannedResponsesPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  const manage = isFullAdmin(admin.role) && canWrite(admin.role);

  const responses = await prisma.cannedResponse.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="max-w-md">
      <div className="flex items-start justify-between gap-6">
        <PageHero
          title="Canned"
          accent="responses"
          subtitle="Saved snippets anyone can drop into a message reply instead of retyping."
        />
        {manage && (
          <Link
            href="/settings/canned-responses/new"
            className="mt-2 flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            New
          </Link>
        )}
      </div>

      <ul className="flex flex-col divide-y divide-grey/15">
        {responses.map((response) => (
          <li key={response.id} className="py-4">
            {manage ? (
              <Link href={`/settings/canned-responses/${response.id}`} className="block">
                <p className="font-display text-2xl italic leading-tight text-ink">{response.title}</p>
                <p className="mt-1 text-sm text-grey">{response.body.slice(0, 80)}</p>
              </Link>
            ) : (
              <div>
                <p className="font-display text-2xl italic leading-tight text-ink">{response.title}</p>
                <p className="mt-1 text-sm text-grey">{response.body.slice(0, 80)}</p>
              </div>
            )}
          </li>
        ))}
        {responses.length === 0 && <p className="py-4 text-sm text-grey">None yet.</p>}
      </ul>

      <BackLink href="/settings" />
    </div>
  );
}
