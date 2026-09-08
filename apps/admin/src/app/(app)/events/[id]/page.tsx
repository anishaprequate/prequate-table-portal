import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import {
  updateEventDetails,
  saveEventNote,
  inviteMembersToEvent,
  removeEventInvite,
  addTicketType,
  deleteTicketType,
  approveAttendance,
  declineAttendance,
  checkInAttendee,
  promoteFromWaitlist,
  demoteToWaitlist,
  blastEventMessage,
  cloneEvent,
  publishEventDraft,
  generateInviteLink,
} from "@/lib/actions/events";
import { EVENT_TIER_LABELS, type EventTier } from "@prequate/core";
import { formatSlot, formatDateOnly } from "@/lib/format";
import { BackLink } from "@/components/back-link";
import { NumberField } from "@/components/number-field";
import { RichTextEditor } from "@/components/rich-text-editor";
import { InviteOnlySection } from "@/components/invite-only-section";

const EDIT_FORM_ID = "event-edit-form";

type Attendee = {
  id: string;
  memberId: string;
  member: { name: string };
  guestNames: string | null;
  guestCount: number;
  dietaryNotes: string | null;
  travelNotes: string | null;
  arrivalDate: Date | null;
  checkedInAt: Date | null;
  ticketTypeId: string | null;
  registrationAnswers: string | null;
};

function AttendeeRsvp({ attendee }: { attendee: Attendee }) {
  const answers: { question: string; answer: string }[] = attendee.registrationAnswers
    ? JSON.parse(attendee.registrationAnswers)
    : [];
  const hasNotes = attendee.dietaryNotes || attendee.travelNotes || attendee.arrivalDate || answers.length > 0;
  if (!hasNotes) return null;
  return (
    <p className="text-xs text-grey">
      {attendee.arrivalDate && `Arriving ${formatDateOnly(attendee.arrivalDate)}`}
      {attendee.arrivalDate && (attendee.dietaryNotes || attendee.travelNotes) && " · "}
      {attendee.dietaryNotes && `Dietary: ${attendee.dietaryNotes}`}
      {attendee.dietaryNotes && attendee.travelNotes && " · "}
      {attendee.travelNotes && `Travel: ${attendee.travelNotes}`}
      {answers.length > 0 && (attendee.dietaryNotes || attendee.travelNotes || attendee.arrivalDate) && " · "}
      {answers.map((a) => `${a.question}: ${a.answer}`).join(" · ")}
    </p>
  );
}

