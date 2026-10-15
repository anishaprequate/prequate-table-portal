import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { formatSlot, formatDateOnly } from "@/lib/format";
import { eventVisibleTo, joinFormConfig, memberEventState } from "@/lib/event-access";
import { BackLink } from "@/components/back-link";
import { Avatar } from "@/components/avatar";
import { RsvpButton } from "@/components/rsvp-button";
import { StickyActionBar } from "@/components/sticky-action-bar";

const PHOTOS_PER_PAGE = 20;

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { photoPage?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // A closed event the member holds no invitation to is not fetched at all,
  // so it answers exactly like an event that does not exist.
  const event = await prisma.event.findFirst({
    where: { id: params.id, publishedAt: { not: null }, archivedAt: null, ...eventVisibleTo(user.id) },
    include: { ticketTypes: { orderBy: { sortOrder: "asc" } } },
  });
  if (!event) notFound();

  const [attendance, joined] = await Promise.all([
    prisma.eventAttendance.findUnique({
      where: { eventId_memberId: { eventId: event.id, memberId: user.id } },
    }),
    prisma.eventAttendance.findMany({
      where: { eventId: event.id, joined: true },
      include: { member: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const state = memberEventState(event, attendance ?? undefined);
  const hasJoined = state === "joined";
  const isPast = event.startTime < new Date();
  const isCancelled = Boolean(event.cancelledAt);
  const closed = event.inviteOnly;

  const photoPage = Math.max(1, Number(searchParams.photoPage ?? "1") || 1);
  const [photoCount, photos] = hasJoined
    ? await Promise.all([
        prisma.eventPhoto.count({ where: { eventId: event.id } }),
        prisma.eventPhoto.findMany({
          where: { eventId: event.id },
          orderBy: { createdAt: "desc" },
          skip: (photoPage - 1) * PHOTOS_PER_PAGE,
          take: PHOTOS_PER_PAGE,
        }),
      ])
    : [0, []];
  const totalPhotoPages = Math.max(1, Math.ceil(photoCount / PHOTOS_PER_PAGE));

  const myAnswers: { question: string; answer: string }[] = attendance?.registrationAnswers
    ? JSON.parse(attendance.registrationAnswers)
    : [];

  const takenSpots = joined.reduce((sum, a) => sum + 1 + a.guestCount, 0);
  // A closed event is for the people asked: no count of seats left.
  const spotsLeft = !closed && event.capacity != null ? event.capacity - takenSpots : null;

  const attendees = event.attendeeVisibility === "VISIBLE_TO_ALL" ? joined : [];
  const myGuestNames: string[] = attendance?.guestNames ? JSON.parse(attendance.guestNames) : [];
  const canAct = !isPast && !isCancelled;

  const action = (
    <RsvpButton
      eventId={event.id}
      state={state}
      closed={closed}
      approvalRequired={event.approvalRequired}
      form={joinFormConfig(event)}
    />
  );

  const statusCard = "mb-6 rounded-lg border border-foil/30 bg-foil/5 p-5 shadow-sm";

  return (
    <>
      <div className={`grid grid-cols-1 gap-8 lg:max-w-4xl lg:grid-cols-[1fr_320px] ${canAct ? "pb-24 lg:pb-0" : ""}`}>
        <div className="lg:col-start-1">
          {event.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.imageUrl}
              alt=""
              className="mb-6 h-[220px] w-full rounded-lg object-cover shadow-md"
              draggable={false}
            />
          )}

          <h1 className="mb-1 font-display text-4xl italic leading-[1.05] text-ink sm:text-5xl">
            {event.title}
            {isCancelled && (
              <span className="ml-3 align-middle rounded-full bg-taupe/10 px-2.5 py-1 text-sm font-sans not-italic text-taupe">
                Cancelled
              </span>
            )}
          </h1>
          <p className="mb-8 text-sm text-taupe">
            {closed && "By invitation · "}
            {formatSlot(event.startTime)}
            {event.location && ` · ${event.location}`}
            {spotsLeft !== null && canAct && ` · ${Math.max(spotsLeft, 0)} spot${spotsLeft === 1 ? "" : "s"} left`}
          </p>

          {isCancelled && (
            <p className="card mb-8 bg-taupe/5 px-3 py-2 text-sm text-ink">
              This event has been cancelled.
              {event.cancellationReason && (
                <>
                  <br />
                  {event.cancellationReason}
                </>
              )}
            </p>
          )}

          {/* Where the member stands, before anything else. */}
          {canAct && state === "declined" && (
            <div className="card mb-6 bg-taupe/5 p-5">
              <p className="text-sm text-ink">You declined this invitation. You can still accept.</p>
            </div>
          )}
          {canAct && state === "pending" && (
            <div className={statusCard}>
              <p className="text-sm text-ink">
                Your registration is pending approval. We&apos;ll let you know once it&apos;s confirmed.
              </p>
            </div>
          )}
          {canAct && state === "waitlisted" && (
            <div className={statusCard}>
              <p className="text-sm text-ink">
                This one&apos;s full, so you&apos;re on the waitlist. We&apos;ll let you know if a spot opens up.
              </p>
            </div>
          )}
          {canAct && hasJoined && (
            <div className={statusCard}>
              <p className="text-sm text-ink">You&apos;re on the list for this one, and it&apos;s on your calendar.</p>
              {(myGuestNames.length > 0 ||
                attendance?.arrivalDate ||
                attendance?.dietaryNotes ||
                attendance?.travelNotes ||
                myAnswers.length > 0) && (
                <dl className="mt-3 flex flex-col gap-2 text-sm">
                  {myGuestNames.length > 0 && (
                    <div>
                      <dt className="text-xs uppercase tracking-[0.28em] text-taupe">Bringing</dt>
                      <dd>{myGuestNames.join(", ")}</dd>
                    </div>
                  )}
                  {attendance?.arrivalDate && (
                    <div>
                      <dt className="text-xs uppercase tracking-[0.28em] text-taupe">Arriving</dt>
                      <dd>{formatDateOnly(attendance.arrivalDate)}</dd>
                    </div>
                  )}
                  {attendance?.dietaryNotes && (
                    <div>
                      <dt className="text-xs uppercase tracking-[0.28em] text-taupe">Dietary</dt>
                      <dd>{attendance.dietaryNotes}</dd>
                    </div>
                  )}
                  {attendance?.travelNotes && (
                    <div>
                      <dt className="text-xs uppercase tracking-[0.28em] text-taupe">Travel / accommodation</dt>
                      <dd>{attendance.travelNotes}</dd>
                    </div>
                  )}
                  {myAnswers.map((a) => (
                    <div key={a.question}>
                      <dt className="text-xs uppercase tracking-[0.28em] text-taupe">{a.question}</dt>
                      <dd>{a.answer || "—"}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}

          {attendees.length > 0 && (
            <div className="card mb-6 p-5">
              <p className="mb-2 text-xs uppercase tracking-[0.28em] text-taupe">Who&apos;s going</p>
              <div className="mb-3 flex flex-wrap items-center">
                {attendees.slice(0, 8).map((a) => (
                  <Avatar
                    key={a.id}
                    name={a.member.name}
                    photoUrl={a.member.photoUrl}
                    size="sm"
                    className="-ml-2 ring-2 ring-bone first:ml-0"
                  />
                ))}
                {attendees.length > 8 && (
                  <span className="-ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-taupe/10 text-xs text-taupe ring-2 ring-bone">
                    +{attendees.length - 8}
                  </span>
                )}
              </div>
              <ul className="text-sm">
                {attendees.map((a) => (
                  <li key={a.id}>
                    {a.member.name}
                    {a.guestCount > 0 && ` + ${a.guestCount}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {event.description && (
            <div className="card mb-6 p-5">
              <div
                className="prose-editor text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            </div>
          )}

          {isPast && hasJoined && event.adminNote && (
            <div className="card mb-6 p-5">
              <p className="mb-2 text-xs uppercase tracking-[0.28em] text-taupe">A note from the room</p>
              <p className="text-sm leading-relaxed">{event.adminNote}</p>
            </div>
          )}

          {hasJoined && photoCount > 0 && (
            <div className="card mb-6 p-5">
              <p className="mb-2 text-xs uppercase tracking-[0.28em] text-taupe">Photos ({photoCount})</p>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={`/api/events/${event.id}/gallery/${photo.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square overflow-hidden rounded-md shadow-sm transition-all duration-300 hover:shadow-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/events/${event.id}/gallery/${photo.thumbnailUrl ?? photo.url}`}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-105"
                      draggable={false}
                    />
                  </a>
                ))}
              </div>
              {totalPhotoPages > 1 && (
                <div className="mt-3 flex gap-4 text-xs text-taupe">
                  {photoPage > 1 && (
                    <Link
                      href={`/events/${event.id}?photoPage=${photoPage - 1}`}
                      className="transition-colors duration-300 hover:text-ink"
                    >
                      ← Newer
                    </Link>
                  )}
                  <span>
                    Page {photoPage} of {totalPhotoPages}
                  </span>
                  {photoPage < totalPhotoPages && (
                    <Link
                      href={`/events/${event.id}?photoPage=${photoPage + 1}`}
                      className="transition-colors duration-300 hover:text-ink"
                    >
                      Older →
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:col-start-2 lg:row-start-1">
          <div className="card p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.28em] text-taupe">Hosted by</p>
            {event.sponsorLogoUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.sponsorLogoUrl}
                  alt=""
                  className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                  draggable={false}
                />
                <p className="text-sm text-ink">{event.sponsorName}</p>
              </div>
            ) : (
              <p className="text-sm text-ink">{event.sponsorName || "Hosted by The Prequate Table"}</p>
            )}
          </div>

          {!isPast && (
            <Link
              href="/messages/rm"
              className="inline-flex min-h-[44px] items-center text-sm text-taupe underline decoration-taupe/40 underline-offset-2 transition-colors duration-300 hover:text-ink hover:decoration-ink"
            >
              Contact the host
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8 lg:max-w-4xl">
        <BackLink href="/events" />
      </div>

      {/* The action stays in reach: a bar fixed to the bottom on a phone,
          inline on a wide screen. */}
      {canAct && (
        <>
          <StickyActionBar>{action}</StickyActionBar>
          <div className="mt-8 hidden lg:block lg:max-w-4xl">{action}</div>
        </>
      )}
    </>
  );
}
