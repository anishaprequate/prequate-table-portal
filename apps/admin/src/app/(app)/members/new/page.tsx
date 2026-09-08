import { redirect } from "next/navigation";
import { MEMBER_LIFECYCLE_STATUSES, MEMBER_LIFECYCLE_LABELS } from "@prequate/core";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { createMember, bulkCreateMembers, bulkImportMembersCsv } from "@/lib/actions/members";
import { BackLink } from "@/components/back-link";
import { PageHero } from "@/components/page-hero";

export default async function NewMemberPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  return (
    <div className="max-w-md">
      <PageHero title="Add members" />

      {searchParams.error === "missing-name" && (
        <p className="mb-6 text-sm text-deep-orange">Add a name before saving.</p>
      )}
      {searchParams.error === "empty-bulk" && (
        <p className="mb-6 text-sm text-deep-orange">Paste at least one name.</p>
      )}
      {searchParams.error === "create-failed" && (
        <p className="mb-6 text-sm text-deep-orange">
          Couldn&apos;t save that. Check for a duplicate email or phone number and try again.
        </p>
      )}
      {searchParams.error === "empty-csv" && (
        <p className="mb-6 text-sm text-deep-orange">
          That CSV had no usable rows. Check the file and try again.
        </p>
      )}
      {searchParams.error === "csv-missing-name-column" && (
        <p className="mb-6 text-sm text-deep-orange">
          The CSV needs a "name" column in its header row.
        </p>
      )}

      <section className="mb-16">
        <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">Add one</h2>
        <form action={createMember} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            Name
            <input
              type="text"
              name="name"
              required
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              Seat type
              <input
                type="text"
                name="seatType"
                placeholder="Founding Seat"
                className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Phone
              <input
                type="tel"
                name="phone"
                className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            Email
            <input
              type="email"
              name="email"
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Bio
            <textarea
              name="bio"
              rows={3}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Status
            <select
              name="lifecycleStatus"
              defaultValue="ACTIVE"
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            >
              {MEMBER_LIFECYCLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {MEMBER_LIFECYCLE_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Add member
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">Add several at once</h2>
        <form action={bulkCreateMembers} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            One person per line: name, or name and email separated by a comma.
            <textarea
              name="bulk"
              rows={8}
              placeholder={"Kavya Menon\nRohan Iyer, rohan.iyer@example.com"}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 font-mono text-sm text-ink"
            />
          </label>
          <p className="text-xs text-grey">
            Seat numbers and everything else are assigned automatically — edit any of them
            afterward from the member's own page.
          </p>
          <button
            type="submit"
            className="w-fit rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Add all
          </button>
        </form>
      </section>

      <section className="mt-16">
        <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">Upload a CSV</h2>
        <form action={bulkImportMembersCsv} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            Header row required. Columns: name (required), email, phone, seat type, bio.
            <input
              type="file"
              name="csv"
              accept=".csv,text/csv"
              required
              className="text-sm"
            />
          </label>
          <p className="text-xs text-grey">
            Seat numbers and chip ids are assigned automatically. Rows with a duplicate email or
            phone, or a blank name, are skipped rather than failing the whole import.
          </p>
          <button
            type="submit"
            className="w-fit rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Upload CSV
          </button>
        </form>
      </section>

      <BackLink href="/members" />
    </div>
  );
}
