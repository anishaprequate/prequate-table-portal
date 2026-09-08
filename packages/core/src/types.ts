export type UserRole = "MEMBER" | "PARTNER" | "ADMIN_OWNER" | "ADMIN_RM" | "ADMIN_ASSOCIATE";

export type MemberLifecycleStatus =
  | "PROSPECT"
  | "ACTIVE"
  | "AT_RISK"
  | "PAUSED"
  | "ALUMNI";

export const MEMBER_LIFECYCLE_STATUSES: MemberLifecycleStatus[] = [
  "PROSPECT",
  "ACTIVE",
  "AT_RISK",
  "PAUSED",
  "ALUMNI",
];

export const MEMBER_LIFECYCLE_LABELS: Record<MemberLifecycleStatus, string> = {
  PROSPECT: "Prospect",
  ACTIVE: "Active",
  AT_RISK: "At Risk",
  PAUSED: "Paused",
  ALUMNI: "Alumni",
};

// Badge treatment per status, matched to the brand accent system (Deep
// Orange = confirmed/active, Orange = needs attention, Grey = inactive).
// "solid" fills the badge with the color; "outline" borders it instead.
export const MEMBER_LIFECYCLE_BADGE: Record<
  MemberLifecycleStatus,
  { variant: "solid" | "outline"; color: "deep-orange" | "orange" | "grey" | "grey-light" }
> = {
  PROSPECT: { variant: "outline", color: "grey-light" },
  ACTIVE: { variant: "solid", color: "deep-orange" },
  AT_RISK: { variant: "outline", color: "orange" },
  PAUSED: { variant: "solid", color: "grey" },
  ALUMNI: { variant: "outline", color: "grey" },
};

export type BookingStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "RESCHEDULE_REQUESTED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  RESCHEDULE_REQUESTED: "Reschedule requested",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
};

export type EventAttendeeVisibility = "VISIBLE_TO_ALL" | "HIDDEN";

export type EventTier = "DINNER" | "QUARTERLY" | "ANNUAL";

export const EVENT_TIER_LABELS: Record<EventTier, string> = {
  DINNER: "Dinner",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual Gathering",
};

export type ConciergeStatus =
  | "SUBMITTED"
  | "AWAITING_APPROVAL"
  | "ACCEPTED"
  | "DECLINED"
  | "FULFILLED";

export const CONCIERGE_STATUS_LABELS: Record<ConciergeStatus, string> = {
  SUBMITTED: "Sent",
  AWAITING_APPROVAL: "Awaiting your approval",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  FULFILLED: "Fulfilled",
};

export type IntroductionStatus = "SENT" | "ACCEPTED" | "DECLINED" | "FULFILLED";

export const INTRODUCTION_STATUS_LABELS: Record<IntroductionStatus, string> = {
  SENT: "Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  FULFILLED: "Fulfilled",
};

export type MemberTimelineEntryType = "NOTE" | "SYSTEM";

export type MessageSenderRole = "MEMBER" | "RM" | "PARTNER";

export type InsightPostStatus = "IN_REVIEW" | "PUBLISHED" | "REJECTED";

export const INSIGHT_STATUS_LABELS: Record<InsightPostStatus, string> = {
  IN_REVIEW: "In review",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
};

export interface SessionUser {
  id: string;
  role: UserRole;
  name: string;
  seatNumber: string | null;
  seatType: string | null;
}

export const CONCIERGE_GROUPS = [
  "Lifestyle Touchpoints",
  "Access Touchpoints",
  "Experience Touchpoints",
] as const;

export type ConciergeGroup = (typeof CONCIERGE_GROUPS)[number];
