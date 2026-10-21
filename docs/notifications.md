# Notifications: what is sent, to whom, and how

Decided with Anisha on 15 October 2026 and built the same day. This is the
single list: if a notification is not here, it is not sent. The list lives in code
in `packages/core/src/notify.ts` (one entry per type).

Rules behind it:
- A notification exists only if it changes what the member does next.
- Everything pushed also appears on the Notifications page in the app.
- WhatsApp is never automated. It stays for human contact.
- No marketing email from the portal.
- Each notification opens the exact screen it refers to.

## Members

| # | What happens | Push | Email | Opens | Frequency |
|---|---|---|---|---|---|
| 1 | You are invited to a closed event | Yes | Yes | That event | Once per event, when the invitation is released |
| 2 | Your Hour changes: confirmed (with the place, for an in person Hour), other times suggested, a move requested, the place changed, cancelled or declined. Advisor times offered or declined count too | Yes | Only an in person Hour confirmed without a place yet (see below). Otherwise Google's invite is the confirmation | That Hour | Once per change |
| 3 | A partner posted after your Hour | Yes | No | That Hour | Once per Hour per day. Later posts that day show only in the app |
| 4 | An event is tomorrow, for members who are going | Yes | Yes | That event | 24 hours before |
| 5 | An event is cancelled or moved | Yes | Yes | That event | Per event, rare |
| 6 | You move up from the waitlist to a seat | Yes | No | That event | Rare |
| 7 | Your RSVP is approved, for events that need approval | Yes | No | That event | Rare |
| 8 | Someone asks for an introduction to you | Yes | No | That request | Per request |
| 9 | Your introduction request is accepted | Yes | No | That introduction | Per request |
| 10 | A request you sent from Home (brief, peer Hour, reservation) is done, with the team's note | Yes | Yes | The request | Per request |
| 11 | A new message in Messages, from Anisha or a partner, with their name | Yes | No | That conversation | Every message, no limit, so a live conversation keeps pushing |
| 12 | It is the morning of your event, with place and time | Yes | Yes | That event | Per event |
| 13 | Your Hour starts in an hour | Yes | No | That Hour | Per Hour |
| 14 | A new dinner question to answer | Yes | No | The question on Home | Once per event, to members who are going (an invited member hears it when they say yes) |
| 15 | A new event or insight post is published | Yes | No | That event or post | Combined into one push a day, at 10 am |

Email only (no push):
- Your Hour is tomorrow: 24 hours before. Already built.
- Your Hour is still open: once a month, from 10 am on the first day of the last ten days, only for a member with no Hour or request that month.

In the app only (no push, no email):
- Photos from an event are up.
- An event survey is ready. One email goes out a day after the event as well, and Home keeps a quiet nudge until it is answered. There is no reminder email.
- An introduction request of yours is declined.

Never: marketing email, automated WhatsApp, a push for anything not on this list.

## The team (admin bell, no push)

- A new Hour request or move request goes to the partner.
- A member taking a suggested time goes to the partner.
- A new advisor request goes to Anisha and Nag.
- A member inactive for 60 days goes to the full admins. Already built.

## How an Hour is confirmed, online and in person

- **One window.** The partner confirms the time and, for an in person Hour, the place in the same step. The member gets one notification and one calendar invitation.
- **Online:** confirming makes the Google event with the Meet link, and Google's invite is the confirmation. The portal sends no email.
- **In person:** the member may suggest a place when they ask for the Hour. The partner's place box starts with it, and they can keep or change it. Confirming creates the Google event with that place. Google's invite is the confirmation, so the portal sends no email.
- **If the partner leaves the place empty:** the Hour is confirmed without it, the portal sends one confirmation email, and the place follows later with its own push (setBookingPlace). The partner is nudged once if it is still missing 48 hours before.
- **Suggesting other times:** the partner can add a place to the suggestion, and it becomes the agreed place when the member takes a time.

## Rules decided

- Row 15 combines into one push a day at 10 am, since the last one.
- Row 11 has no limit, because a live conversation needs every push.
- Pushes between 9 pm and 8 am wait until 8 am and nothing is dropped. Messages are exempt.
- Both the day-before and the morning-of event pushes and emails go out.
- The partner gets an email for each new Hour or move request, as well as the bell.
- The portal's own "Hour confirmed" email is sent for in person Hours only. An online Hour is confirmed by Google's invite.
- There is no weekly cap. Volume is bounded by the list itself and the combining rules.

## Technical notes

- **The engine:** every member notification goes through `notifyMember` in
  `packages/core/src/notify.ts`. It writes the page row, pushes (held through quiet
  hours) and emails. The time-driven ones are in `scheduled-notifications.ts`, run by
  `GET /api/cron/notifications?secret=...` on the admin app, every few minutes.
  `npm run jobs` runs it, and the other two cron routes, on this computer.
- **The home screen:** the member app has a manifest, icons, a service worker
  (`public/sw.js`), a one-time install guide for iPhone in Safari, and an "Allow
  notifications" control on Home and in Settings. On iPhone, push needs iOS 16.4 or
  later, the app added to the home screen, and a tap before the permission prompt.
- **Env:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` in admin;
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in the member app, plus the private key and subject
  there too, because the member app sends a few pushes (an introduction accepted).
  `MEMBER_APP_URL` and `ADMIN_APP_URL` are the addresses in emails.
- **Safety switches:** `PUSH_DISABLED=1` and `EMAIL_DISABLED=1` log instead of sending,
  like `GOOGLE_CALENDAR_DISABLED=1`.
- **Not done yet:** nothing calls the cron routes on a real host, and push needs a
  stable HTTPS address (not a quick tunnel). Push to a real iPhone is untested.
