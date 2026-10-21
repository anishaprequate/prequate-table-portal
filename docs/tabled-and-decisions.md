# Tabled tasks and decisions

The running list of what has been set aside, what is waiting on someone, and what
has been decided, so none of it depends on anyone's memory. Last updated
15 October 2026 (Hour: partners and advisors).

Item labels in brackets (A2, A3, A4, a7, b5, b7) are the backlog labels used in
Anisha's briefs. A2 is the Notion sync, A3 is the Home rebuild, A4 is events that
respect curation, A5 is The Hour, A6 is the partner and admin side. A1 has not been defined in any brief I have seen, so it is
listed as an open question below.

## 1. Tabled by decision

These were deliberately set aside. Nothing here is blocked; it is waiting for its turn.

| Item | What it is | State today |
|---|---|---|
| Venue list for reservations | Restaurants and hotels, each with its branches, kept by admin. Members pick from the list, so a booking never lands at the wrong outlet. Tabled on 14 Oct, to be built later. It is the free alternative to the Google suggestions in section 2. | Not built. The sheet uses typed place and branch fields. |
| a7, notifications | Which notifications exist, by push, email and in the app. | Built on 15 Oct (see `docs/notifications.md`) and tested against a stand-in push service. Waiting on a stable web address and a scheduler to test on a real iPhone. |
| a8, test before the dinner | Prove the launch path with real people. | Tabled on 15 Oct. Runbook written (`docs/launch-test.md`) and `npm run launch-check` added (5 of 12 open). Waiting on: typed plate code login (a1) go-ahead, a stable https address, 3 to 5 real members with access codes in Notion, the real inaugural dinner, and switching off the phone demo code. |
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
| Advisor photos | The three advisors are in, with names and roles. Photos could not be taken from the message, so add them in admin Settings, Advisors (the Photo field). LinkedIn cannot be read automatically. |

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
| 15 Oct | Hour hosts are Nag, Rakesh and Amogh. A separate "gives Hours" switch sits beside the role, so Amogh keeps full admin and also gets My Hours. |
| 15 Oct | Partners: a member picks a green dot day, then proposes a start time, on the hour or half hour, from 10:00 to 19:00 so the Hour ends by 8 pm. The time is proposed as a request and the partner confirms it; the partner confirms it and the member is told straight away. After picking a partner the member sees that partner's day like a calendar's day view, half hour by half hour from 10:00 to 20:00. Nothing is marked busy in the view. Tapping a busy, overlapping or too late time gives a toast at once ("This hour is already taken. Please choose another time."), and tapping a free time selects a 60 minute block. The day is read again every 15 seconds. |
| 15 Oct | Advisors are a separate tab on the booking page. No green dots: the member proposes only a weekday (from tomorrow, this month or next) and a note. The advisor desk offers up to three times, the member takes one, and it is confirmed. Advisors have no calendar or login here. |
| 15 Oct | The advisor desk is Anisha and Nag. They are notified of each request and see it under Advisor requests. Amogh and Rakesh do not. Advisor names, photos, roles and LinkedIn links are edited by full admins in Settings, Advisors. |
| 15 Oct | One Hour a month covers partners and advisors together. A declined or withdrawn advisor request frees the month. |
| 15 Oct | After booking a partner Hour, the member goes straight to their booked Hours with a toast. There is no confirmation sheet and no prompt to book another. |
| 15 Oct | Moving an Hour works exactly like booking: a calendar of green dots for the same partner, the same day view, and a toast if the time is taken. The note and the way of meeting carry over, the Hour moves at once, and the member lands on their booked Hours. The partner cannot be changed when moving. |
| 15 Oct | Partner Hours are requests, like advisors. The member proposes a day, a partner and a start time; the request holds that time and the partner answers: confirm (the Google event and Meet link are made then, and the member is emailed), suggest up to three other times (the member takes one and it is confirmed), or decline with a reason. The partner is told by notification; full admins can also answer from the booking page. |
| 15 Oct | Moving an Hour is a request too. The Hour keeps its current time until the partner confirms the new one; a declined move leaves it where it was. A member can withdraw an unconfirmed request, and withdrawing or being declined never counts as a late cancellation. |
| 15 Oct | The old step by step booking pages (book/month, book/slot) now go to the calendar, because they would have booked instantly and skipped the partner's answer. |
| 15 Oct | Notifications are an explicit list of 15 member notifications plus team ones, in `docs/notifications.md`. Push also appears in the app. Email is for invitations, event cancelled or moved, event tomorrow, event morning, a finished request, Hour tomorrow and Hour still open. No marketing email and no automated WhatsApp. This replaces the idea of a weekly cap. |
| 15 Oct | Hour confirmation by mode: an online Hour is confirmed by Google's invite with the Meet link. An in person Hour is confirmed with its place in one step (the member may suggest a place, the partner keeps or changes it), as one notification and one invitation. Only if the partner leaves the place empty does the portal send one confirmation email and the place follow later. |
| 15 Oct | Notification volume rules: new event or insight posts combine into one push a day at 10 am; messages push every time with no limit; pushes wait through 9 pm to 8 am; both event reminders go out; the partner gets an email for each new request. |
| 15 Oct | The one survey email goes a day after the event, with no reminder email, and Home keeps a quiet nudge until the survey is answered. |
| 15 Oct | Pushes wait through 9 pm to 8 am and go at 8 am. Messages are exempt. |
| 15 Oct | Superseded by the single window: an in person Hour is put on the calendar when the partner confirms, with the place. If no place was given, the partner is nudged once when it is still missing 48 hours before. |
| 15 Oct | Messages carry the sender's name: Anisha for the relationship manager thread, or the partner. Never "the team". The thread is titled with her name. |
| 15 Oct | Phone fit, checked in WebKit (the Safari engine): the chat fills the visible screen with its box at the bottom and above the keyboard; every text box is 16px so Safari never zooms; buttons are at least 44px; screens use the visible height (dvh), not 100vh; dates are written the same on the server and in every browser. |
| 15 Oct | In admin, Hours waiting for a partner's answer (a new request or a proposed move) are listed first on Bookings under "Needs confirmation", in orange, longest waiting at the top, with a "Needs an answer today" flag when the Hour is within a day. Confirmed Hours sit below with a quiet "Confirmed" tag. The menu shows a count on Bookings (full admins) and My Hours (partners), and Home has an "Hours to confirm" row. |
| 15 Oct | "New" on the Insight dial clears when the member opens the Insight list, not only when they open each post (new field `User.insightSeenAt`). Per post view counts, which the admin reads, still count only real opens. Home is no longer replayed from the browser's cache, so badges are always current. |
| 15 Oct | The event page leads with a details card in the style of Luma: date tile, day and time, the place (names a Google Maps link and opens it in Maps), and "By invitation" and spots left. The description moves below, lighter, under "About this event". "N going" with avatars and names shows for every event; the names show unless the admin has hidden the list. New events default to a visible list. |
| 15 Oct | Date, time and place can be edited on an event at any time, including after it is published. A change tells everyone going or invited and updates their calendar entries. An end time at or before the start is refused. |
| 15 Oct | Joining an event never fails because Google Calendar did. The place on the list is saved first, and the calendar entry is made as well as it can be. An event that somehow ends before it starts gets a two hour calendar entry. |
| 15 Oct | Member app colour: the five Table colours are now theme variables (bone is the card surface, a new paper tone is the page, ink the text, plus night and cream that stay dark and light in both themes). Light is the default; dark follows the device until the member taps Dark mode in the menu or sidebar, and the choice is kept on that device. Pages get rhythm from three panels: night (dark), clay and gold-washed. Used on Home (the dial on night, Your seat in clay, On the day in night, Getting ready in gold), the event page details, event cards (first night, then clay and light), and booked Hours (clay, or gold while waiting). The menu and sidebar are dark in both themes. The admin app is unchanged. |
| 15 Oct | Phone navigation is a bar at the bottom: Hour, Events, Home, Messages, Insight. The profile picture at the top right opens Notifications, Members, Settings, Dark mode and Sign out. Members also stays on the Home dial. The bar is hidden inside a conversation, where the message box takes the bottom. From 768px up the dark sidebar stays. |
| 15 Oct | The Home dial is back on the page, not on a dark panel, and the page ground is the original bone again. Hovering a dial icon on a computer shows its section name; on a phone a tap shows it with Open, as before. |
| 15 Oct | Accent text that was clay (the name on Home, page titles, small labels, links) is now the foil gradient: deep gold on the light page so it can be read, bright gold on dark grounds. Icons that were clay are plain foil. |
| 15 Oct | The Home dial centre: the front shows only the seat number; the back shows what is next for the member (their next Hour or event, with a live countdown), or "Chosen, not sold to" with the seated date when nothing is coming up. The front and back no longer rely on the browser hiding the back face. |
| 21 Oct | Data in Supabase, not the apps: the dev database is done. table-dev (Mumbai) holds all 30 tables with the data copied from SQLite; both apps run against it; row level security is on for every table with no public access. Name searches are case insensitive again (mode: insensitive). Still to do: table-prod, the file buckets (Hour files, Insight images, advisor, partner and member photos), and the Hour/photo upload code that reads from the local folder. The old dev.db and a pre-move copy stay on disk as the backup. |
| 21 Oct | Which files go to Supabase Storage (private buckets): Hour files, Insight post images, and photos of advisors, partners and members. Event cover images, event photos and sponsor logos stay where they are (the uploads folder on the machine running the apps). Two Supabase projects, table-dev and table-prod, in the Indian region offered (Mumbai). |
| 21 Oct | Files in Supabase Storage (table-dev): three private buckets, hour-files, insight-images and profile-photos. New uploads of Hour files, Insight images, and member, partner and advisor photos go there, with the kind at the front of the stored name; the database URL stays /api/briefs/<name>. Existing files were copied across under their old names (9 files); the local copies are kept as a backup. Event covers, event photos and sponsor logos stay in the local uploads folder. Nothing is public: the apps read each file with the service key and check who is asking. A file posted after an Hour is now only served to that Hour's member (this closes the earlier gap where any signed-in member could open any file by name). SVG files are always downloads, never drawn inline. Still to do for table-prod: create its buckets and run scripts/move-uploads-to-supabase.cjs with its keys. |
| 21 Oct | A copy of the data on this Mac, as well as Supabase: a one way backup (npm run backup: every table to ~/prequate-table-backups, 14 kept, plus every Supabase file copied into data/uploads) and a local Postgres working copy (npm run local:refresh, dev:member:offline). Not a live two way mirror, because two databases written at once can disagree. Details in docs/backups.md. The twice a day schedule is prepared but not installed until Anisha says so. |
