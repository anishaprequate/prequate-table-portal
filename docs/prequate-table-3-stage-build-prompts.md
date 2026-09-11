# prequate table — 3-stage build prompts (pipeline 1)

prepared by Anisha for handoff to Claude Code, based on the "The Prequate Table, Explained" build note (7 September 2026 prototype status). Rewritten 7 September 2026 with fully specified fields, defaults, and copy so Claude Code can build without stopping to ask, and can't quietly invent something off-spec.

see also: `prequate-table-pipeline-2-action-plan.md`, the next set of stages. Two items in this file are superseded by more detailed versions there, flagged inline where they occur, do not build both versions.

how to use this: paste each stage's prompt into the Claude Code session working on the Prequate Table repo, in order. Each prompt ends with an explicit instruction to stop, report, and wait, do not paste the next stage's prompt until you've reviewed the report and given feedback.

sequence: Stage 1 -> NFC card integration (can run alongside Stage 2) -> Stage 2 -> Stage 3.

---

## operating rules — paste this once before Stage 1, and again at the top of any stage that starts in a fresh session

1. Inspect before you build. Before writing any code for a stage, read the existing models, components, routing, and styling already in the repo. Match existing naming conventions, folder structure, and patterns exactly. Do not introduce a new state-management library, a new component pattern, or a naming style that doesn't match what's already there.
2. Do not stop to ask a clarifying question about an implementation detail this prompt doesn't spell out. Make the single most reasonable choice, consistent with this prompt's explicit instructions, existing conventions elsewhere in the app, and this stage's own numbered items. Implement it, then list it under "assumptions made" in your end-of-stage report.
3. Only stop before a stage is finished if something is genuinely blocking: a feature this stage explicitly depends on isn't actually present, or data this stage needs doesn't exist anywhere in the system and can't reasonably be created within this stage. State exactly what's missing and wait. That is different from an implementation detail, rule 2 covers those.
4. Every field name, enum value, and default given below is meant literally. Use the exact names given. If you must deviate, for instance a naming collision with something already in the codebase, say so explicitly in your report rather than silently renaming.
5. Write or update automated tests for anything with real logic: state transitions, permission checks, notification triggers, SLA or scheduling calculations. Pure UI or copy changes don't need new tests.
6. Server-side guards, not just UI hiding. Any permission rule below (who can see or edit what) must be enforced in the API or route layer, not only by hiding a button in the UI.
7. Before reporting a stage complete, re-read the full prompt against what you actually built, item by item. A partially built item is not a done item, say so plainly if something didn't get finished.
8. Your end-of-stage report always includes: what you built per numbered item, every assumption made under rule 2, any schema or migration changes, tests added, anything that needs a live device or a real vendor account to actually verify, and anything you think deserves its own follow-up stage.

---

## stage 1 — foundation: data model & governance

**why first:** everything in Stage 2, Stage 3, and pipeline 2 depends on member lifecycle status, an audit trail, and event tiering existing in the data model.

**prompt to paste:**

You're working on the Prequate Table app. Before adding new member-facing features, this stage fixes gaps in the data model and admin governance that the rest of the roadmap depends on. Follow the operating rules above throughout.

