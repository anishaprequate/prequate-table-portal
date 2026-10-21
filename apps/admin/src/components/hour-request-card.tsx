import { approveHourRequest, declineHourRequest, offerHourTimes } from "@/lib/actions/hour-requests";
import { formatSlot } from "@/lib/format";
import { AdvisorOfferForm } from "@/components/advisor-offer-form";

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// A member's request for an Hour, or to move one, waiting for an answer:
// confirm it, suggest other times, or decline. Used on My Hours and on the
// booking page.
export function HourRequestCard({
  booking,
  returnTo,
  showMember = true,
}: {
  booking: {
    id: string;
    startTime: Date;
    pendingStart: Date | null;
    status: string;
    mode: string;
    // For a new in person request: the place the member suggested, if any.
    location: string | null;
    memberContext: string | null;
    member: { name: string };
  };
  returnTo: string;
  showMember?: boolean;
}) {
  const isMove = booking.status !== "REQUESTED" && booking.pendingStart;
  const target = isMove ? booking.pendingStart! : booking.startTime;
  // A new in person request: the place is settled in the same step as the time.
  const askPlace = !isMove && booking.mode === "IN_PERSON";

  return (
    <div className="rounded-lg border border-orange/40 bg-orange/5 p-4">
      {showMember && <p className="font-display text-2xl italic leading-tight text-ink">{booking.member.name}</p>}
      <p className="text-sm text-ink">
        {isMove ? (
          <>
            Asks to move their Hour from {formatSlot(booking.startTime)} to <strong className="font-medium">{formatSlot(target)}</strong>.
          </>
        ) : (
          <>
            Asks for an Hour on <strong className="font-medium">{formatSlot(target)}</strong>, {booking.mode === "ONLINE" ? "online" : "in person"}.
          </>
        )}
      </p>
      {booking.memberContext && <p className="mt-2 whitespace-pre-wrap text-sm text-grey">{booking.memberContext}</p>}
      {askPlace && booking.location && <p className="mt-2 text-sm text-ink">The member suggests meeting at {booking.location}.</p>}

      <form action={approveHourRequest} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="bookingId" value={booking.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        {askPlace && (
          <label className="flex flex-col gap-1 text-sm text-ink">
            Place
            <input
              type="text"
              name="place"
              defaultValue={booking.location ?? ""}
              maxLength={200}
              placeholder="The place you will meet, or leave empty to add it later"
              className="min-h-[44px] rounded-md border border-grey/30 bg-paper px-3 text-ink"
            />
          </label>
        )}
        <div>
          <button type="submit" className="min-h-[44px] rounded-md bg-ink px-5 text-sm font-medium text-paper transition hover:bg-ink/90">
            {askPlace ? "Confirm the time and place" : "Confirm this time"}
          </button>
        </div>
        {askPlace && <p className="text-xs text-grey">The member gets one notification and a calendar invitation with the place.</p>}
      </form>

      <details className="mt-4 border-t border-grey/15 pt-3">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center text-sm text-deep-orange underline underline-offset-2 [&::-webkit-details-marker]:hidden">
          Suggest other times
        </summary>
        <div className="pt-3">
          <AdvisorOfferForm
            requestId={booking.id}
            idName="bookingId"
            offer={offerHourTimes}
            proposedDay={dayKey(target)}
            again={false}
            place={askPlace ? { defaultValue: booking.location ?? "" } : undefined}
          />
        </div>
      </details>

      <form action={declineHourRequest} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="bookingId" value={booking.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <input
          type="text"
          name="reason"
          maxLength={300}
          placeholder="Reason for the member, optional"
          className="min-h-[44px] min-w-0 flex-1 rounded-md border border-grey/30 bg-paper px-3 text-ink"
        />
        <button type="submit" className="min-h-[44px] rounded-md border border-grey/30 px-4 text-sm font-medium text-ink transition hover:border-grey/60">
          Decline
        </button>
      </form>
    </div>
  );
}

export const REQUEST_ERRORS: Record<string, string> = {
  gone: "That request has already been answered.",
  clash: "Another Hour now holds that time. Suggest other times or decline.",
  calendar: "The calendar could not be updated, so nothing was confirmed. Try again.",
};
