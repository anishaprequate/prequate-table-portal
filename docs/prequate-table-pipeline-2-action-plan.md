# prequate table — pipeline 2: action plan and stages

prepared 7 September 2026, based on 19 raw backlog items plus 31 clarifying questions answered by Anisha. Rewritten 7 September 2026 with fully specified fields, defaults, interaction rules, and copy so Claude Code can build without stopping to ask, and can't quietly invent something off-spec. Companion to `prequate-table-3-stage-build-prompts.md` (pipeline 1). This document assumes pipeline 1 Stage 1 (member `status`, `MemberNote`, `AuditLogEntry`, `associate` role, `event_type` tiering, Concierge `target_response_by`) is complete, several stages here depend on it directly.

how to use this: same pattern as pipeline 1. Paste each stage's prompt into the build session in order, wait for the report, give feedback, then move to the next.

ordering is size first, smallest and fastest wins first, with one exception: the messaging bugs are genuinely broken right now, not missing features, so they jump ahead of pure feature work.

your partner or investor review is in under two weeks. Stage 1 alone is realistic inside that window, Stage 2 is a stretch, everything past that should be treated as after the review.

---

## operating rules — paste this once before Stage 1, and again at the top of any stage that starts in a fresh session

1. Inspect before you build. Before writing any code for a stage, read the existing models, components, routing, and styling already in the repo. Match existing naming conventions, folder structure, and patterns exactly. Do not introduce a new state-management library, a new component pattern, or a naming style that doesn't match what's already there.
2. Do not stop to ask a clarifying question about an implementation detail this prompt doesn't spell out. Make the single most reasonable choice, consistent with this prompt's explicit instructions, existing conventions elsewhere in the app, and this stage's own numbered items. Implement it, then list it under "assumptions made" in your end-of-stage report.
3. Only stop before a stage is finished if something is genuinely blocking: a feature this stage explicitly depends on isn't actually present, or data this stage needs doesn't exist anywhere in the system and can't reasonably be created within this stage. State exactly what's missing and wait. That is different from an implementation detail, rule 2 covers those.
4. Every field name, enum value, and default given below is meant literally. Use the exact names given. If you must deviate, for instance a naming collision with something already in the codebase, say so explicitly in your report rather than silently renaming.
5. Write or update automated tests for anything with real logic: state transitions, permission checks, notification triggers, SLA or scheduling calculations, report calculations. Pure UI or copy changes don't need new tests.
6. Server-side guards, not just UI hiding. Any permission rule below (who can see or edit what) must be enforced in the API or route layer, not only by hiding a button in the UI.
7. Before reporting a stage complete, re-read the full prompt against what you actually built, item by item. A partially built item is not a done item, say so plainly if something didn't get finished.
8. Your end-of-stage report always includes: what you built per numbered item, every assumption made under rule 2, any schema or migration changes, tests added, anything that needs a live device or a real vendor account to actually verify, and anything you think deserves its own follow-up stage.

---

## one real decision I won't make for you: whatsapp or in-app messaging

You raised this yourself while answering the messaging question, it's bigger than a backlog item. Keep building in-app Messages (what Stage 1 below does): one system of record, ties into the audit log and notification infrastructure, no per-message cost. Move to WhatsApp Business API instead: members get messages where they already are, but it needs a vendor (Twilio, Gupshup, Interakt, or Meta directly), per-conversation pricing, template approval for anything outside a 24-hour reply window, and a much harder audit trail.

My lean: fix and keep in-app Messages for now, WhatsApp Business API is a real vendor and compliance undertaking, not a quick swap. I would not build past Stage 1 on messaging without you confirming that lean or overriding it. Stage 1 below only fixes bugs and builds the notification foundation, it does not commit you either way beyond that.

---

## set aside for now: needs a decision before there is anything to build

