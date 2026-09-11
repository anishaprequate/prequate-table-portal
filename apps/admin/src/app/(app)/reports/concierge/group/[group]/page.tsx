import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin, canViewReports } from "@/lib/session";
import { getReportsData } from "@/lib/reports";
import { PageHero } from "@/components/page-hero";
import { BackLink } from "@/components/back-link";

export default async function ConciergeGroupDetailPage({ params }: { params: { group: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin || !canViewReports(admin.role)) redirect("/bookings");

  const groupName = decodeURIComponent(params.group);
  const data = await getReportsData({});
  const group = data.servicesByGroup.find((g) => g.group === groupName);
  if (!group) notFound();

  return (
    <div className="max-w-md">
      <p className="mb-2 text-xs uppercase tracking-wide text-grey">
        <Link href="/reports/concierge" className="hover:text-ink">
          Concierge
        </Link>{" "}
        / {group.group}
      </p>
      <PageHero title={group.group} subtitle={`${group.count} request(s).`} />

      {group.records.length === 0 ? (
        <p className="text-sm text-grey">No requests in this group yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-grey/15">
          {group.records.map((r, i) => (
            <li key={i} className="py-3">
              <Link href={r.href} className="block">
                <p className="text-sm font-medium text-deep-orange hover:underline">{r.label}</p>
                <p className="text-xs text-grey">{r.sublabel}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <BackLink href="/reports/concierge" />
    </div>
  );
}
