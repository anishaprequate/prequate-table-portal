# The Prequate Table

A private member portal prototype for The Prequate Table — a membership for
Indian founders running ₹100cr+ revenue businesses. Two Next.js apps share
one data layer: a **member app** (the founders' own experience) and an
**admin console** (run by the Prequate team and its partners).

This is a working prototype, not a production system — see
[`docs/integration-readiness.md`](docs/integration-readiness.md) for exactly
which integrations are real and which are mocked, and what it takes to make
each one real.

## Contents

- [What's in the box](#whats-in-the-box)
- [Tech stack](#tech-stack)
- [Project layout](#project-layout)
- [Getting started](#getting-started)
- [The two apps](#the-two-apps)
- [Data model](#data-model)
- [Integrations](#integrations)
- [Scheduled jobs](#scheduled-jobs)
- [Design system / information architecture](#design-system--information-architecture)
- [Known limitations](#known-limitations)

## What's in the box

**Member app** (`apps/member`, port 3000) — what a founder sees:

- **Home** — a dashboard summarizing what's next across every area below.
- **The Hour** — book a session with a partner; one booking per partner per
  calendar month, current and next month both bookable at once.
- **Events** — list/calendar views of dinners, quarterlies, and the Annual
  Gathering; RSVP, waitlist, cancellation notices, a post-event survey, and
  an admin-uploaded photo gallery visible only to attendees.
- **Concierge** — request help across Lifestyle/Access/Experience touchpoint
  categories, presented as a guided "what can we help with" flow rather than
  a form.
- **Directory** — browse other members (opt-in), request introductions,
  track requests sent and received.
- **Insight** — a members-only blog/content feed with bookmarks and a
  Medium-style reading view.
- **Messages & Notifications** — a direct line to your RM and, if allowed,
  individual partners; notifications are a separate inbox from messages,
  each one opening straight to the page it's about.
- **Profile** — contact info, bio, a fixed taxonomy of interests, LinkedIn.
- Login via NFC card tap (primary), phone OTP, or an email magic link —
  see [Auth](#auth) below.

**Admin console** (`apps/admin`, port 3001) — run by Owner/RM/Associate
roles and Partners:

- **Members** — the roster, lifecycle status, sector/archetype tags,
  interests, NFC card provisioning, notes and system timeline, booking
  stats.
- **Events** — a hub (Live/Draft/Archive/Import-from-Luma), each event its
  own hub (Overview/Edit/Registration/Guests/Blasts) — registration
  management, a read-only guest roster with CSV export, one-off message
  blasts with a sent history, and event cancellation as its own state
  (distinct from deleting) that notifies every RSVP'd member.
- **Bookings** — The Hour, admin-side: reschedule, cancel, no-show tracking.
  A check-in kiosk view for tapping members in with NFC.
- **Concierge** — the request queue, category catalog and SLA config.
  categories management.
- **Introductions** — review and route member-to-member introduction
  requests.
- **Insight** — write, preview, and publish posts; per-post view counts.
- **Messages** — the shared RM inbox and individual partner threads.
  **Reports** — a hub of five report sections (The Hour, Events, Concierge,
  Members, Directory & Content) covering utilization, attendance, no-show
  rate, survey ratings, concierge volume/fulfillment time, points trends,
  a 60-day inactivity view, most-active members, and more — every chart
  element drills into a real page listing the underlying records.
- **Settings** — Google Calendar connection, canned message responses, the
  interest-category taxonomy.
- **Activity** — an owner-only audit log.

Partners get a narrower nav (their own bookings, Insight, Messages, Reports,
canned responses) — a deliberate exception letting them see the Reports
dashboard despite otherwise only seeing their own slice of the app.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**, two separate apps in one
  npm workspaces monorepo
- **Tailwind CSS** for styling — see the brand tokens in each app's
  `tailwind.config.ts` (paper `#FFFFFF`, orange `#FF9633`, deep-orange
  `#F96900`, grey `#707070`, ink `#161616`; Product Sans + an italic serif
  display face)
- **Prisma** ORM over **SQLite** (one shared database, one schema)
- **Recharts** for the admin Reports charts
- **Tiptap** for the admin rich-text editor (event/Insight descriptions)
- **Nodemailer** for real transactional email (Google Workspace SMTP)
- **Sharp** for event-gallery thumbnail generation

## Project layout

```
apps/
  admin/     — the admin console (Next.js app, port 3001)
  member/    — the member app (Next.js app, port 3000)
packages/
  core/      — shared business logic: integrations, notifications,
               timeline logging, shared types, upload helpers
  db/        — the Prisma schema, generated client, and seed script
docs/
  design-system.md                      — IA & visual-design reference
  integration-readiness.md              — what's real vs. mocked, and how
                                           to make each integration real
  prequate-table-3-stage-build-prompts.md
  prequate-table-pipeline-2-action-plan.md
                                         — the original staged build briefs
                                           this app was built against
data/
  uploads/   — local disk storage for uploaded files (photos, briefs) in
               this prototype; see docs/integration-readiness.md for what
               a real object-storage swap would look like
```

`@prequate/core` and `@prequate/db` are consumed by both apps as internal
workspace packages (`"@prequate/core": "*"` / `"@prequate/db": "*"` in each
app's `package.json`) — there's no publishing step, npm workspaces just
symlink them.

## Getting started

**Requirements:** Node.js, npm. No Docker, no external database — SQLite
lives on disk at `packages/db/prisma/dev.db`.

```bash
npm install

# packages/db/.env, apps/admin/.env.local, apps/member/.env.local all need
# DATABASE_URL pointing at the same SQLite file — see "Environment
# variables" below for the rest of what each one needs.

npm run db:push      # sync the Prisma schema to the database
npm run db:generate  # regenerate the Prisma client
npm run db:seed      # seed sample members, events, concierge categories, etc.

npm run dev:member   # → http://localhost:3000
npm run dev:admin    # → http://localhost:3001
```

**Important:** after any schema change (`db:push`), always run
`db:generate` and restart both dev servers — a stale generated client is
the most common source of `PrismaClientValidationError: Unknown argument`
during development.

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | all three (`packages/db/.env`, both apps' `.env.local`) | SQLite file path, must match across all three |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | both apps | Google Calendar OAuth (falls back to a mock calendar if unset) |
| `GOOGLE_REDIRECT_URI` | admin | OAuth callback URL for the Calendar connection flow |
| `MEMBER_APP_URL` | admin | Used to build member-facing links (event invite links, magic-link emails) from admin-triggered actions |
| `SMTP_USER` / `SMTP_APP_PASSWORD` | both apps | Google Workspace SMTP for real email; blank falls back to logging the email to the console (`[mock-email]`) |
| `CRON_SECRET` | admin | Shared secret the `/api/cron/*` routes check via `?secret=` |
| `ADMIN_PASSPHRASE` | admin | Shared passphrase for admin/partner login; defaults to `prequate2026` if unset — **not real per-user auth**, see limitations below |

## The two apps

### Auth

- **Member app:** NFC card tap is the primary login (`/login/nfc/[uid]`,
  a real URL-based flow matching what a physical card's NDEF tag would
  open — `/login/tap` is a dev-only dropdown standing in for an actual
  card). Phone OTP and an email magic link (15-minute single-use token) are
  fallbacks.
- **Admin app:** pick your name from a dropdown, enter the shared
  passphrase. Roles: `ADMIN_OWNER`, `ADMIN_RM`, `ADMIN_ASSOCIATE` (read-only
  everywhere `canWrite` gates a mutation), and `PARTNER` (a narrow nav, own
  data only, plus the Reports exception above).

### Information architecture

Both apps follow a **hub-and-detail** pattern for anything that used to be
tabs-on-one-page or a long scroll of unrelated content: a parent route with
a short set of summary cards, one dedicated page per card, and a persistent
sub-navigation so the tree stays reachable from anywhere inside it. Reports,
Events, and Members (admin) are full examples of this. See
[`docs/design-system.md`](docs/design-system.md) for the actual reasoning
and the visual-hierarchy toolkit (common region / proximity / alignment)
behind it — worth reading before adding a new page to either app.

## Data model

One Prisma schema (`packages/db/prisma/schema.prisma`), shared by both
apps. Grouped by area:

- **People & access:** `User` (one model for members, partners, and every
  admin role — see `role` and `lifecycleStatus`), `Session`, `OtpCode`
  (phone OTP and email magic-link tokens share this table, disambiguated by
  `channel`)
- **Profile:** `InterestCategory`, `MemberInterest`, `MemberTimelineEntry`
- **The Hour:** `Booking`, `GoogleCalendarConnection`
- **Events:** `Event`, `EventTicketType`, `EventAttendance`, `EventPhoto`,
  `EventBlast`
- **Concierge:** `ConciergeCategory`, `ConciergeRequest`
- **Directory:** `IntroductionRequest`
- **Messaging:** `Message`, `Notification`
- **Content:** `InsightPost`, `InsightView`, `InsightBookmark`,
  `CannedResponse`, `Brief`

A few soft-state conventions worth knowing before touching this schema:

- Deleting an `Event` archives it (`archivedAt`) rather than removing the
  row — history stays intact, restorable from Admin > Events > Archive.
- Cancelling an `Event` (`cancelledAt` / `cancellationReason`) is a
  separate state from archiving — a cancelled event is still visible to
  members who'd RSVP'd, just marked as cancelled.
- `Notification` and `Message` are deliberately separate systems (see
  `packages/core/src/notifications.ts`) — a new message has its own
  unread-count signal (`Message.read`) and never creates a `Notification`;
  `Notification` is reserved for everything else (event cancellations,
  survey prompts, inactivity flags), each with a `relatedEntityType` /
  `relatedEntityId` the notification opens straight to.

## Integrations

`packages/core/src/integrations/` wraps every external system:

| Integration | File | Status |
|---|---|---|
| Google Calendar | `google-calendar.ts`, `google-oauth.ts` | Real OAuth + real calendar events once connected; falls back to a mock calendar reference if never connected |
| Luma (events import) | `luma.ts` | **Mocked** — returns a fixed set of sample events; see the readiness doc for what a real client needs |
| Email | `mailer.ts`, `email-templates.ts` | Real Google Workspace SMTP if `SMTP_APP_PASSWORD` is set; otherwise logs to the console |

Full detail — what's real, what's faked, and the exact steps to go
live — is in [`docs/integration-readiness.md`](docs/integration-readiness.md),
which also covers NFC cards and SMS OTP (both real logic, no physical
hardware/SMS provider behind them yet).

## Scheduled jobs

Three cron-style routes under `apps/admin/src/app/api/cron/`, each a plain
authenticated `GET` (`?secret=` must match `CRON_SECRET`) meant to be hit by
an external scheduler — nothing in this codebase calls them on its own:

- **`hour-reminders`** — emails a member 24 hours before a confirmed Hour
  session.
- **`event-surveys`** — sends the two-question post-event survey 24 hours
  after an event ends, with one reminder at 3 days if unanswered.
- **`member-inactivity`** — daily; flags any `ACTIVE`/`AT_RISK` member with
  no Hour booking, event attendance, or message (either direction) in 60+
  days, notifying every RM. Won't re-notify for the same still-open gap —
  only after a fresh touch and a new 60-day gap.

## Design system / information architecture

[`docs/design-system.md`](docs/design-system.md) is the standing reference
for navigation architecture, the card-as-hub pattern, and the
visual-hierarchy toolkit used across both apps — read it before
restructuring or adding a page, not just for the admin console.

## Known limitations

This is a prototype. Notably:

- Admin auth is a single shared passphrase, not per-user credentials —
  fine for a small trusted team, not for production.
- Uploaded files (event photos, briefs) live on local disk
  (`data/uploads/`), not object storage.
- SQLite, not a production-grade database — fine for a prototype's data
  volume, not for real concurrent load.
- No automated test suite exists yet anywhere in this repo.
- The member lifecycle enum (`PROSPECT` / `ACTIVE` / `AT_RISK` / `PAUSED` /
  `ALUMNI`) has no `RENEWAL_DUE` status, though it's referenced in some
  planning docs — the inactivity cadence job only watches `ACTIVE` and
  `AT_RISK` as a result.

See [`docs/integration-readiness.md`](docs/integration-readiness.md) for
the fuller, per-integration version of this list.
