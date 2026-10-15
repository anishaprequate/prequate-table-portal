# Tabled tasks and decisions

The running list of what has been set aside, what is waiting on someone, and what
has been decided, so none of it depends on anyone's memory. Last updated
14 October 2026 (A6, partner and admin side, added).

Item labels in brackets (A2, A3, A4, a7, b5, b7) are the backlog labels used in
Anisha's briefs. A2 is the Notion sync, A3 is the Home rebuild, A4 is events that
respect curation, A5 is The Hour, A6 is the partner and admin side. A1 has not been defined in any brief I have seen, so it is
listed as an open question below.

## 1. Tabled by decision

These were deliberately set aside. Nothing here is blocked; it is waiting for its turn.

| Item | What it is | State today |
|---|---|---|
| Venue list for reservations | Restaurants and hotels, each with its branches, kept by admin. Members pick from the list, so a booking never lands at the wrong outlet. Tabled on 14 Oct, to be built later. It is the free alternative to the Google suggestions in section 2. | Not built. The sheet uses typed place and branch fields. |
| a7, invitation trigger | What happens when admin sends invitations to a closed event: a notification, an email, or both. | Not built. Sending only records the time (`invitationSentAt`). |
| b7, NFC login | Tap a plate or card to sign in. | Not built. A clean seam was left in the login design. |
| b5, the table letter | The latest letter shown on Home. | Not built. Home shows nothing in that spot until the content exists. |
| WhatsApp one-time codes | A second channel for sign-in codes, after email. | Not built. Needs a verified Meta business account, which does not exist yet. |
| Google Calendar availability for The Hour | Partners' real free time, read live from Google. The seam is built (one provider switch, a free/busy reader, a calendar id per partner). Not switched on: Anisha is confirming the approach. Proposal: dedicated "Table hours" calendar per partner, free/busy only, scopes `calendar.freebusy` and `calendar.events`, service account with domain-wide delegation if partners are on Workspace. | Availability is a weekday 10:00 to 17:00 pattern for every partner. Slots already hide anything booked in the portal. |
| Fifteen-minute Notion sync and webhook | Make the Notion sync run on a schedule, and react to changes. | Not built. A schedule needs hosting. The "Sync now" button works. |

## 2. Waiting on Anisha

| Item | What is needed |
|---|---|
| Google place suggestions | A Google Cloud key for Places API (New), set as `GOOGLE_PLACES_API_KEY` in `apps/member/.env.local`. Without it members type the place and branch. Built and tested only against a stand-in for Google, never live. Check Google's pricing before enabling; I have not verified it. |
| "What does the table mean to you" | Where else it should appear. Today it shows only on the member's own Home. Options suggested: the admin member page (no privacy impact), the directory card for members who are listed, and the table letter with consent. |
| Member login rebuild (a1) | Go-ahead to build it. Staff no longer use it: admin has its own username and password. Plan and schema are already approved: the plate access code on first visit, then a one-time code by email, ninety-day sessions, a lost-phone path, and "contact Anisha, 9150582103" if a code fails. |
| Google calendar approach | Confirm service account (needs a Workspace super admin) or each partner signing in, and that partners will keep a "Table hours" calendar. Nothing live depends on it yet. |
| A1 | Which brief this label refers to. It is not defined anywhere I can find. |
| Commit | Whether the uncommitted work (Phases 0 to 2 of the phone redesign, the Notion sync, A3, A4) goes into PR #1 or a new branch. |

## 3. Waiting on a check I cannot do

| Item | Why |
|---|---|
| Sheets above the phone keyboard | The logic follows the visible area, but the desktop browser cannot raise a real keyboard. Needs a real phone. |
| Admin screens on mobile and in general | The admin console needs the passphrase, which Anisha holds. None of the admin changes for A3 and A4 has been seen in a browser; they are typechecked only. Once signed in on the preview tab, the same 320 pixel audit can run there. |
| Notion write path, live | The sync has been run against real Notion with no changes. Creating an account and writing activity back is untested until a member's Status is set to Active Member. Use a seat of 12 or higher. |
| Google Meet links | An online Hour asks Google to add a Meet link when the event is created (`conferenceDataVersion=1`). The request follows Google's documented shape but has never run against real Google, and the format cannot yet be changed after booking (a change means cancel and rebook). Check the first real online booking. |
| Invites by email | Booking now asks Google to email the invitation (`sendUpdates=all`). Seen only against the real connected calendar once, by mistake; see the note in section 6. Confirm partners and members receive it as intended. |
| Reduced motion | The CSS stops the spin and flip, but the setting could not be switched in the test browser. |

## 4. Not started

| Item | Notes |
|---|---|
| Phone redesign, Phase 3 | The Hour: date strip and time chips, partner cards with photos, confirmation with add to calendar. |
| Phone redesign, Phase 4 | Members cards, Messages, Notifications. |

## 5. Cleanup for the end of the build

| Item | Notes |
|---|---|
| Mock data | Kept on purpose in admin and member until the end of the build. The Notion sync never touches it. Seats 001 to 011 overlap Notion seats 6 to 11; the sync reports the clash and refuses to merge. |
| Test records | "Inaugural Dinner (test)", "Open Dinner (test)", "Today's Dinner (test)", test requests and replies, test bookings, and the book of the year set for demonstration. Remove before real use. |
| Unused columns | `AppSettings.hourPlace` is no longer used since the Hour became online or in person. |
| Unused files | `apps/member/src/lib/updates.ts` and `components/updates-list.tsx` are no longer used by Home. They were left on disk. |
| Database backups | `packages/db/prisma/dev.db.bak-pre-*` files from each schema change. Safe to delete once the build is settled. |

