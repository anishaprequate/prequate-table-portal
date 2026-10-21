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
  | "advisors"
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

// Two things sit beside the role. hostsHours: the person gives Hours (Nag,
// Rakesh and Amogh), so they get My Hours whatever their role. advisorDesk: the
// person answers advisor requests (Anisha and Nag).
export interface Flags {
  hostsHours?: boolean;
  advisorDesk?: boolean;
}

const MY_HOURS: NavItem = { section: "hours", href: "/hours", label: "My Hours" };
const ADVISORS: NavItem = { section: "advisors", href: "/advisors", label: "Advisor requests" };

export function navFor(role: string, flags: Flags = {}): NavItem[] {
  let items: NavItem[];
  if (role === "PARTNER") items = PARTNER_NAV;
  else if (role === "ADMIN_ASSOCIATE") items = ALL.filter((i) => ASSOCIATE_SECTIONS.includes(i.section));
  else if (role === "ADMIN_OWNER") items = ALL;
  else items = ALL.filter((i) => !OWNER_ONLY.includes(i.section)); // Amogh and any RM

  const full = role === "ADMIN_OWNER" || role === "ADMIN_RM";
  if (full && flags.hostsHours) items = [items[0], MY_HOURS, ...items.slice(1)];
  if (flags.advisorDesk && role !== "ADMIN_ASSOCIATE") {
    const at = items.findIndex((i) => i.section === "requests");
    items = at >= 0 ? [...items.slice(0, at + 1), ADVISORS, ...items.slice(at + 1)] : [...items, ADVISORS];
  }
  return items;
}

export function canSeeSection(role: string, section: Section, flags: Flags = {}): boolean {
  // Partners also keep Bookings (an Hour's detail page) and Reports, which are
  // not in their menu.
  if (role === "PARTNER" && (section === "bookings" || section === "reports")) return true;
  return navFor(role, flags).some((i) => i.section === section);
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
