import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { getEventDetail } from "@/lib/event-detail";
import { approveAttendance, declineAttendance } from "@/lib/actions/events";
import { EventHeader } from "@/components/events/event-header";
import { EventDetailNav } from "@/components/events/event-detail-nav";
import { AttendeeRow, AttendeeRsvp } from "@/components/events/attendee-row";
import { BackLink } from "@/components/back-link";

export default async function EventRegistrationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);

  const detail = await getEventDetail(params.id);
  if (!detail) notFound();
  const { event, joined, waitlist, pending, invitedOnly, ticketTypeName } = detail;

  return (
    <div className="max-w-md">
      {searchParams.saved && <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>}
      <EventHeader detail={detail} writable={writable} />
      <EventDetailNav eventId={event.id} active="registration" showEdit={writable} />

      {pending.length > 0 && (
        <div className="mb-8 rounded-md border border-deep-orange/30 bg-orange/5 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-deep-orange">Pending approval ({pending.length})</p>
          <ul className="flex flex-col gap-2 text-sm">
            {pending.map((a) => (
              <li key={a.id}>
                <p>
                  {a.member.name}
                  {a.guestCount > 0 && ` + ${a.guestCount}`}
                  {ticketTypeName(a.ticketTypeId) && (
                    <span className="text-grey"> · {ticketTypeName(a.ticketTypeId)}</span>
                  )}
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

      <div className="mb-8 rounded-md border border-grey/15 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-grey">Joined ({joined.length})</p>
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
        <div className="mb-8 rounded-md border border-grey/15 p-4">
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

      {event.inviteOnly && (
        <div className="mb-8 rounded-md border border-grey/15 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Invited ({invitedOnly.length})</p>
          {invitedOnly.length === 0 && <p className="text-sm text-grey">No one invited yet.</p>}
          <ul className="flex flex-col gap-1 text-sm">
            {invitedOnly.map((a) => (
              <li key={a.id}>{a.member.name}</li>
            ))}
          </ul>
        </div>
      )}

      <BackLink href={`/events/${event.id}`} />
    </div>
  );
}