- **Native mobile app.** Parked, not in any stage below. Revisit once the responsive-web pass, Stage 2, has shipped.
- **SMS OTP login.** No provider chosen. Next step: pick between Twilio, MSG91, or Gupshup, get an account and API keys. Once that exists, this is a contained stage, size it as medium.
- **Concierge phone line.** Needs telephony, Exotel, Knowlarity, or a forwarded business line, and a staffing decision, RM directly or a shared line. Next step: pick a provider and a staffing answer.
- **Meeting transcripts.** Blocked on whether Hour sessions are in-person, virtual, or both. Transcription only works on a call platform with that feature, Zoom or Google Meet, or a separate transcription service bolted onto audio. Next step: decide the format of Hour sessions themselves, this is upstream of the app.
- **Archetype taxonomy.** No existing segmentation exists to filter by. This is a definition task, not a build task. Next step: a short working session, likely using the sector and company data already in the Notion prospect list, to draft actual categories before anyone builds a filter against them.

---

## stage 1 — notifications foundation and the smallest fixes

**why first:** the messaging bugs are the one thing on this list that's actually broken, not a missing feature. It also builds the minimal notification system Stage 2's event cancellation and Stage 4's cadence mechanism both need.

**prompt to paste:**

Context: pipeline 1 Stage 1 (member `status`, `MemberNote`, `AuditLogEntry`, `event_type`, Concierge `target_response_by`) should already be complete. Confirm before starting. Follow the operating rules above throughout.

1. Fix: a sent message doesn't appear for the recipient until they manually refresh. Poll for new messages in an open thread every 15 seconds, and poll for the unread-count badge every 30 seconds app-wide. If websockets are already set up elsewhere in this codebase, use those instead of adding polling, follow existing conventions per operating rule 1.
2. Fix: the unread or notification indicator doesn't clear once a message has actually been opened. Mark a message read the moment its thread is opened and visible on screen, clear the relevant badge count immediately, don't wait for a page reload.
3. Build a minimal in-app notification system. New object, `Notification`: fields `recipient_id`, `type` (string enum, seed it now with values you'll need soon even though only one is used yet: `new_message`, `event_cancelled`, `member_inactive`, `concierge_sla_breach`, `intro_request`, `event_survey`), `message` (plain text, the notification's display copy), `related_entity_type`, `related_entity_id`, `read_at` (nullable timestamp), `created_at`. Build a badge (unread count) and a simple notification list or inbox. For this stage, only the `new_message` type actually gets triggered, from a new message being sent. Design the object and the triggering pattern so later stages can add new trigger points without restructuring this.
4. Delete event, draft status. Deletes outright, no confirmation needed.
5. Delete event, published status. If there are existing RSVPs, show a confirmation dialog before allowing deletion, exact copy: "[count] members are RSVP'd for this event. Delete anyway? This cannot be undone." Two buttons: "Cancel" and "Delete Event".
6. Cancel RSVP. Member-initiated, from their own booking view. The freed seat does not auto-reassign to anyone on a waitlist, an admin handles that manually.
7. Publish-to-draft toggle for an event.
8. Sort and filter on the Events list (Admin > Events). Filters: status (`draft` / `published` / `cancelled`, once cancellation exists from Stage 2), `event_type` (`dinner` / `quarterly` / `annual_gathering`, from pipeline 1 Stage 1), date range. Sort options: date ascending, date descending, RSVP count descending.
9. The Hour booking window. At any point in a month, both the current month and the immediately following month should show as bookable on the calendar, always exactly two months visible, no staggered early-open logic, no countdown. Remove whatever logic currently restricts booking to only the current month.

When this stage is done: stop and report per operating rule 8, and explicitly confirm the notification system's shape so Stage 2 knows what it's hooking into. Do not start Stage 2 until Anisha responds.

---

## stage 2 — cancel event, messaging depth, admin tabs, cross-page filters, mobile pass

**why second:** builds directly on Stage 1's notification system.

**prompt to paste:**

Context: Stage 1 shipped the `Notification` system, fixed the live-update and read-state messaging bugs, and cleared the smallest event and booking items. Confirm before starting. Follow the operating rules above throughout.

