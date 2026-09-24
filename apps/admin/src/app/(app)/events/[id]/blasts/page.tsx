import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { getEventDetail } from "@/lib/event-detail";
import { blastEventMessage } from "@/lib/actions/events";
import { formatSlot } from "@/lib/format";
import { EventHeader } from "@/components/events/event-header";
import { EventDetailNav } from "@/components/events/event-detail-nav";
import { Toast } from "@/components/toast";
import { BackLink } from "@/components/back-link";

export default async function EventBlastsPage({ params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);

  const detail = await getEventDetail(params.id);
  if (!detail) notFound();
  const { event } = detail;

  return (
    <div className="max-w-md">
      <EventHeader detail={detail} writable={writable} />
      <EventDetailNav eventId={event.id} active="blasts" showEdit={writable} />

      <Toast param="blasted" message="Blast sent." />

      {writable ? (
        <form action={blastEventMessage} className="mb-8 flex flex-col gap-3 rounded-md border border-grey/15 p-4">
          <input type="hidden" name="eventId" value={event.id} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs uppercase tracking-wide text-grey">Message confirmed registrants</span>
            <textarea
              name="body"
              rows={3}
              placeholder="Sent as a message (via their RM thread) and an email."
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-grey">
            <input type="checkbox" name="includeWaitlist" className="h-4 w-4 accent-orange" />
            Also include waitlisted members
          </label>
          <button
            type="submit"
            className="w-fit rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Send
          </button>
        </form>
      ) : (
        <p className="mb-8 text-sm text-grey">Only a full admin can send a blast.</p>
      )}

      <div className="mb-8 rounded-md border border-grey/15 p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-grey">Previous blasts ({event.blasts.length})</p>
        {event.blasts.length === 0 && <p className="text-sm text-grey">None sent yet.</p>}
        <ul className="flex flex-col gap-4 text-sm">
          {event.blasts.map((blast) => (
            <li key={blast.id} className="flex items-start gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange/10 font-display text-sm text-ink">
                {blast.author.name.charAt(0)}
              </span>
              <div>
                <p className="text-ink">
                  <span className="font-medium">{blast.author.name}</span>{" "}
                  <span className="text-xs text-grey">{formatSlot(blast.createdAt)}</span>
                </p>
                <p className="mt-0.5 text-ink">{blast.body}</p>
                <p className="mt-1 text-xs text-grey">
                  To: Going{blast.includeWaitlist && " + Waitlist"} ({blast.recipientCount})
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-8 rounded-md border border-grey/15 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-grey">System messages</p>
        <p className="text-sm text-ink">
          An automated survey is sent to confirmed attendees 24 hours after the event ends, with one reminder after
          3 days if unanswered.
        </p>
      </div>

      <div className="mt-8">
        <BackLink href={`/events/${event.id}`} />
      </div>
    </div>
  );
}
