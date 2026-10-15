// Who sees what in the admin console. One list, so changing what a login can
// see means changing one place.
//
// Logins:
//   Admin (the owner) and Amogh   everything; only the owner sees Team logins and Activity
//   Nag and Rakesh (partners)     their own Hours, availability, messages, Insight, table questions
//   Associate (shared login)      a short read-only list

export type Section =
  | "home"
  | "hours"
  | "availability"
  | "members"
  | "bookings"
  | "events"
  | "introductions"
  | "requests"
  | "insight"
  | "messages"
  | "notifications"
  | "replies"
  | "reports"
  | "settings"
  | "team"
  | "activity";

export interface NavItem {
  section: Section;
  href: string;
  label: string;
}

const ALL: NavItem[] = [
  { section: "home", href: "/home", label: "Home" },
  { section: "members", href: "/members", label: "Members" },
  { section: "bookings", href: "/bookings", label: "Bookings" },
  { section: "availability", href: "/availability", label: "Availability" },
  { section: "events", href: "/events", label: "Events" },
  { section: "introductions", href: "/introductions", label: "Introductions" },
  { section: "requests", href: "/requests", label: "Requests" },
  { section: "replies", href: "/replies", label: "Table questions" },
  { section: "insight", href: "/insight", label: "Insight" },
  { section: "messages", href: "/messages", label: "Messages" },
  { section: "notifications", href: "/notifications", label: "Notifications" },
  { section: "reports", href: "/reports", label: "Reports" },
  { section: "settings", href: "/settings", label: "Settings" },
  { section: "team", href: "/team", label: "Team logins" },
  { section: "activity", href: "/activity", label: "Activity" },
];

const PARTNER_NAV: NavItem[] = [
  { section: "hours", href: "/hours", label: "My Hours" },
  { section: "availability", href: "/availability", label: "Availability" },
  { section: "replies", href: "/replies", label: "Table questions" },
  { section: "messages", href: "/messages", label: "Messages" },
  { section: "insight", href: "/insight", label: "Insight" },
];

// What the shared Associate login can open. Read only.
const ASSOCIATE_SECTIONS: Section[] = ["members", "bookings", "events", "introductions", "insight"];

const OWNER_ONLY: Section[] = ["team", "activity"];

export function navFor(role: string): NavItem[] {
  if (role === "PARTNER") return PARTNER_NAV;
  if (role === "ADMIN_ASSOCIATE") return ALL.filter((i) => ASSOCIATE_SECTIONS.includes(i.section));
  if (role === "ADMIN_OWNER") return ALL;
  return ALL.filter((i) => !OWNER_ONLY.includes(i.section)); // Amogh and any RM
}

export function canSeeSection(role: string, section: Section): boolean {
  // Partners also keep Bookings (an Hour's detail page) and Reports, which are
  // not in their menu.
  if (role === "PARTNER") return PARTNER_NAV.some((i) => i.section === section) || section === "bookings" || section === "reports";
  return navFor(role).some((i) => i.section === section);
}

// Where a login lands after signing in.
export function homeFor(role: string): string {
  if (role === "PARTNER") return "/hours";
  if (role === "ADMIN_ASSOCIATE") return "/members";
  return "/home";
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN_OWNER: "Owner",
  ADMIN_RM: "Full admin",
  PARTNER: "Partner",
  ADMIN_ASSOCIATE: "Associate (read only)",
};
