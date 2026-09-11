# Integration readiness: Luma, NFC tap-in, SMS OTP, Hour reminder email

This prototype stands in for several real integrations with mock or stub versions — plus one (Hour reminder email) that's built for real but needs a scheduler and a credential to actually run. This note says exactly what's real today, what's faked, and what going fully live needs. Nothing here is code — it's a checklist for whoever does that work next.

## Luma (events)

**Where it lives:** `packages/core/src/integrations/luma.ts`

**What's real:** the shape of the data. `LumaEvent` and `LumaAttendee` are typed to match what Luma's actual event and guest endpoints return, specifically so a real client can be dropped in without reshaping any calling code.

**What's faked:** the three exposed functions —
- `getUpcomingEvents()` and `getPastEvents()` return a hardcoded array of three mock events (including a stand-in "Annual Gathering"), with dates calculated relative to today so the mock data always looks current.
- `getAttendees(lumaEventId)` always returns an empty array. It is not wired to anything.

**Who calls it:** the admin Events list (`apps/admin/src/app/(app)/events/page.tsx`) reads upcoming/past events from Luma and lines them up against events already published in this app's own database, matched on `lumaEventId`. `publishEvent` (`apps/admin/src/lib/actions/events.ts`) upserts a local `Event` row keyed on `lumaEventId` when an admin clicks "Publish" on a Luma-sourced event.

**To go live:**
1. Implement the same three function signatures against Luma's real API (auth, pagination, rate limits).
2. Build out `getAttendees` for real — there is currently no attendee-sync logic anywhere, since the mock always returns nothing. Decide how a Luma RSVP becomes an `EventAttendance` row here (create on RSVP, reconcile on a schedule, etc.).
3. Everything downstream (the events list, publish flow) should keep working unchanged, since it was built against the mock's types on purpose.

## NFC card (login, check-in, tap-to-connect)

**Where it lives:** `apps/member/src/app/login/nfc/[uid]/page.tsx` (login), `apps/admin/src/components/checkin-kiosk.tsx` + `apps/admin/src/app/api/nfc/{tap,connect}/route.ts` (check-in and tap-to-connect), `apps/admin/src/lib/actions/members.ts` (`provisionCard`, `deactivateCard`), `User.chipUid` in the schema.

**What's real:** the whole logic layer. `chipUid` is UID-bound (an admin provisions a card against a member from their profile page, which also deactivates whatever card they had before and logs both to the timeline). `/login/nfc/[uid]` is a real URL-based login — exactly what a physical card's NDEF URL tag would open — that looks up the member by UID, creates a session, and shows the exact "card not linked" error copy from the build note if the UID isn't bound to anyone. `checkin-kiosk.tsx` uses the real Web NFC API (`NDEFReader`) when the browser supports it (Android Chrome only, by design), calling a real API route that marks event or Hour attendance and writes an audit entry. Tap-to-connect (two different members' cards tapped within 30 seconds) creates a real `IntroductionRequest`, tracked client-side by the kiosk page.

**What's still faked, and needs real hardware to verify:** everything above has never touched an actual NFC chip — there are no physical cards yet. Specifically:
- The dev-only `/login/tap` dropdown still exists for testing without hardware; it now just redirects into the same real `/login/nfc/[uid]` page rather than duplicating login logic, so it's a thin shim, not a parallel system.
- The check-in kiosk's manual UID text field is the only way to exercise it without a real tablet + reader.
- `provisionCard` takes a UID typed or pasted into a form field — the doc's "tap a new card against your phone" flow assumes a phone-side NDEFReader read auto-fills that field, which isn't wired up (would need the same Web NFC read used by the kiosk, added to the provisioning form).

**To go live:**
1. Order NTAG213/215 cards from a vendor (Seritag, GoToTags, NFC Direct), encoded as NDEF URL tags pointing to `https://<memberapp-domain>/login/nfc/<uid-placeholder>` — actually, since the UID itself is what's read (not baked into the tag's URL), what needs encoding is a URL the card's own hardware serial resolves through Web NFC's `serialNumber`, matched at provisioning time. Confirm the exact vendor encoding options support this before ordering at scale.
2. Get an Android tablet for the door kiosk and confirm Chrome's Web NFC permission flow in practice (it prompts per-origin, per session).
3. Test the whole loop with one real card before ordering the full batch: provision it, log in with it, check into a real event, check into a real Hour session, tap it against a second card to confirm tap-to-connect.

## SMS OTP (phone login fallback)

**Where it lives:** `apps/member/src/lib/otp.ts`, `apps/member/src/lib/actions/auth.ts` (`requestOtp`, `verifyOtp`), `OtpCode` in the schema.

**What's real:** code generation, expiry (10 minutes), and verification — `requestOtp` creates a genuine one-time code with a real TTL, and `verifyOtp` correctly checks it hasn't been used or expired.

