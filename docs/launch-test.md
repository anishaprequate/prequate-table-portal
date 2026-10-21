# A8: the test before the dinner

Prove the launch path end to end with real people. Freeze on 23 November. This
page is the runbook, the script for each tester, and the issue log.

Check where the exit criteria stand at any time:

```bash
npm run launch-check
```

It changes nothing. It reports what is open.

## Before anyone can test

These are not test steps. Each is a build or a decision, and each blocks the test.

| # | What | Why it blocks | Owner |
|---|---|---|---|
| 1 | Member sign-in with the typed plate code (a1) | The brief says "plate code login". Today the sign-in offers a plate tap, a phone number (which shows the code on screen, for development) or an email link. There is no typed plate code. | Build, then Anisha reviews |
| 2 | A stable https address | Friends cannot reach localhost, and a quick tunnel link changes every restart. Installing to the home screen and push need a fixed address. | Anisha: domain or subdomain and DNS |
| 3 | The real members in the portal | The portal holds 11 sample seats and no real members yet. Real members arrive from the Notion master (Status "Active Member", seat 12 or higher, an Access Code, an email). | Anisha: Notion rows, then Sync now |
| 4 | The inaugural dinner as a closed event | Does not exist yet, only the test copy. Created in admin once the members are in, with every seated member invited and the dinner question set. | Admin, after 3 |

## Who

- 3 to 5 friendly members, chosen by Anisha. Each needs a Notion row with their name, email, phone, seat and an Access Code. The code is printed on their plate.
- 2 partners: Pradyumna Nag and Rakesh Bordia. Both already have admin logins.
- Devices: at least one older Android and one iPhone. Each tested at 320px and 375px wide, with reduced motion on.

## Each member

1. Sign in with the plate code. Check the one-time code arrives by email and the session stays signed in.
2. Look around Home. Read the greeting, the card for this month, the Hour, the question, and Ask the table.
3. Book an Hour: pick a green day, a partner, a time. Suggest a place for an in person Hour. Check "Requested" shows under Upcoming.
4. Accept the inaugural dinner invitation. Check it appears under Events and Home.
5. Write a reply to the dinner question on Home.
6. On an iPhone: add to the home screen and turn on notifications.

## Each partner

1. Sign in to admin on a phone and on a desktop.
2. See the member's Hour request. Confirm it with a place, or suggest other times.
3. After a mock Hour, post a note. Check the member sees it.
4. Reply to a message. Check it arrives with the partner's name.

## Devices and settings

- **Sizes:** 320px wide (iPhone SE, small Android) and 375px (iPhone 13 mini to 14). Portrait.
- **Reduced motion:** iPhone: Settings, Accessibility, Motion, Reduce Motion. Android: Settings, Accessibility, Remove animations.
- **Look for:** anything cut off, text too small to read, a button too small to tap, the message box hidden by the keyboard, the page zooming when a field is tapped, movement that continues with reduced motion on.

## Collecting feedback

By WhatsApp or a short call. There is no feedback form in the portal.

Message to send after the test:

> Thank you for trying The Table. Five short questions. 1. Was there a moment you were not sure what to do? 2. Did anything not work, or look wrong on your phone? 3. Did you get the notifications you expected, and not more? 4. What did you like? 5. What would you change first? A voice note is fine.

For a call: ten minutes, the same five questions, and ask them to share their screen or describe what they saw.

## Severity

| Severity | Meaning | What happens |
|---|---|---|
| Blocker | A member cannot sign in, book an Hour, accept the invitation or reply to the question. A partner cannot see or answer a request. Data is lost or shown to the wrong person. | Fix before the freeze. |
| Major | Works, but confusing or wrong enough that a member would stop and ask. | Part B. |
| Minor | A small defect or rough edge. | Part B. |
| Polish | A preference or a nicety. | Part B. |

Only blockers are fixed in this part.

## Issue log

| # | Date | Who | Device and size | Where | What happened | Severity | Status |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## Exit criteria for the freeze on 23 November

- No blocker open.
- Every seated member has a working access code on their plate.
- The inaugural dinner exists as a closed event with all invitees.
