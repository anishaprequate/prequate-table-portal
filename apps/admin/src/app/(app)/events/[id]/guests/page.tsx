import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { getEventDetail } from "@/lib/event-detail";
import { uploadEventPhotos, deleteEventPhoto } from "@/lib/actions/events";
import { EventHeader } from "@/components/events/event-header";
import { EventDetailNav } from "@/components/events/event-detail-nav";
import { AttendeeRsvp } from "@/components/events/attendee-row";
import { Toast } from "@/components/toast";
import { BackLink } from "@/components/back-link";

export default async function EventGuestsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { q?: string; photosUploaded?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);

  const detail = await getEventDetail(params.id, searchParams.q);
  if (!detail) notFound();
  const { event, joined, waitlist, ticketTypeName } = detail;

  return (
    <div className="max-w-md">
      <EventHeader detail={detail} writable={writable} />
      <EventDetailNav eventId={event.id} active="guests" showEdit={writable} />

      <form className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search guests by name"
          className="w-full rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
        />
      </form>

      <div className="mb-8 rounded-md border border-grey/15 p-4">
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-wide text-grey">Joined ({joined.length})</p>
          <a href={`/api/events/${event.id}/guests.csv`} className="text-xs text-grey underline hover:text-ink">
            Export CSV
          </a>
        </div>
        {joined.length === 0 && <p className="text-sm text-grey">No one yet.</p>}
        <ul className="flex flex-col gap-2 text-sm">
          {joined.map((a) => (
            <li key={a.id}>
              <p>
                {a.member.name}
                {a.guestNames
                  ? ` + ${(JSON.parse(a.guestNames) as string[]).join(", ")}`
                  : a.guestCount > 0
                    ? ` + ${a.guestCount}`
                    : ""}
                {ticketTypeName(a.ticketTypeId) && <span className="text-grey"> · {ticketTypeName(a.ticketTypeId)}</span>}
                {a.checkedInAt && <span className="text-deep-orange"> · Checked in</span>}
              </p>
              <AttendeeRsvp attendee={a} />
            </li>
          ))}
        </ul>
      </div>

      {waitlist.length > 0 && (
        <div className="mb-8 rounded-md border border-grey/15 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Waitlist ({waitlist.length})</p>
          <ul className="flex flex-col gap-2 text-sm">
            {waitlist.map((a) => (
              <li key={a.id}>
                {a.member.name}
                {a.guestCount > 0 && ` + ${a.guestCount}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {event.externalGuests && (
        <div className="mb-8 rounded-md border border-grey/15 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Guests beyond the membership</p>
          <ul className="flex flex-col gap-1 text-sm">
            {(JSON.parse(event.externalGuests) as { name: string; email: string }[]).map((g) => (
              <li key={g.email || g.name}>
                {g.name} {g.email && <span className="text-grey">· {g.email}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-md border border-grey/15 p-4">
        <Toast param="photosUploaded" message="Photos uploaded." />
        <p className="mb-2 text-xs uppercase tracking-wide text-grey">
          Gallery ({event.photos.length}) — visible to members who attended
        </p>
        {writable && (
          <form action={uploadEventPhotos} className="mb-4 flex items-end gap-3">
            <input type="hidden" name="eventId" value={event.id} />
            <label className="flex flex-col gap-1.5 text-sm">
              Upload photos
              <input
                type="file"
                name="photos"
                accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
                multiple
                className="text-sm"
              />
            </label>
            <button
              type="submit"
              className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Upload
            </button>
          </form>
        )}
        {event.photos.length === 0 ? (
          <p className="text-sm text-grey">No photos yet.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {event.photos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/briefs/${photo.thumbnailUrl ?? photo.url}`}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                {writable && (
                  <form
                    action={deleteEventPhoto}
                    className="absolute right-1 top-1 opacity-0 transition group-hover:opacity-100"
                  >
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="eventId" value={event.id} />
                    <button type="submit" className="rounded-full bg-ink/80 px-2 py-0.5 text-xs text-paper">
                      Remove
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <BackLink href={`/events/${event.id}`} />
      </div>
    </div>
  );
}