1. Member lifecycle stage. Add a `status` field to the Member record, string enum, values exactly: `prospect`, `active`, `at_risk`, `renewal_due`, `paused`, `alumni`. Migration default: any member currently seeded from the CPG-FMCG prospect list gets `prospect` (they are not confirmed members yet, per the existing build note). Any genuinely confirmed member gets `active`. If you can't tell which is which from existing data, default everyone to `prospect` and flag this in your report rather than guessing per-record. New members created going forward default to `prospect` unless explicitly set. Surface as an editable dropdown in Admin > Members, list and detail view. Badge styling: `active` = solid badge, Deep Orange (#F96900) background, white text. `renewal_due` = solid badge, Orange (#FF9633) background, white text. `at_risk` = outline badge, Orange (#FF9633) border and text, white fill. `paused` = solid badge, Prequate Grey (#707070) background, white text. `alumni` = outline badge, Prequate Grey (#707070) border and text. `prospect` = outline badge, light grey border and text, no accent color.
2. Member notes/history log. New object, `MemberNote`: fields `member_id`, `author_admin_id`, `body` (plain text, no rich formatting needed), `created_at`. Append-only, no edit or delete of existing entries by anyone, including Owner, this is a relationship record and needs to stay trustworthy. Newest entry at top of the feed. Placeholder text in the input: "Add a note...". Separate from Bookings, Concierge, and Messages, a member's admin detail page should show this as its own feed.
3. Admin audit log. New object, `AuditLogEntry`: fields `entity_type` (e.g. `member`), `entity_id`, `field_name`, `old_value`, `new_value`, `changed_by_admin_id`, `changed_at`. Written automatically on every points-balance edit, status change, and any other direct field edit made in Admin > Members. Immutable, no edit or delete of audit entries by anyone. For points-balance edits specifically, also store the delta (e.g. "+50" or "-20") so the log reads clearly without doing subtraction by hand. Surface a per-member log view (on the member detail page, below or beside the notes feed) and a global recent-changes feed for the Owner only, paginated, newest first.
4. Role-based access. Add an `admin_role` field, string enum, values exactly: `owner`, `rm`, `partner`, `associate`. Existing Owner and RM accounts get `owner` and `rm` respectively, existing Partner accounts keep `partner`. New `associate` role: read-only access to Members, Bookings, Events, and Concierge (can view, cannot edit any field, cannot create, cannot delete). Enforce this server-side per rule 6 above, not just by hiding edit buttons in the UI. No permissions-management UI needed yet, a role field on the admin user record plus route and action guards is enough for this stage.
5. Event tiering. Add an `event_type` field to the Event record, string enum, values exactly: `dinner`, `quarterly`, `annual_gathering`. Default for any event created without an explicit selection: `dinner`. This stage only changes what's stored and displayed (show the tier as a label on the event in Admin > Events and wherever events list on the member side), do not build tier-specific workflows yet, those come later.
6. Concierge SLA field. Add a `target_response_by` timestamp field to each Concierge request, computed at creation time as 2 business days out (business days exclude Saturday and Sunday, no holiday calendar needed for this stage). Apply the same 2-business-day default across all three categories (Lifestyle, Access, Experience) for now, this is a placeholder default, not a final answer, flag it in your report as an assumption to revisit rather than trying to infer different SLAs per category. Don't build the aging or alert view yet, that's a later stage, just make sure the field exists and is populated correctly on every new request.

When this stage is done: stop and report per operating rule 8. Do not start Stage 2 until Anisha responds.

---

## stage 2 — member-facing engagement

**why second:** this is where members start feeling the difference.

**prompt to paste:**

Context: this is Stage 2 of pipeline 1 on the Prequate Table app. Stage 1 added member `status`, `MemberNote`, `AuditLogEntry`, the `associate` role, `event_type` tiering, and the Concierge `target_response_by` field. Confirm you can see all five before starting, if any are missing, stop and say which. Follow the operating rules from the top of this document throughout.

