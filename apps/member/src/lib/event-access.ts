import type { Prisma } from "@prequate/db";
import type { JoinFormConfig } from "@/components/rsvp-button";

// The one rule for who may see an event. An open event is visible to every
// member. A closed event (inviteOnly) is visible only to a member who holds a
// sent invitation, or who is already on it (joined, waitlisted or pending).
// An invited row the admin has not sent yet is just a name on a list.
//
// Use this in the `where` of every member-side event query, so a closed event
// is never fetched for someone who should not know it exists.
export function eventVisibleTo(memberId: string): Prisma.EventWhereInput {
  return {
    OR: [
      { inviteOnly: false },
      {
        attendances: {
          some: {
            memberId,
            OR: [
              { invited: true, invitationSentAt: { not: null } },
              { joined: true },
              { waitlisted: true },
              { pendingApproval: true },
            ],
          },
        },
      },
    ],
  };
}

// What the member sees on a card or in the action bar.
export type MemberEventState = "none" | "invited" | "declined" | "joined" | "waitlisted" | "pending";

export function memberEventState(
  event: { inviteOnly: boolean },
  a: { invited: boolean; joined: boolean; waitlisted: boolean; pendingApproval: boolean; declinedAt: Date | null } | undefined,
): MemberEventState {
  if (a?.joined) return "joined";
  if (a?.waitlisted) return "waitlisted";
  if (a?.pendingApproval) return "pending";
  if (event.inviteOnly && a?.invited) return a.declinedAt ? "declined" : "invited";
  return "none";
}

// The RSVP form is only needed when an event asks for more than a tap.
export function joinFormConfig(e: {
  allowPlusOne: boolean;
  tier: string;
  registrationQuestions: string | null;
  ticketTypes: { id: string; name: string }[];
}): JoinFormConfig | null {
  const questions: string[] = e.registrationQuestions ? JSON.parse(e.registrationQuestions) : [];
  const isAnnual = e.tier === "ANNUAL";
  if (e.ticketTypes.length === 0 && !e.allowPlusOne && !isAnnual && questions.length === 0) return null;
  return {
    ticketTypes: e.ticketTypes.map((t) => ({ id: t.id, name: t.name })),
    allowPlusOne: e.allowPlusOne,
    isAnnual,
    questions,
  };
}
