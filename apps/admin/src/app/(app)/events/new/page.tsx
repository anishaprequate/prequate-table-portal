import { redirect } from "next/navigation";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { createEvent } from "@/lib/actions/events";
import { EVENT_TIER_LABELS, type EventTier } from "@prequate/core";
import { BackLink } from "@/components/back-link";
import { NumberField } from "@/components/number-field";
import { PageHero } from "@/components/page-hero";
import { RichTextEditor } from "@/components/rich-text-editor";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  return (
    <div className="max-w-md">
      <PageHero title="New event" />

      {searchParams.error === "incomplete" && (
        <p className="mb-6 text-sm text-deep-orange">
          Add a title, start time, and end time before saving.
        </p>
      )}

      <form action={createEvent} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          Title
          <input
            type="text"
            name="title"
            required
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          Description
          <RichTextEditor name="description" />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          Cover image (optional)
          <input type="file" name="image" accept="image/*" className="text-sm" />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          Location
          <input
            type="text"
            name="location"
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            Starts
            <input
              type="datetime-local"
              name="startTime"
              required
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Ends
            <input
              type="datetime-local"
              name="endTime"
              required
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            Tier
            <select
              name="tier"
              defaultValue="DINNER"
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            >
              {(Object.keys(EVENT_TIER_LABELS) as EventTier[]).map((tier) => (
                <option key={tier} value={tier}>
                  {EVENT_TIER_LABELS[tier]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Capacity
            <NumberField
              name="capacity"
              placeholder="Uncapped"
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="approvalRequired" className="h-4 w-4 accent-orange" />
          Require admin approval before a registration is confirmed
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="allowPlusOne" className="h-4 w-4 accent-orange" />
          Allow members to bring a plus-one
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          Registration questions (one per line, optional)
          <textarea
            name="registrationQuestions"
            rows={3}
            placeholder={"e.g. What would you like to get out of this session?"}
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
          />
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            name="intent"
            value="draft"
            className="w-fit rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Save as draft
          </button>
          <button
            type="submit"
            name="intent"
            value="publish"
            className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Publish
          </button>
        </div>
      </form>

      <BackLink href="/events" />
    </div>
  );
}