1. Cancel event as its own state, distinct from delete. Add `cancelled` to the event's status enum alongside `draft` and `published`. A cancelled event stays visible in Admin > Events with a cancelled badge (Prequate Grey #707070 background, white text), its history (who RSVP'd, who attended if it already happened) is preserved, not removed. Cancelling prompts an optional free-text reason field, not required.
2. When an event is cancelled, every RSVP'd member gets a `Notification` (type `event_cancelled`) automatically. Exact copy: "The [Event Name] on [Date] has been cancelled." followed by the reason on its own line if one was provided.
3. Split the single event admin view into three tabs, named exactly: "Registration", "Guests", "Blasts". Registration covers the existing RSVP management. Guests covers the guest list (plus-ones, and for Annual Gathering events per pipeline 1 Stage 3, non-member guests). Blasts sends a one-off announcement or reminder to everyone RSVP'd for that specific event (not a saved recurring campaign), delivered as both a `Notification` and an email, default recipients are confirmed RSVPs, with a checkbox to also include waitlisted members.
4. Extend sort and filter beyond Events to the Members and Directory list views. Filters: by name (text search), by event (which events a member has attended or RSVP'd to), by sector (the plain-text `sector` field from pipeline 1 Stage 2, if that field doesn't exist yet, add it now on the Member record rather than blocking). Do not build an archetype filter, that taxonomy doesn't exist yet, leave a visibly disabled filter option labeled "Archetype (coming soon)" rather than omitting it silently or guessing at categories.
5. A general responsive pass across the member portal, functional down to 375px viewport width (iPhone SE class), tested and confirmed working on: Home, The Hour, Events, Directory, Concierge, and Profile, the six most-used member screens. Admin console mobile behavior is out of scope for this stage, admins are assumed to be on desktop.

When this stage is done: stop and report per operating rule 8, and show what the disabled archetype-filter placeholder actually looks like so Anisha can react to it before the taxonomy exists. Do not start Stage 3 until Anisha responds.

---

## stage 3 — profile, gallery, expanded login, concierge feel

**why third:** each of these is a contained, self-sufficient addition.

**prompt to paste:**

Context: Stage 2 added event cancellation, the three admin tabs, cross-page sort and filter, and the mobile pass. Confirm before starting. Follow the operating rules above throughout.

1. Profile interests, fixed taxonomy, not freeform tags. Use exactly this starter list of ten categories, seed them as the initial data rather than proposing your own: Growth & GTM, Fundraising & Capital, M&A & Exits, Operations & Efficiency, Product & Technology, Talent & Leadership, Wellness & Longevity, Travel & Hospitality, Art & Design, Sport & Fitness. A member can select any number of these on their Profile. Owner and RM can add, edit, or remove categories later via Admin, don't hardcode this list as immutable, but ship these ten as the starting set.
2. Photo gallery on each event. Admin-uploaded only, no member uploads. Accept JPEG, PNG, and HEIC, max 15MB per file, auto-generate a thumbnail for the gallery grid. No hard cap on number of photos per event, paginate the gallery view at 20 photos per page. Visible only to members who attended that specific event, matching the existing rule for attendee-list visibility.
3. Email login via magic link. A member enters their email, receives a link valid for 15 minutes, single-use, invalidated the moment it's clicked (or expires). One tap logs them in, no code to type. Use whatever transactional email provider is already wired up for The Hour's reminder emails (pipeline 1 Stage 2), don't introduce a second email provider. Sits alongside NFC tap (primary login method) and, once built, SMS OTP, as fallback methods, no change to that priority ordering.
4. Concierge redesign. The current form reads bureaucratic. Propose two or three visual directions that lean image-forward and welcoming rather than form-like, working inside the existing brand system, Orange #FF9633 and Deep Orange #F96900 accents, Product Sans, white background. Keep the underlying category structure exactly as it is (Lifestyle, Access, Experience), this is a presentation-layer change, not a data model change. Bring the two or three directions to Anisha to react to before building the final version, do not pick one yourself and ship it.

When this stage is done: stop and report per operating rule 8. Show the interest taxonomy as actually implemented (confirm all ten categories exist) and the Concierge direction options visually, not just described in text. Do not start Stage 4 until Anisha responds.

---

## stage 4 — dashboard reports

**why last:** the biggest, most multi-part item, and the one most dependent on everything else already existing.

