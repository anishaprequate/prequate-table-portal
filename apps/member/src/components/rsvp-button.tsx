"use client";

import { useOptimistic, useState, useTransition } from "react";
import { joinEventQuick, cancelEventRsvpQuick, declineInvitationQuick } from "@/lib/actions/events";
import { useToast } from "@/components/toast";
import { Sheet } from "@/components/sheet";

export type RsvpState = "none" | "invited" | "declined" | "joined" | "waitlisted" | "pending";

// What the full RSVP form needs. Present only for events that need more than
// one tap (ticket types, guests, questions, the Annual Gathering fields).
export interface JoinFormConfig {
  ticketTypes: { id: string; name: string }[];
  allowPlusOne: boolean;
  isAnnual: boolean;
  questions: string[];
}

const CHIP: Record<Exclude<RsvpState, "none">, string> = {
  invited: "You're invited",
  declined: "Declined",
  joined: "Going",
  waitlisted: "On the waitlist",
  pending: "Awaiting approval",
};

// The one control for answering an event, used on the card and in the sticky
// bar on the event page. The state changes the instant it is tapped and
// settles to whatever the server decided. Events that need more than a tap
// open the form in a sheet instead of sending the member to another page.
export function RsvpButton({
  eventId,
  state,
  closed,
  approvalRequired,
  form,
}: {
  eventId: string;
  state: RsvpState;
  closed: boolean;
  approvalRequired: boolean;
  form: JoinFormConfig | null;
}) {
  const [optimistic, setOptimistic] = useOptimistic<RsvpState, RsvpState>(state, (_current, next) => next);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const toast = useToast();

  const accepting = closed && (optimistic === "invited" || optimistic === "declined");
  const joinLabel = closed ? "Accept" : approvalRequired ? "Request to join" : "Join";

  function submitJoin(fd: FormData) {
    fd.set("eventId", eventId);
    setFormOpen(false);
    startTransition(async () => {
      setOptimistic(approvalRequired ? "pending" : "joined");
      const result = await joinEventQuick(fd);
      toast(
        result === "joined"
          ? "You're on the list."
          : result === "waitlisted"
            ? "It's full, so you're on the waitlist."
            : "Request sent. We'll confirm shortly.",
      );
    });
  }

  function join() {
    if (form) {
      setFormOpen(true);
      return;
    }
    submitJoin(new FormData());
  }

  function cancel() {
    const fd = new FormData();
    fd.set("eventId", eventId);
    setConfirming(false);
    startTransition(async () => {
      // A closed event keeps the invitation, so stepping back means "declined".
      setOptimistic(closed ? "declined" : "none");
      await cancelEventRsvpQuick(fd);
      toast(closed ? "You've stepped back from this one." : "Your RSVP is cancelled.");
    });
  }

  function decline() {
    const fd = new FormData();
    fd.set("eventId", eventId);
    startTransition(async () => {
      setOptimistic("declined");
      await declineInvitationQuick(fd);
      toast("Declined. You can still change your mind.");
    });
  }

  const sheets = (
    <>
      <Sheet open={confirming} onClose={() => setConfirming(false)} title={closed ? "Step back?" : "Cancel your RSVP?"}>
        <p className="mb-6 text-sm text-taupe">
          {closed
            ? "Your seat is released and the calendar entry is removed. Your invitation stays, so you can accept again if there is room."
            : "Your seat is released and the calendar entry is removed. You can join again if there is room."}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={cancel} className="btn-primary tap flex-1">
            {closed ? "Step back" : "Cancel RSVP"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="btn-secondary tap flex-1">
            Keep it
          </button>
        </div>
      </Sheet>
      {form && (
        <Sheet open={formOpen} onClose={() => setFormOpen(false)} title={closed ? "Accept your invitation" : "Join this event"}>
          <JoinForm form={form} label={joinLabel} onSubmit={submitJoin} />
        </Sheet>
      )}
    </>
  );

  // Going, waitlisted or pending: show the state and a way back out.
  if (optimistic === "joined" || optimistic === "waitlisted" || optimistic === "pending") {
    return (
      <>
        <div className="flex items-center justify-between gap-3">
          <StateChip state={optimistic} />
          <button type="button" onClick={() => setConfirming(true)} className="btn-ghost tap">
            {closed ? "Step back" : "Cancel RSVP"}
          </button>
        </div>
        {sheets}
      </>
    );
  }

  // Invited (closed events): accept or decline in one tap.
  if (accepting && optimistic === "invited") {
    return (
      <>
        <p className="mb-3 text-xs text-gold" aria-live="polite">
          {CHIP.invited}. Accept to take your seat.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={decline} disabled={pending} className="btn-secondary tap !py-2.5">
            Decline
          </button>
          <button type="button" onClick={join} disabled={pending} className="btn-primary tap flex-1 !py-2.5">
            Accept
          </button>
        </div>
        {sheets}
      </>
    );
  }

  if (accepting && optimistic === "declined") {
    return (
      <>
        <div className="flex items-center justify-between gap-3">
          <StateChip state="declined" />
          <button type="button" onClick={join} disabled={pending} className="btn-ghost tap">
            Accept instead
          </button>
        </div>
        {sheets}
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={join} disabled={pending} className="btn-primary tap w-full !py-2.5">
        {joinLabel}
      </button>
      {sheets}
    </>
  );
}

function StateChip({ state }: { state: Exclude<RsvpState, "none" | "invited"> }) {
  const muted = state === "declined";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium animate-scale-in ${
        muted ? "bg-taupe/10 text-taupe" : "bg-foil/15 text-gold"
      }`}
      aria-live="polite"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${muted ? "bg-taupe/50" : "bg-foil"}`} />
      {CHIP[state]}
    </span>
  );
}

function JoinForm({
  form,
  label,
  onSubmit,
}: {
  form: JoinFormConfig;
  label: string;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
      className="flex flex-col gap-4"
    >
      {form.ticketTypes.length > 0 && (
        <fieldset className="flex flex-col gap-1.5 text-sm">
          <legend className="mb-0.5">Ticket type</legend>
          {form.ticketTypes.map((t, i) => (
            <label key={t.id} className="flex min-h-[44px] items-center gap-2">
              <input type="radio" name="ticketTypeId" value={t.id} defaultChecked={i === 0} required />
              {t.name}
            </label>
          ))}
        </fieldset>
      )}

      {form.allowPlusOne && (
        <label className="flex flex-col gap-1.5 text-sm">
          Bringing anyone? Names, comma-separated
          <input type="text" name="guestNames" placeholder="e.g. Priya Shah, Rohan Shah" className="input-field" />
        </label>
      )}

      {form.isAnnual && (
        <div className="flex flex-col gap-4 border-t border-foil/20 pt-4">
          <p className="text-xs uppercase tracking-[0.28em] text-taupe">For the Annual Gathering</p>
          <label className="flex flex-col gap-1.5 text-sm">
            Arrival date
            <input type="date" name="arrivalDate" className="input-field w-fit" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Dietary requirements
            <textarea name="dietaryNotes" rows={2} className="input-field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Travel / accommodation needed
            <textarea name="travelNotes" rows={2} className="input-field" />
          </label>
        </div>
      )}

      {form.questions.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-foil/20 pt-4">
          {form.questions.map((question, i) => (
            <label key={i} className="flex flex-col gap-1.5 text-sm">
              {question}
              <input type="text" name={`question_${i}`} className="input-field" />
            </label>
          ))}
        </div>
      )}

      <button type="submit" className="btn-primary tap w-full">
        {label}
      </button>
    </form>
  );
}
