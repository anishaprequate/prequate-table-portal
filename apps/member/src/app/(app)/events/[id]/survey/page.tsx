import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { submitEventSurvey } from "@/lib/actions/events";
import { BackLink } from "@/components/back-link";

export default async function EventSurveyPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const event = await prisma.event.findUnique({ where: { id: params.id } });

  const attendance = event
    ? await prisma.eventAttendance.findUnique({
        where: { eventId_memberId: { eventId: event.id, memberId: user.id } },
      })
    : null;

  // A stale or already-superseded survey link (the event was removed, or
  // this member's RSVP no longer qualifies) shouldn't read as a hard error
  // — just say so and point back to Events, instead of the framework's
  // raw not-found page.
  if (!event || !attendance?.joined) {
    return (
      <div className="max-w-md">
        <p className="mb-6 text-sm text-grey">This survey isn&apos;t available anymore.</p>
        <BackLink href="/events" />
      </div>
    );
  }

  const alreadyResponded = Boolean(attendance.surveyRespondedAt);

  return (
    <div className="max-w-md">
      <h1 className="mb-1 font-display text-4xl italic leading-tight text-ink sm:text-5xl">
        How was it?
      </h1>
      <p className="mb-10 text-sm text-grey">{event.title}</p>

      {searchParams.saved && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">
          Thanks — that's noted.
        </p>
      )}
      {searchParams.error === "rating" && (
        <p className="mb-6 text-sm text-deep-orange">Pick a rating from 1 to 5 before sending.</p>
      )}

      {alreadyResponded ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-grey">
            You rated this {attendance.surveyRating} out of 5.
            {attendance.surveyFeedback && (
              <>
                <br />
                &ldquo;{attendance.surveyFeedback}&rdquo;
              </>
            )}
          </p>
        </div>
      ) : (
        <form action={submitEventSurvey} className="flex flex-col gap-6">
          <input type="hidden" name="eventId" value={event.id} />

          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1">How would you rate this event?</legend>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label
                  key={n}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-grey/30 text-sm font-medium text-ink has-[:checked]:border-transparent has-[:checked]:bg-ink has-[:checked]:text-paper"
                >
                  <input type="radio" name="rating" value={n} required className="hidden" />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5 text-sm">
            Anything you&apos;d want to see different next time? (optional)
            <textarea
              name="feedback"
              rows={3}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <button
            type="submit"
            className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Send
          </button>
        </form>
      )}

      <BackLink href={`/events/${event.id}`} />
    </div>
  );
}