## 6. Decisions made

| Date | Decision |
|---|---|
| 13 Oct | Notion's Table Leads Master decides who is a member. The portal decides activity. |
| 13 Oct | First sign-in uses the plate access code. After that, a one-time code by email. WhatsApp later. |
| 14 Oct | A member declined in Notion is only flagged for review, never deactivated. |
| 14 Oct | When a code is retired, the portal writes "USED" and the date into the master's Access Code. |
| 14 Oct | New activity fields live in a separate linked database in Notion, not in the master. |
| 14 Oct | A member's own edits to name and email are never overwritten by the sync. |
| 14 Oct | A closed event is the existing invite-only setting. Invitations go out when the event is published (or when someone is added to an already published event). A draft's invitations go out when it is published. A separate Send button remains only for any leftovers. |
| 14 Oct | Invite links are switched off for closed events, so no one can invite themselves. |
| 14 Oct | A closed event a member was not invited to answers like an event that does not exist, in every route. |
| 14 Oct | A closed event shows no spots-left count. |
| 14 Oct | Replies to the dinner question are read by the host partner, and by Admin (Anisha) and Amogh. This replaces the earlier host partner only rule. |
| 14 Oct | Briefs, peer Hours and reservations go to one Requests list in admin. Introductions keep their own flow. |
| 14 Oct | The old Updates list is retired from Home. Its contents are folded into the "since you were last here" line and the this-month card. |
| 14 Oct | Crisis access reads "Anisha, 9150582103", sits quietly in the member's Settings, and is editable in admin Settings. The default sentences were written by me and are hers to change. |
| 14 Oct | Every change is checked at 320 and 375 pixels. Tap targets are at least 44 pixels. Round avatars and icons must not shrink. |
| Standing | Sensitive steps stay with Anisha: the Notion token, the admin passphrase, the Google key, and signing in to GitHub. |
| 14 Oct | The Hour is booked from a month calendar. A green dot marks a day with an open Hour. Tapping a day opens a sheet with partners, morning and afternoon times, one note field and Confirm. |
| 14 Oct | An Hour is 60 minutes. It cannot be booked within 12 hours of its start. It can be booked this month or next. |
| 14 Oct | Availability is read live on every open, with no cache, and checked again at the moment of confirming. A slot taken anywhere disappears the next time a day is opened. |
| 14 Oct | Each Hour is Online or In person, chosen with a toggle when booking. In person needs no extra prompt. Online: the sheet says "You will receive a Google Meet link", and Google adds the Meet link to the calendar event. This replaced the earlier place or link field. |
| 14 Oct | One Hour per member per calendar month, shown once and quietly. An unused Hour does not carry over. |
| 14 Oct | If a partner cancels or asks to move an Hour, the member is offered up to three times in the next seven days on different days where possible, and takes one with a tap. A partner can cancel or ask to move only their own Hours. |
| 14 Oct | Past Hours show the date, the partner, the member's own note and what the partner shared. a6 will refine what is shared. |
| 14 Oct | The calendar shows a footer saying green dots indicate availability. |
| 14 Oct | Calendar safety: set `GOOGLE_CALENDAR_DISABLED=1` in an env file to stop the app touching any real calendar. Use it for all testing. |
| 14 Oct | Everything internal runs in the admin console. The member app is for members only: no partner area there. |
| 14 Oct | Admin sign-in is a username and a password, not a dropdown and a shared passphrase. Logins: Admin (Anisha), Nag, Rakesh, Amogh, and one shared Associate login. The RM Desk login is removed. |
| 14 Oct | Passwords are set by Anisha, never seen by anyone else: `npm run set-password -- <username>` in her own terminal, then from the Team logins page. Each person can change their own afterwards. The sign-in form is built so Google Password Manager can save it. |
| 14 Oct | If Nag wants full admin, he takes the Admin password from Anisha. There is one interface and no dual roles. |
| 14 Oct | Amogh has full admin access, like an RM. This was an assumption to confirm. |
| 14 Oct | The Associate login sees only Members, Bookings, Events, Introductions and Insight, read only. This was an assumption to confirm. |
| 14 Oct | Partners see My Hours (upcoming Hours with the member's note and a briefing, and a quick post after an Hour) and Availability. They post Meeting notes, a Brief, a Follow-up or a File. Members see the post type in their Hour history. |
| 14 Oct | A partner can mark times unavailable, and members stop seeing them straight away. Until Google Calendar sync is on, availability follows a weekday pattern. |
| 14 Oct | The admin console is built for phones as well as desktop: a menu on phones, controls at least 44 pixels, and no sideways scrolling. Checked on 36 screens at 320 pixels. |
| 14 Oct | Admin Home shows what needs a person today, with a reserved space for the quiet seat alerts that arrive in b4. |
| 14 Oct | Admin and Amogh can open and change any partner's availability, with a partner picker. The booking page uses the same post box as My Hours, which clears itself after posting, and each post type has a one-line explanation. |
| 14 Oct | Two live events cannot share a title and start time: creating one shows "already exists" with a link. A repeat tap within 30 seconds simply opens the event just made. Each event page shows an Invited list with every invitee's status. |