1. Directory search and filter. Add filter and search to the member Directory by seat type, and by company or sector if that field exists on the Member record (if it doesn't yet, add a plain text `sector` field now rather than blocking on it, this is not the archetype taxonomy, which is a separate, more structured piece of work that hasn't been defined yet, do not build an archetype filter here). Applies only to members who've opted into directory visibility.
2. Introduction requests. From the Directory, a member can request an introduction to another visible member. Build this as a new, dedicated object, `IntroductionRequest` (fields: `requesting_member_id`, `target_member_id`, `status` enum `pending` / `connected` / `declined`, `created_at`, `resolved_at`), not folded into Concierge, Concierge's SLA and vendor-note fields don't fit this shape, and a later NFC stage explicitly reuses this same request flow, so it needs to be its own clean object. Requests appear in a new Admin queue, RM or Owner marks a request `connected` or `declined`. Both members get notified on either outcome (a simple notification for now is fine, a fuller notification system arrives in pipeline 2 Stage 1, reuse it once that exists, don't build a second one now).
3. The Hour, pre-session context. Add a `member_note` text field to the Booking record, prompted to the member when they book ("What would you like to cover in this session?", placeholder text, not required, soft limit of roughly 500 characters, don't hard-block longer input). Shown on the booking detail in Admin > Bookings so the partner has something to work from.
4. The Hour, reminders and missed-month handling. Send an email reminder 24 hours before a booked session. An unused month does not roll over, it lapses, the member simply doesn't get a second session the following month to make up for it. This is the final decision, do not leave it open or ask, this matches the existing "one session per calendar month" framing as a use-it-or-lose-it cadence.
5. Events, waitlist and plus-one. When an event's capacity is reached, further RSVPs join a waitlist, first-in-first-out order. When a confirmed RSVP is cancelled, the freed seat does NOT auto-promote the next person on the waitlist, an admin manually offers it (this matches the cancellation behavior in pipeline 2 Stage 1, keep the two consistent). Add an event-level boolean, `allows_plus_one`, default `false`, admin toggles it per event; when true, a member's RSVP includes an optional plus-one name field.
6. Insight, search, tags, bookmarks. Add an admin-set `tags` field to Insight posts (simple string array, set at publish time). Add a search and filter-by-tag control on the member-facing Insight list. Add a bookmark toggle per post per member (a simple join table, `member_id` + `post_id`).
7. Messages, notifications. Superseded by pipeline 2 Stage 1, which fixes real bugs in the existing messaging flow and builds a proper notification system. Skip this item here, do not build a shallow version now that gets replaced later.
8. Home, renewal and tenure awareness. On the member Home screen, show how long the member has been at the Table (based on their member-since date) and, if their `status` is `renewal_due`, a simple line noting that ("Your membership is up for renewal"). No action button needed yet, this is informational only for this stage.

When this stage is done: stop and report per operating rule 8, including what you decided was the most reasonable approach for anything genuinely underspecified above. Do not start Stage 3 until Anisha responds.

---

## nfc card integration — supplementary build prompt

Cards are member-carried, not the seat-fixed tag the original build note describes, meant to work anywhere, the Table venue and offsite event venues, via a mix of the member's own phone and a staffed kiosk. Timeline: live in weeks, hardware and vendor calls below are chosen for speed, not the maximal option.

**run this after Stage 1** (needs the Member record and AuditLogEntry Stage 1 adds). It can run in parallel with Stage 2, only the tap-to-connect item below depends on Stage 2's IntroductionRequest object, and the prompt below checks for that before building it.

**hardware and vendor path, given the timeline:** NTAG213 or NTAG215 blank NFC cards, custom-printed with the Prequate wordmark, from a small-batch NFC card vendor (Seritag, GoToTags, NFC Direct all do this). Encode each card as an NDEF URL tag, no app required, iPhone 11 and newer and Android both read this natively via background tag scanning. Event check-in kiosk: an Android tablet running a Web NFC API check-in page, do not attempt Safari/iOS support for the kiosk. Security note: standard NDEF URL tags can technically be cloned, NTAG 424 DNA tags close that gap with a per-tap signature for roughly $2 to $4 a card versus under $1, start with the cheaper tags given the timeline and treat 424 DNA as a near-term upgrade, not a blocker.

**configuration:** UID-binding, not per-card encoding. Cards ship with a fixed serial from the vendor. An admin taps a new card against their phone or the kiosk, the app reads the UID, and binds it to a member's record via a "Provision Card" action in Admin > Members.

**prompt to paste (after Stage 1 is complete):**

This stage builds real NFC card login and check-in, replacing the current simulated NFC flow and the integration-readiness-only placeholder in Stage 3 below. Follow the operating rules from the top of this document throughout.

1. Card provisioning. In Admin > Members, add a "Provision Card" action. Admin taps the new card against their own phone or the check-in kiosk, the app reads the tapped card's UID, admin selects the member, the UID gets bound to that member's record. One member has exactly one active card at a time, provisioning a new card automatically deactivates their previous one (log this deactivation as an audit entry per operating rule, `entity_type` = `member`, `field_name` = `nfc_card_uid`).
2. Card login. Tapping a bound card opens a URL that authenticates the member and logs them into the portal, same destination whether opening fresh or with an existing session. If the tapped card's UID isn't bound to any member, show a clear error screen: "This card isn't linked to a Table membership yet. Contact your relationship manager." Do not fail silently.
3. Event check-in. Build a check-in web page using the Web NFC API, targeting Android tablets as the kiosk device. On tap: look up the member by card UID, mark them attended for whichever event is currently active on that kiosk, show a confirmation to whoever is staffing the door (member's name and photo if one exists on their profile). If the UID isn't bound to a member, or the member isn't RSVP'd for the active event, show a clear message to the door staff rather than silently doing nothing, exact copy: "Card not recognized for this event" for an unrecognized UID, or "[Name] isn't on the guest list for this event" if the member exists but isn't RSVP'd.
4. Concierge quick-request. A fixed NFC tap point (a card or plaque at the physical Table or a lounge, separate from a member's own card, this is a location tag, not tied to any individual) opens the Concierge request flow directly on whichever phone taps it, pre-filled with a `location` context field noting where the tap happened.
5. Hour check-in. When a member taps their card at the start of a booked partner session, mark that booking as attended automatically in Admin > Bookings, instead of requiring an admin to mark it manually. If no booking exists for that member at that time, do nothing silently, log it, don't create a spurious booking record.
6. Card revocation. In Admin > Members, add a "Deactivate Card" action for lost or replaced cards. Takes effect immediately, login and check-in both fail for a deactivated card, independent of whether a replacement card gets provisioned. Log as an audit entry.
7. Tap-to-connect. When one member's card is tapped against another member's phone, or against a shared kiosk in sequence (tap member A's card, then member B's card, within a short window, define a 30-second window between taps as "in sequence"), create an `IntroductionRequest` (from Stage 2) between them, `status` = `pending`, routed to the same Admin queue Stage 2 built. Confirm Stage 2's `IntroductionRequest` object exists before building this, if it doesn't, stop and say so rather than duplicating that logic here.
8. Audit trail. Every card provision, deactivation, login, and check-in event writes an `AuditLogEntry` (from Stage 1).

When this stage is done: stop and report per operating rule 8, plus explicitly confirm which card hardware assumption you built against (should be NTAG213/215 NDEF URL tags unless you flag otherwise) and anything about the login or check-in flow that needs a live device to actually verify. Do not proceed to Stage 3 until Anisha responds.

---

## stage 3 — admin ops, reporting & integration readiness

**why last:** this is the layer that lets the room actually run at scale.

**prompt to paste:**

Context: this is Stage 3 of pipeline 1. Stage 1 and Stage 2 (and ideally the NFC stage) are complete. Confirm before starting, if anything's missing, stop and say what. Follow the operating rules from the top of this document throughout.

1. Reporting dashboard. Superseded by pipeline 2 Stage 4, which is a much more complete specification (more metrics, chart types, drill-down, feedback loop, cadence mechanism). Skip this item entirely here, build the reporting dashboard from pipeline 2 Stage 4 instead, do not build two versions.
2. Bookings, no-show and cancellation visibility. Define no-show precisely: a confirmed booking or RSVP where attendance was never marked (via NFC check-in or manual admin marking) within 24 hours after the scheduled end time. Define late cancellation: cancelled less than 24 hours before the scheduled start. Track both per member and per partner, surface a simple count on Admin > Bookings and on the member detail page (e.g. "2 no-shows in the last 90 days").
3. Concierge, aging queue. Using `target_response_by` from Stage 1: a request is `overdue` if the current time is past `target_response_by` and its status is not `fulfilled` or `cancelled`. A request is `approaching` if it's within 4 hours of `target_response_by` and still open. Sort the Owner/RM Concierge queue: overdue requests first (oldest overdue first), then approaching requests (soonest first), then everything else by creation date, newest first.
4. Messages, canned responses. RM and Owner share one set of canned response templates (short reply text for common questions: booking, Concierge status, directory visibility), editable by either, since it's a small team and consistency matters more than personalization. Partners get their own separate set, since they only see their own member threads and their use case differs.
5. Insight, review workflow and basic performance. Add a `status` field to Insight posts, enum: `draft`, `pending_review`, `published`. Posts authored by a `partner` role default to `pending_review` and require Owner or RM approval before becoming `published`. Posts authored by `owner` or `rm` publish directly, no review step. Add a simple view count per post (increment once per member per post, not once per page load).
6. Event tier workflows. For events with `event_type` = `annual_gathering`, extend the existing Event object (don't build a fully separate module) with: a guest-list field allowing entries beyond existing members (name and email, not tied to a Member record), a sponsor field (name and logo image, optional), and a date range instead of a single date (start date, end date) to support multi-day. These extra fields only show in the admin form when `annual_gathering` is selected.
7. Integration readiness audit. Written documentation, not code. For each of NFC login (if not already live via the NFC stage), SMS/phone verification, and Luma live sync: document what the codebase needs to go live, the data model involved, whether it needs a webhook or polling design, and exactly where in the code the current mock gets swapped for the real thing. Deliver as a markdown file in the repo, not just a report message.
8. Access control follow-through. Refine the `associate` role from Stage 1 based on how it's actually been used if that's revealed anything. Build the global audit-log view for the Owner if Stage 1 didn't finish it.

When this stage is done: stop and report per operating rule 8. This closes pipeline 1, flag anything you think deserves its own follow-up stage rather than quietly extending scope.
