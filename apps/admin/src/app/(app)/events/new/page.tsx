import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { createEvent } from "@/lib/actions/events";
import { BackLink } from "@/components/back-link";
import { NumberField } from "@/components/number-field";
import { PageHero } from "@/components/page-hero";
import { RichTextEditor } from "@/components/rich-text-editor";
import { EventTierFields } from "@/components/event-tier-fields";
import { EventHomeFields } from "@/components/event-home-fields";
import { Toast } from "@/components/toast";
import { EventSubmitButtons } from "@/components/event-submit-buttons";
import { EventAccessSection } from "@/components/event-access-section";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const [members, partners] = await Promise.all([
    prisma.user.findMany({
      where: { role: "MEMBER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sector: true, archetype: true },
    }),
    prisma.user.findMany({ where: { role: "PARTNER" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="max-w-md">
      <PageHero title="New event" />

      <Toast
        param="duplicate"
        message="An event with this title at this time already exists. Nothing new was made."
        actionLabel="Open it"
        actionHref="/events/{value}"
      />
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
          <EventTierFields defaultTier="DINNER" />
          <label className="flex flex-col gap-1.5 text-sm">
            Capacity
            <NumberField
              name="capacity"
              placeholder="Uncapped"
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>
        </div>

        <EventAccessSection defaultClosed={false}>
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wide text-grey">Invite members</p>
            <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto rounded-md border border-grey/30 p-3 text-sm">
              {members.length === 0 && <p className="text-grey">No members yet.</p>}
              {members.map((member) => (
                <label key={member.id} className="flex items-center gap-2">
                  <input type="checkbox" name="memberIds" value={member.id} className="h-4 w-4 accent-orange" />
                  {member.name}
                  {(member.sector || member.archetype) && (
                    <span className="text-xs text-grey">
                      {[member.sector, member.archetype].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </label>
              ))}
            </div>
            <p className="text-xs text-grey">
              The invitations go out when you publish. If you save a draft, they go out when you publish it.
            </p>
          </div>
        </EventAccessSection>

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

        <EventHomeFields partners={partners} />

        <EventSubmitButtons />
      </form>

      <BackLink href="/events" />
    </div>
  );
}
