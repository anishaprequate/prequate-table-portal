import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { joinEvent, cancelEventRsvp } from "@/lib/actions/events";
import { formatSlot, formatDateOnly } from "@/lib/format";
import { BackLink } from "@/components/back-link";
import { Avatar } from "@/components/avatar";

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

  const event = await prisma.event.findFirst({
    where: { id: params.id, publishedAt: { not: null }, archivedAt: null },
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

  const hasJoined = attendance?.joined ?? false;
  const isWaitlisted = attendance?.waitlisted ?? false;
  const isPendingApproval = attendance?.pendingApproval ?? false;
  const isPast = event.startTime < new Date();
  const isCancelled = Boolean(event.cancelledAt);

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
  const isInvited = attendance?.invited ?? false;
  const canSee = !event.inviteOnly || isInvited || hasJoined || isWaitlisted || isPendingApproval;
  const isAnnual = event.tier === "ANNUAL";
  const questions: string[] = event.registrationQuestions ? JSON.parse(event.registrationQuestions) : [];
  const myAnswers: { question: string; answer: string }[] = attendance?.registrationAnswers
    ? JSON.parse(attendance.registrationAnswers)
    : [];

  const takenSpots = joined.reduce((sum, a) => sum + 1 + a.guestCount, 0);
  const spotsLeft = event.capacity != null ? event.capacity - takenSpots : null;

  const attendees = event.attendeeVisibility === "VISIBLE_TO_ALL" ? joined : [];
  const myGuestNames: string[] = attendance?.guestNames ? JSON.parse(attendance.guestNames) : [];

  return (
    <>
    <div className="grid grid-cols-1 gap-8 lg:max-w-4xl lg:grid-cols-[1fr_320px]">
    <div className="lg:col-start-1">
      {event.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.imageUrl}
          alt=""
          className="mb-6 h-[220px] w-full rounded-md object-cover"
          draggable={false}
        />
      )}

      <h1 className="mb-1 font-display text-4xl italic leading-[1.05] text-ink sm:text-5xl">
        {event.title}
        {isCancelled && (
          <span className="ml-3 align-middle rounded-full bg-grey/10 px-2.5 py-1 text-sm font-sans not-italic text-grey">
            Cancelled
          </span>
        )}
      </h1>
      <p className="mb-10 text-sm text-grey">
        {formatSlot(event.startTime)}
        {event.location && ` · ${event.location}`}
        {spotsLeft !== null && !isPast && !isCancelled && ` · ${Math.max(spotsLeft, 0)} spot${spotsLeft === 1 ? "" : "s"} left`}
      </p>

      {isCancelled && (
        <p className="mb-8 rounded-md bg-grey/10 px-3 py-2 text-sm text-ink">
          This event has been cancelled.
          {event.cancellationReason && (
            <>
              <br />
              {event.cancellationReason}
            </>
          )}
        </p>
      )}

      {event.description && (
        <div className="mb-6 rounded-md border border-grey/15 p-4">
          <div
            className="prose-editor text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
        </div>
      )}

      {!canSee && !isCancelled && <p className="mb-8 text-sm text-grey">This one is invite-only.</p>}

      {canSee && !isPast && !isCancelled &&
        (isPendingApproval ? (
          <div className="mb-6 rounded-md border border-orange/30 bg-orange/5 p-4">
            <p className="text-sm text-ink">
              Your registration is pending approval. We&apos;ll let you know once it&apos;s confirmed.
            </p>
          </div>
        ) : hasJoined ? (
          <div className="mb-6 rounded-md border border-orange/30 bg-orange/5 p-4">
            <p className="text-sm text-ink">You&apos;re on the list for this one — added to your calendar.</p>
            {(myGuestNames.length > 0 ||
              attendance?.arrivalDate ||
              attendance?.dietaryNotes ||
              attendance?.travelNotes ||
              myAnswers.length > 0) && (
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                {myGuestNames.length > 0 && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-grey">Bringing</dt>
                    <dd>{myGuestNames.join(", ")}</dd>
                  </div>
                )}
                {attendance?.arrivalDate && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-grey">Arriving</dt>
                    <dd>{formatDateOnly(attendance.arrivalDate)}</dd>
                  </div>
                )}
                {attendance?.dietaryNotes && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-grey">Dietary</dt>
                    <dd>{attendance.dietaryNotes}</dd>
                  </div>
                )}
                {attendance?.travelNotes && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-grey">Travel / accommodation</dt>
                    <dd>{attendance.travelNotes}</dd>
                  </div>
                )}
                {myAnswers.map((a) => (
                  <div key={a.question}>
                    <dt className="text-xs uppercase tracking-wide text-grey">{a.question}</dt>
                    <dd>{a.answer || "—"}</dd>
                  </div>
                ))}
              </dl>
            )}
            <form action={cancelEventRsvp} className="mt-4">
              <input type="hidden" name="eventId" value={event.id} />
              <button type="submit" className="text-sm text-grey underline hover:text-ink">
                Cancel RSVP
              </button>
            </form>
          </div>
        ) : isWaitlisted ? (
          <div className="mb-6 rounded-md border border-orange/30 bg-orange/5 p-4">
            <p className="text-sm text-ink">
              This one&apos;s full — you&apos;re on the waitlist. We&apos;ll let you know if a spot opens up.
            </p>
            <form action={cancelEventRsvp} className="mt-4">
              <input type="hidden" name="eventId" value={event.id} />
              <button type="submit" className="text-sm text-grey underline hover:text-ink">
                Leave waitlist
              </button>
            </form>
          </div>
        ) : (
          <form
            action={joinEvent}
            className="mb-6 flex flex-col gap-4 rounded-md border border-orange/30 bg-orange/5 p-4"
          >
            <input type="hidden" name="eventId" value={event.id} />

            {event.ticketTypes.length > 0 && (
              <fieldset className="flex flex-col gap-1.5 text-sm">
                <legend className="mb-0.5">Ticket type</legend>
                {event.ticketTypes.map((t, i) => (
                  <label key={t.id} className="flex items-center gap-2">
                    <input type="radio" name="ticketTypeId" value={t.id} defaultChecked={i === 0} required />
                    {t.name}
                  </label>
                ))}
              </fieldset>
            )}

            {event.allowPlusOne && (
              <label className="flex flex-col gap-1.5 text-sm">
                Bringing anyone? Names, comma-separated
                <input
                  type="text"
                  name="guestNames"
                  placeholder="e.g. Priya Shah, Rohan Shah"
                  className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
                />
              </label>
            )}

            {isAnnual && (
              <div className="flex flex-col gap-4 border-t border-orange/20 pt-4">
                <p className="text-xs uppercase tracking-wide text-grey">For the Annual Gathering</p>
                <label className="flex flex-col gap-1.5 text-sm">
                  Arrival date
                  <input
                    type="date"
                    name="arrivalDate"
                    className="w-fit rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  Dietary requirements
                  <textarea
                    name="dietaryNotes"
                    rows={2}
                    className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  Travel / accommodation needed
                  <textarea
                    name="travelNotes"
                    rows={2}
                    className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
                  />
                </label>
              </div>
            )}

            {questions.length > 0 && (
              <div className="flex flex-col gap-4 border-t border-orange/20 pt-4">
                {questions.map((question, i) => (
                  <label key={i} className="flex flex-col gap-1.5 text-sm">
                    {question}
                    <input
                      type="text"
                      name={`question_${i}`}
                      className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
                    />
                  </label>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="w-fit rounded-md bg-orange px-5 py-3 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
            >
              {event.approvalRequired ? "Request to join" : "Join"}
            </button>
          </form>
        ))}

      {isPast && hasJoined && event.adminNote && (
        <div className="mb-6 rounded-md border border-grey/15 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">A note from the room</p>
          <p className="text-sm leading-relaxed">{event.adminNote}</p>
        </div>
      )}

      {hasJoined && photoCount > 0 && (
        <div className="mb-6 rounded-md border border-grey/15 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Photos ({photoCount})</p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <a
                key={photo.id}
                href={`/api/events/${event.id}/gallery/${photo.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square overflow-hidden rounded-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/events/${event.id}/gallery/${photo.thumbnailUrl ?? photo.url}`}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </a>
            ))}
          </div>
          {totalPhotoPages > 1 && (
            <div className="mt-3 flex gap-4 text-xs text-grey">
              {photoPage > 1 && (
                <Link href={`/events/${event.id}?photoPage=${photoPage - 1}`} className="hover:text-ink">
                  ← Newer
                </Link>
              )}
              <span>
                Page {photoPage} of {totalPhotoPages}
              </span>
              {photoPage < totalPhotoPages && (
                <Link href={`/events/${event.id}?photoPage=${photoPage + 1}`} className="hover:text-ink">
                  Older →
                </Link>
              )}
            </div>
          )}
        </div>
      )}

    </div>

    <div className="flex flex-col gap-6 lg:col-start-2 lg:row-start-1">
      <div className="rounded-md border border-grey/15 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-grey">Hosted by</p>
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

      {attendees.length > 0 && (
        <div className="rounded-md border border-grey/15 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Who's going</p>
          <div className="mb-3 flex flex-wrap items-center">
            {attendees.slice(0, 8).map((a) => (
              <Avatar
                key={a.id}
                name={a.member.name}
                photoUrl={a.member.photoUrl}
                size="sm"
                className="-ml-2 ring-2 ring-paper first:ml-0"
              />
            ))}
            {attendees.length > 8 && (
              <span className="-ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-grey/10 text-xs text-grey ring-2 ring-paper">
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

      {!isPast && (
        <Link href="/messages/rm" className="inline-block text-sm text-grey underline hover:text-ink">
          Contact the host
        </Link>
      )}
    </div>
    </div>

      <div className="mt-8 lg:max-w-4xl">
        <BackLink href="/events" />
      </div>
    </>
  );
}
