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

## NFC tap-in (member login)

**Where it lives:** `apps/member/src/app/login/tap/page.tsx`, `apps/member/src/lib/actions/auth.ts` (`simulateTap`), `User.chipUid` in the schema.

**What's real:** everything past the point of knowing which chip was tapped. `simulateTap` looks up a member by `chipUid`, creates a real session, and redirects to `/home` or the first-arrival screen. That logic doesn't need to change.

**What's faked:** how `chipUid` gets known in the first place. The tap page is a dropdown of every member's name/seat, with a "Simulate tap" button — there is no actual NFC hardware read anywhere. `chipUid` itself is described in the schema as "a stand-in value," and an admin can currently set it by hand from a member's profile, with a note that it won't match a physical chip until that chip is actually provisioned.

**To go live:**
1. Wire up a real NFC read (native app / Web NFC API / a physical reader with its own webhook) that resolves a tapped chip to a `chipUid` value.
2. Call the same lookup-and-session logic `simulateTap` already has, passing in the real `chipUid` instead of a value picked from a dropdown.
3. Provisioning: someone needs a real process for writing a member's `chipUid` onto their physical plate's chip, separate from just typing it into the admin form.

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
