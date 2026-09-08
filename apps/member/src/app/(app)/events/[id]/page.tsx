import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { joinEvent } from "@/lib/actions/events";
import { formatSlot, formatDateOnly } from "@/lib/format";
import { BackLink } from "@/components/back-link";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const event = await prisma.event.findFirst({
    where: { id: params.id, publishedAt: { not: null } },
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
    <div className="max-w-md">
      {event.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.imageUrl}
          alt=""
          className="mb-6 h-[220px] w-full rounded-md object-cover"
          draggable={false}
        />
      )}

      <h1 className="mb-1 font-display text-4xl italic leading-[1.05] text-ink sm:text-5xl">{event.title}</h1>
      <p className="mb-10 text-sm text-grey">
        {formatSlot(event.startTime)}
        {event.location && ` · ${event.location}`}
        {spotsLeft !== null && !isPast && ` · ${Math.max(spotsLeft, 0)} spot${spotsLeft === 1 ? "" : "s"} left`}
      </p>

      {event.description && (
        <div
          className="prose-editor mb-8 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: event.description }}
        />
      )}

      {!canSee && <p className="mb-8 text-sm text-grey">This one is invite-only.</p>}

      {canSee && !isPast &&
        (isPendingApproval ? (
          <p className="mb-8 text-sm text-grey">
            Your registration is pending approval. We'll let you know once it's confirmed.
          </p>
        ) : hasJoined ? (
          <div className="mb-8">
            <p className="text-sm text-grey">You're on the list for this one — added to your calendar.</p>
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
          </div>
        ) : isWaitlisted ? (
          <p className="mb-8 text-sm text-grey">
            This one's full — you're on the waitlist. We'll let you know if a spot opens up.
          </p>
        ) : (
          <form action={joinEvent} className="mb-8 flex flex-col gap-3">
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
              <>
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
              </>
            )}

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

            <button
              type="submit"
              className="w-fit rounded-md bg-orange px-5 py-3 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
            >
              {event.approvalRequired ? "Request to join" : "Join"}
            </button>
          </form>
        ))}

      {attendees.length > 0 && (
        <div className="mb-8">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Who's going</p>
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

      {isPast && hasJoined && event.adminNote && (
        <div className="mb-8">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">A note from the room</p>
          <p className="text-sm leading-relaxed">{event.adminNote}</p>
        </div>
      )}

      {!isPast && (
        <div className="mb-8">
          <Link href="/messages/rm" className="inline-block text-sm text-grey underline hover:text-ink">
            Contact the host
          </Link>
        </div>
      )}

      <BackLink href="/events" />
    </div>
  );
}
