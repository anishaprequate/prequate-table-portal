import { promoteFromWaitlist, demoteToWaitlist, checkInAttendee } from "@/lib/actions/events";
import { formatDateOnly } from "@/lib/format";

export type Attendee = {
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

export function AttendeeRsvp({ attendee }: { attendee: Attendee }) {
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

export function AttendeeRow({
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
    <li className="flex flex-col gap-1.5 rounded-full border border-grey/15 px-3 py-1.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange/10 font-display text-xs text-ink">
            {a.member.name.charAt(0)}
          </span>
          <span className="text-ink">
            {a.member.name}
            {a.guestNames
              ? ` + ${(JSON.parse(a.guestNames) as string[]).join(", ")}`
              : a.guestCount > 0
                ? ` + ${a.guestCount}`
                : ""}
          </span>
          {ticketTypeName && (
            <span className="rounded-full bg-grey/10 px-2 py-0.5 text-xs text-grey">{ticketTypeName}</span>
          )}
          {a.checkedInAt && (
            <span className="rounded-full bg-deep-orange/10 px-2 py-0.5 text-xs text-deep-orange">Checked in</span>
          )}
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
      </div>
      <AttendeeRsvp attendee={a} />
    </li>
  );
}