**What's faked, and worth fixing rather than just replacing:** there is no SMS provider wired up. `requestOtp` currently redirects to the verification screen with the code embedded directly in the URL as a query parameter (`?...&demoCode=123456`), and the next screen displays it from there. That's a reasonable stand-in for a prototype with no SMS budget, but it is not a pattern to carry forward — a code sitting in a URL ends up in browser history and server logs.

**To go live:**
1. Add a real SMS provider call in `requestOtp` that sends `code` to the member's phone.
2. Remove the `demoCode` query parameter entirely — the verification screen should just prompt for a code the member received by text, not display one back to them.
3. Everything else (the `OtpCode` model, generation, expiry, verification) is already production-shaped and doesn't need to change.

## Hour reminder email

**Where it lives:** `packages/core/src/integrations/mailer.ts` (the sender), `apps/admin/src/app/api/cron/hour-reminders/route.ts` (the job), `Booking.reminderSentAt` in the schema.

**What's real:** the send path itself. `mailer.sendEmail` uses real Google Workspace SMTP (`smtp.gmail.com:465`) via `nodemailer`, authenticating as `SMTP_USER` (`anisha@prequate.one`) with `SMTP_APP_PASSWORD`, an app password generated from that Google account's Security settings (requires 2-Step Verification to be on first). The cron route finds every confirmed booking starting 23-25 hours out with no reminder sent yet, emails the member, and marks `reminderSentAt` so it's never sent twice even if the job runs more than once a day.

**What's faked:** nothing in the send logic, but two things around it are prototype-only —
- If `SMTP_APP_PASSWORD` is blank (the default — it ships empty), `sendEmail` falls back to logging what it would have sent to the server console instead of actually sending, so the app runs with zero setup. Fill in the app password in `apps/admin/.env.local` to switch it to real sending, no code change needed.
- There is no actual scheduler. Nothing in this codebase calls the cron route on its own — it's a plain authenticated GET endpoint (`?secret=` must match `CRON_SECRET`), meant to be hit by something external.

**To go live:**
1. Generate a Google app password for `anisha@prequate.one` and set `SMTP_APP_PASSWORD` in `apps/admin/.env.local`.
2. Point a real scheduler at `https://<admin-domain>/api/cron/hour-reminders?secret=<CRON_SECRET>`, running at least daily (hourly is safer, since the window is 23-25 hours and a daily miss could land outside it) — Vercel Cron if hosted there, otherwise any crontab that can hit a URL.
3. Rotate `CRON_SECRET` to a fresh value for production rather than reusing the prototype's.

## Post-event survey and member-inactivity cadence

**Where they live:** `apps/admin/src/app/api/cron/event-surveys/route.ts`, `apps/admin/src/app/api/cron/member-inactivity/route.ts`, `apps/admin/src/lib/member-inactivity.ts` (the shared last-touch calculation both this job and the Reports "60-day inactive" table use).

**What's real:** the same pattern as Hour reminders — a plain authenticated GET (`?secret=` must match `CRON_SECRET`, the same secret as the other cron routes), meant to be hit by something external, no scheduler wired up. Both jobs are otherwise complete: `event-surveys` finds attendees whose event ended 23-25 hours ago and sends the two-question survey (`Notification` + real email via the same `mailer`), then finds anyone who hasn't answered 71-75 hours after that first send and sends exactly one reminder (`EventAttendance.surveyReminderSentAt` gates it, so it never repeats). `member-inactivity` finds every member whose `lifecycleStatus` is `ACTIVE` or `AT_RISK` with a 60+ day gap since their last touch, notifies every `ADMIN_RM` (falling back to `ADMIN_OWNER` if none exist), and records `User.lastInactivityNotifiedAt`/`lastInactivityNotifiedTouch` so the same open gap is never re-flagged — only a fresh touch followed by a new 60-day gap notifies again.

**What's faked:** nothing in the logic — same "no scheduler" gap as Hour reminders, and the same console-log email fallback if `SMTP_APP_PASSWORD` is blank.

**A real gap, not a prototype shortcut:** pipeline 1 Stage 1's member lifecycle enum is `PROSPECT` / `ACTIVE` / `AT_RISK` / `PAUSED` / `ALUMNI` — there is no `RENEWAL_DUE` value, even though the cadence brief names `active`, `at_risk`, and `renewal_due` as the three statuses to watch. `member-inactivity` checks `ACTIVE` and `AT_RISK` only. Adding a real renewal-due status (and whatever workflow should set it) is upstream of this job, not something to guess at here.

**To go live:**
1. Point a real scheduler at both routes, daily, same `CRON_SECRET` as Hour reminders — `https://<admin-domain>/api/cron/event-surveys?secret=<CRON_SECRET>` and `.../api/cron/member-inactivity?secret=<CRON_SECRET>`.
2. Decide on a `RENEWAL_DUE` lifecycle status (or an equivalent signal) if renewal-stage members should also be watched for inactivity.