**prompt to paste:**

Context: this is the last stage in pipeline 2. Pipeline 1 Stage 1 and pipeline 2 Stages 1 through 3 should all be complete. Confirm before starting. Follow the operating rules above throughout.

Build an Admin > Reports view. Owner and RM have full access. Partners also get access to this view specifically, a deliberate exception to the existing rule that partners only see their own calendar, Insight, and Messages.

1. Core metrics, each with an assigned chart type, don't substitute a different chart type without a reason: Hour utilization (booked vs available sessions per partner per month) as a horizontal bar chart, one bar per partner. Event attendance rate (RSVP'd vs attended, grouped by `event_type` tier) as a vertical bar chart. Concierge volume and average time-to-fulfillment as a line chart over time. A 60-day inactive member view (no Hour booking, no event attendance, no message sent or received in 60+ days) as a sortable table, not a chart.
2. Additional metrics: points balance trends over time as a line chart. Directory and introduction-request activity (from pipeline 1 Stage 2's `IntroductionRequest` object) as a vertical bar chart, requests per month. Insight readership (using the view count from pipeline 1 Stage 3) as a horizontal bar chart, ranked by post. Message response time, RM and partner tracked as two separate series on one line chart over time.
3. Two more metrics: event no-show rate (RSVP'd but not marked attended, distinct from the attendance-rate metric above, since a high RSVP rate paired with a high no-show rate tells a different story than a simply low RSVP rate) as a vertical bar chart per event. Partner utilization comparison (relative Hour usage across partners) folded into the same horizontal bar chart as Hour utilization above, not a separate chart.
4. Most-used services and most-active members, in this same Reports view, not a separate analytics system. Most-used services as a donut chart, by Concierge category (Lifestyle / Access / Experience) volume. Most-active members as a ranked table, composite score from Hour bookings, event attendance, and message activity, weighted equally for now (one activity of any of the three types = one point, simple sum, no need for a more sophisticated weighting yet).
5. Sort and filter on the Reports view itself: by person, sector, and event, same fields as Stage 2's Members and Directory filters. Same archetype caveat, leave the disabled placeholder, don't guess at categories.
6. Detailed reviews: clicking any chart element, a bar, a slice, a line point, opens a side panel (not a full page navigation) listing the underlying member or event records behind that number, with a link from each record to jump to its full detail page.
7. Feedback loops: a short post-event survey, two questions exactly, a 1-to-5 rating ("How would you rate this event?") and one optional free-text field ("Anything you'd want to see different next time?"). Sent as a `Notification` (and email) 24 hours after the event ends. One reminder if unanswered after 3 days, no further nagging after that. Results roll up into this dashboard, average rating per event, per tier.
8. Cadence mechanism: a scheduled job, running daily, checks every member whose `status` is `active`, `at_risk`, or `renewal_due` (from pipeline 1 Stage 1). Compute their last-touch date as the most recent of: last Hour booking, last event attendance, last message sent or received. If that's more than 60 days ago, create exactly one `Notification` (type `member_inactive`) to the RM, don't repeat it daily once already flagged for that gap, only flag again if the member has a fresh touch and then goes quiet again past 60 days a second time.

When this stage is done: stop and report per operating rule 8, and flag anything among the metrics above that needs data that was never actually instrumented in an earlier stage, that's a gap from that stage, not this one, name it specifically. This closes pipeline 2.

---

## untapped areas worth considering

Not on the raw list, worth raising given what this pipeline touches:

- **Referral or nomination flow.** No way for a member to nominate a prospective member into the pipeline, which would also feed directly into the Notion prospect list the Directory is already seeded from.
- **Renewal as a real workflow, not just a nudge.** The cadence mechanism above flags an inactive member. A member coming up for renewal deserves an actual review step, not just a flag.
- **Event cost tracking.** Nothing tracks cost per head or budget against actuals for dinners and the annual gathering.
- **Data export for a member's own record.** Worth having an answer to before it's asked, as the app collects more (points history, meeting transcripts once those exist, notes).

File saved to `master-claude-prequate/workflows/prequate-table-pipeline-2-action-plan.md`.