function AttendeeRow({
  a,
  eventId,
  writable,
  ticketTypeName,
  showPromote,
  showDemote,
}: {
  a: Attendee;
  eventId: string;
  writable: boolean;
  ticketTypeName: string | null;
  showPromote?: boolean;
  showDemote?: boolean;
}) {
  return (
    <li className="flex items-start justify-between gap-3">
      <div>
        <p>
          {a.member.name}
          {a.guestNames
            ? ` + ${(JSON.parse(a.guestNames) as string[]).join(", ")}`
            : a.guestCount > 0
              ? ` + ${a.guestCount}`
              : ""}
          {ticketTypeName && <span className="text-grey"> · {ticketTypeName}</span>}
          {a.checkedInAt && <span className="text-deep-orange"> · Checked in</span>}
        </p>
        <AttendeeRsvp attendee={a} />
      </div>
      {writable && (
        <div className="flex flex-shrink-0 gap-2">
          {showPromote && (
            <form action={promoteFromWaitlist}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="eventId" value={eventId} />
              <button type="submit" className="text-xs text-grey underline hover:text-ink">
                Promote
              </button>
            </form>
          )}
          {showDemote && (
            <form action={demoteToWaitlist}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="eventId" value={eventId} />
              <button type="submit" className="text-xs text-grey underline hover:text-ink">
                Move to waitlist
              </button>
            </form>
          )}
          <form action={checkInAttendee}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="checkedIn" value={a.checkedInAt ? "0" : "1"} />
            <button type="submit" className="text-xs text-grey underline hover:text-ink">
              {a.checkedInAt ? "Undo check-in" : "Check in"}
            </button>
          </form>
        </div>
      )}
    </li>
  );
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; edit?: string; blasted?: string; q?: string; sector?: string; archetype?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);
  const editing = writable && searchParams.edit === "1";

  const [event, members] = await Promise.all([
    prisma.event.findUnique({
      where: { id: params.id },
      include: {
        attendances: { include: { member: true }, orderBy: { createdAt: "asc" } },
        ticketTypes: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.user.findMany({
      where: { role: "MEMBER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sector: true, archetype: true },
    }),
  ]);
  if (!event) notFound();

  const isPast = event.startTime < new Date();
  const isDraft = !event.publishedAt;
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const matches = (name: string) => !q || name.toLowerCase().includes(q);

  const joined = event.attendances.filter((a) => a.joined && matches(a.member.name));
  const waitlist = event.attendances.filter((a) => a.waitlisted && matches(a.member.name));
  const pending = event.attendances.filter((a) => a.pendingApproval && matches(a.member.name));
  const invitedOnly = event.attendances.filter((a) => a.invited && !a.joined && !a.waitlisted && !a.pendingApproval);
  const takenSpots = event.attendances
    .filter((a) => a.joined)
    .reduce((sum, a) => sum + 1 + a.guestCount, 0);
  const attendedOrInvited = new Set(event.attendances.map((a) => a.memberId));
  const ticketTypeName = (id: string | null) => event.ticketTypes.find((t) => t.id === id)?.name ?? null;

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
          <input type="hidden" name="edit" value="1" />
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
      {searchParams.saved && !editing && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>
      )}
      {searchParams.blasted && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Message sent to registrants.</p>
      )}

      {event.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.imageUrl} alt="" className="mb-6 h-[200px] w-full rounded-md object-cover" />
      )}

      <div className="mb-1 flex items-start justify-between gap-4">
        <h1 className="font-display text-[2.5rem] italic leading-[1.05] tracking-[-0.01em] text-ink">
          {event.title}
        </h1>
        {writable && !editing && (
          <div className="flex flex-shrink-0 gap-2">
            {isDraft && (
              <form action={publishEventDraft}>
                <input type="hidden" name="eventId" value={event.id} />
                <button
                  type="submit"
                  className="rounded-md bg-orange px-4 py-2 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
                >
                  Publish
                </button>
              </form>
            )}
            <form action={cloneEvent}>
              <input type="hidden" name="eventId" value={event.id} />
              <button
                type="submit"
                className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
              >
                Clone
              </button>
            </form>
            <Link
              href={`/events/${event.id}?edit=1`}
              className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Edit
            </Link>
          </div>
        )}
      </div>
      <p className="mb-6 text-sm text-grey">
        {isDraft && <span className="text-deep-orange">Draft · </span>}
        {formatSlot(event.startTime)}
        {event.location && ` · ${event.location}`}
      </p>

      {!editing && event.description && (
        <div
          className="prose-editor mb-6 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: event.description }}
        />
      )}

      {editing ? (
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

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs uppercase tracking-wide text-grey">Tier</span>
            <select
              name="tier"
              defaultValue={event.tier}
              className="w-fit rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
            >
              {(Object.keys(EVENT_TIER_LABELS) as EventTier[]).map((tier) => (
                <option key={tier} value={tier}>
                  {EVENT_TIER_LABELS[tier]}
                </option>
              ))}
            </select>
          </label>

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
            <span className="text-xs uppercase tracking-wide text-grey">
              Registration questions (one per line)
            </span>
            <textarea
              name="registrationQuestions"
              defaultValue={event.registrationQuestions ? (JSON.parse(event.registrationQuestions) as string[]).join("\n") : ""}
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
      ) : (
        <div className="mb-8 flex flex-col gap-1 text-sm text-grey">
          <p>Tier: {EVENT_TIER_LABELS[event.tier as EventTier] ?? event.tier}</p>
          <p>Capacity: {event.capacity != null ? `${takenSpots} of ${event.capacity}` : "Uncapped"}</p>
          <p>
            Attendee list:{" "}
            {event.attendeeVisibility === "VISIBLE_TO_ALL" ? "Visible to all invitees" : "Hidden from members"}
          </p>
          {event.inviteOnly && <p>Invite-only</p>}
          {event.approvalRequired && <p>Approval required</p>}
          {event.allowPlusOne && <p>Plus-ones allowed</p>}
        </div>
      )}

      {editing && (
        <div className="mb-8">
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
      )}

      {pending.length > 0 && (
        <div className="mb-8">
          <p className="mb-2 text-xs uppercase tracking-wide text-deep-orange">
            Pending approval ({pending.length})
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            {pending.map((a) => (
              <li key={a.id}>
                <p>
                  {a.member.name}
                  {a.guestCount > 0 && ` + ${a.guestCount}`}
                  {ticketTypeName(a.ticketTypeId) && <span className="text-grey"> · {ticketTypeName(a.ticketTypeId)}</span>}
                </p>
                <AttendeeRsvp attendee={a} />
                {writable && (
                  <div className="mt-1 flex gap-3">
                    <form action={approveAttendance}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="text-xs font-medium text-ink underline">
                        Approve
                      </button>
                    </form>
                    <form action={declineAttendance}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="text-xs text-grey underline hover:text-ink">
                        Decline
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search guests by name"
          className="w-full rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
        />
      </form>

      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-wide text-grey">Joined ({joined.length})</p>
          <a
            href={`/api/events/${event.id}/guests.csv`}
            className="text-xs text-grey underline hover:text-ink"
          >
            Export CSV
          </a>
        </div>
        {joined.length === 0 && <p className="text-sm text-grey">No one yet.</p>}
        <ul className="flex flex-col gap-2 text-sm">
          {joined.map((a) => (
            <AttendeeRow
              key={a.id}
              a={a}
              eventId={event.id}
              writable={writable}
              ticketTypeName={ticketTypeName(a.ticketTypeId)}
              showDemote
            />
          ))}
        </ul>
      </div>

      {waitlist.length > 0 && (
        <div className="mb-8">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Waitlist ({waitlist.length})</p>
          <ul className="flex flex-col gap-2 text-sm">
            {waitlist.map((a) => (
              <AttendeeRow
                key={a.id}
                a={a}
                eventId={event.id}
                writable={writable}
                ticketTypeName={ticketTypeName(a.ticketTypeId)}
                showPromote
              />
            ))}
          </ul>
        </div>
      )}

      {!editing && event.inviteOnly && (
        <div className="mb-8">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Invited ({invitedOnly.length})</p>
          {invitedOnly.length === 0 && <p className="text-sm text-grey">No one invited yet.</p>}
          <ul className="flex flex-col gap-1 text-sm">
            {invitedOnly.map((a) => (
              <li key={a.id}>{a.member.name}</li>
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <InviteOnlySection formId={EDIT_FORM_ID} defaultChecked={event.inviteOnly}>
          {inviteManagement}
        </InviteOnlySection>
      )}

      {writable && (joined.length > 0 || waitlist.length > 0) && (
        <form action={blastEventMessage} className="mb-8 flex flex-col gap-3">
          <input type="hidden" name="eventId" value={event.id} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs uppercase tracking-wide text-grey">Message all registrants</span>
            <textarea
              name="body"
              rows={3}
              placeholder="Goes to everyone joined or waitlisted, via their RM thread."
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>
          <button
            type="submit"
            className="w-fit rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Send
          </button>
        </form>
      )}

      {isPast && editing && (
        <form action={saveEventNote} className="flex flex-col gap-3">
          <input type="hidden" name="eventId" value={event.id} />
          <label className="flex flex-col gap-1.5 text-sm">
            A note for attendees
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
      {isPast && !editing && event.adminNote && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Note for attendees</p>
          <p className="text-sm">{event.adminNote}</p>
        </div>
      )}

      <BackLink href="/events" />
    </div>
  );
}
