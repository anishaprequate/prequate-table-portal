import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { type EventTier } from "@prequate/core";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { getEventDetail } from "@/lib/event-detail";
import {
  updateEventDetails,
  saveEventNote,
  inviteMembersToEvent,
  removeEventInvite,
  addTicketType,
  deleteTicketType,
  generateInviteLink,
} from "@/lib/actions/events";
import { EventHeader } from "@/components/events/event-header";
import { EventDetailNav } from "@/components/events/event-detail-nav";
import { NumberField } from "@/components/number-field";
import { RichTextEditor } from "@/components/rich-text-editor";
import { InviteOnlySection } from "@/components/invite-only-section";
import { EventTierFields } from "@/components/event-tier-fields";
import { BackLink } from "@/components/back-link";

const EDIT_FORM_ID = "event-edit-form";

export default async function EventEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { sector?: string; archetype?: string; saved?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);
  if (!writable) redirect(`/events/${params.id}`);

  const [detail, members] = await Promise.all([
    getEventDetail(params.id),
    prisma.user.findMany({
      where: { role: "MEMBER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sector: true, archetype: true },
    }),
  ]);
  if (!detail) notFound();
  const { event, invitedOnly, isPast } = detail;

  const attendedOrInvited = new Set(event.attendances.map((a) => a.memberId));
  const sectors = Array.from(new Set(members.map((m) => m.sector).filter((s): s is string => !!s))).sort();
  const archetypes = Array.from(new Set(members.map((m) => m.archetype).filter((a): a is string => !!a))).sort();
  const inviteCandidates = members.filter((m) => {
    if (attendedOrInvited.has(m.id)) return false;
    if (searchParams.sector && m.sector !== searchParams.sector) return false;
    if (searchParams.archetype && m.archetype !== searchParams.archetype) return false;
    return true;
  });

  const inviteUrl = event.inviteToken
    ? `${process.env.MEMBER_APP_URL ?? "http://localhost:3000"}/events/invite/${event.inviteToken}`
    : null;

  const inviteManagement = (
    <div className="mb-8">
      <p className="mb-2 text-xs uppercase tracking-wide text-grey">Invited ({invitedOnly.length})</p>
      {invitedOnly.length === 0 && <p className="text-sm text-grey">No one invited yet.</p>}
      <ul className="flex flex-col gap-1 text-sm">
        {invitedOnly.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3">
            {a.member.name}
            <form action={removeEventInvite}>
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="memberId" value={a.memberId} />
              <button type="submit" className="text-xs text-grey underline hover:text-ink">
                Remove
              </button>
            </form>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wide text-grey">Shareable invite link</p>
        {inviteUrl ? (
          <input
            type="text"
            readOnly
            defaultValue={inviteUrl}
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-xs text-ink"
          />
        ) : (
          <form action={generateInviteLink}>
            <input type="hidden" name="eventId" value={event.id} />
            <button
              type="submit"
              className="w-fit rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Generate invite link
            </button>
          </form>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wide text-grey">Invite members</p>
        <form className="flex gap-3">
          <select
            name="sector"
            defaultValue={searchParams.sector ?? ""}
            className="rounded-md border border-grey/30 bg-paper px-2 py-1.5 text-xs text-ink"
          >
            <option value="">Any sector</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            name="archetype"
            defaultValue={searchParams.archetype ?? ""}
            className="rounded-md border border-grey/30 bg-paper px-2 py-1.5 text-xs text-ink"
          >
            <option value="">Any archetype</option>
            {archetypes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="flex-shrink-0 rounded-md border border-grey/30 px-3 py-1.5 text-xs font-medium text-ink transition hover:border-grey/60"
          >
            Filter
          </button>
        </form>
        {inviteCandidates.length > 0 ? (
          <form action={inviteMembersToEvent} className="flex flex-col gap-3">
            <input type="hidden" name="eventId" value={event.id} />
            <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto rounded-md border border-grey/30 p-3 text-sm">
              {inviteCandidates.map((member) => (
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
            <button
              type="submit"
              className="w-fit rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Invite selected
            </button>
          </form>
        ) : (
          <p className="text-sm text-grey">No members match that filter.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-md">
      {searchParams.saved && <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>}
      <EventHeader detail={detail} writable={writable} />
      <EventDetailNav eventId={event.id} active="edit" showEdit={writable} />

      <form id={EDIT_FORM_ID} action={updateEventDetails} className="mb-8 flex flex-col gap-4">
        <input type="hidden" name="eventId" value={event.id} />

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-wide text-grey">Title</span>
          <input
            type="text"
            name="title"
            defaultValue={event.title}
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-wide text-grey">Description</span>
          <RichTextEditor name="description" initialContent={event.description ?? ""} />
        </label>

        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt="" className="w-full rounded-md object-cover" />
        )}
        <label className="flex flex-col gap-1.5 text-sm">
          {event.imageUrl ? "Replace cover image" : "Add a cover image"}
          <input type="file" name="image" accept="image/*" className="text-sm" />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-wide text-grey">Location</span>
          <input
            type="text"
            name="location"
            defaultValue={event.location ?? ""}
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
          />
        </label>

        <EventTierFields
          defaultTier={event.tier as EventTier}
          defaultSponsorName={event.sponsorName}
          defaultSponsorLogoUrl={event.sponsorLogoUrl}
          defaultExternalGuests={
            event.externalGuests
              ? (JSON.parse(event.externalGuests) as { name: string; email: string }[])
                  .map((g) => `${g.name}, ${g.email}`)
                  .join("\n")
              : ""
          }
          labelClassName="text-xs uppercase tracking-wide text-grey"
          selectClassName="w-fit rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
        />

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-wide text-grey">Capacity</span>
          <NumberField
            name="capacity"
            defaultValue={event.capacity ?? ""}
            placeholder="Uncapped"
            className="w-32 rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-wide text-grey">Attendee list visibility</span>
          <select
            name="attendeeVisibility"
            defaultValue={event.attendeeVisibility}
            className="w-fit rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
          >
            <option value="HIDDEN">Hidden from members</option>
            <option value="VISIBLE_TO_ALL">Visible to all invitees</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="approvalRequired"
            defaultChecked={event.approvalRequired}
            className="h-4 w-4 accent-orange"
          />
          Require admin approval before a registration is confirmed
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="allowPlusOne"
            defaultChecked={event.allowPlusOne}
            className="h-4 w-4 accent-orange"
          />
          Allow members to bring a plus-one
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-wide text-grey">Registration questions (one per line)</span>
          <textarea
            name="registrationQuestions"
            defaultValue={
              event.registrationQuestions ? (JSON.parse(event.registrationQuestions) as string[]).join("\n") : ""
            }
            rows={3}
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
          />
        </label>

        <button
          type="submit"
          className="mt-1 w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
        >
          Save
        </button>
      </form>

      <div className="mb-8 rounded-md border border-grey/15 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-grey">Ticket types</p>
        {event.ticketTypes.length === 0 && <p className="mb-2 text-sm text-grey">None — a single default spot.</p>}
        <ul className="mb-3 flex flex-col gap-1 text-sm">
          {event.ticketTypes.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3">
              {t.name} {t.capacity != null && <span className="text-grey">· cap {t.capacity}</span>}
              <form action={deleteTicketType}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="eventId" value={event.id} />
                <button type="submit" className="text-xs text-grey underline hover:text-ink">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addTicketType} className="flex gap-2">
          <input type="hidden" name="eventId" value={event.id} />
          <input
            type="text"
            name="name"
            placeholder="e.g. VIP"
            required
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
          />
          <NumberField
            name="capacity"
            placeholder="Cap"
            className="w-20 rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
          />
          <button
            type="submit"
            className="flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Add
          </button>
        </form>
      </div>

      <InviteOnlySection formId={EDIT_FORM_ID} defaultChecked={event.inviteOnly}>
        {inviteManagement}
      </InviteOnlySection>

      {isPast && (
        <form action={saveEventNote} className="mt-8 flex flex-col gap-3 rounded-md border border-grey/15 p-4">
          <input type="hidden" name="eventId" value={event.id} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs uppercase tracking-wide text-grey">A note for attendees</span>
            <textarea
              name="adminNote"
              defaultValue={event.adminNote ?? ""}
              rows={4}
              placeholder="Separate from any formal brief. Visible only to those who joined."
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>
          <button
            type="submit"
            className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Save note
          </button>
        </form>
      )}

      <BackLink href={`/events/${event.id}`} />
    </div>
  );
}
