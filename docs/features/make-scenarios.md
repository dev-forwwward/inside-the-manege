# Make.com scenarios (guest pass)

Companion to [guest-pass-referral.md](guest-pass-referral.md). Two Make.com scenarios back the two webhook URLs hardcoded in `js/ms-scripts/guest-pass.js`. Scenario screenshots: `screenshots/`.

## guest-pass-invite-email

Backs `INVITE_WEBHOOK_URL`. Fired by `postInvite()` when a member submits the email-invite form on the referral page.

**Modules:** Webhooks (Custom webhook) → HTTP `POST /v2/data-tables/guest_passes/records...` → filter "Verify matching..." → Gmail (Send an email)

![guest-pass-invite-email scenario](screenshots/guest-pass-invite-email-Make-08-10-2026_09_35_PM.png)

- Receives `{ token, recipientEmail, link }` from the client.
- Looks up the `guest_passes` record by `token` via the Memberstack API (the HTTP module), rather than trusting the payload directly.
- The filter ("Verify matching...") gates the Gmail send on the looked-up record's own stored `recipient_email` matching what the client sent — this is the server-side check the code comment in `guest-pass.js` calls out as required: without it, this webhook would be an open, unauthenticated relay letting anyone email arbitrary content to arbitrary addresses using the site's Gmail identity.
- Gmail module sends the actual invite email using the record's own data, not the raw request body.

## guest-pass-redemption

Backs `REDEMPTION_WEBHOOK_URL`. Fired by `postRedemption()` on the `/redeem-trial` page after `watchForSignupSuccess()` detects a logged-out → logged-in transition for a valid, non-expired token.

**Modules:** Webhooks (Custom webhook) → HTTP GET → HTTP `POST /v2/data-tables/guest_pass_lookup/records...` (filter "Verify real rece...") → HTTP PUT → HTTP `POST /v2/data-tables/guest_passes/records...` → HTTP PUT

![guest-pass-redemption scenario](screenshots/guest-pass-redemption-Make-08-10-2026_09_35_PM.png)

- Receives `{ token, newMemberId }`.
- Chain looks up the record in `guest_pass_lookup` by token, verifies it (filter), then PUTs `status: redeemed` there; separately looks up the matching `guest_passes` record and PUTs `status: redeemed` + `redeemed_by: newMemberId` there too.
- Both writes go through the Memberstack **Admin** API (these are direct HTTP calls with an admin key, not the client SDK) — this is Decision #7 from `docs/guest-pass-design.md`: the client SDK can't flip another member's/record's protected fields, so the status-redeemed write has to happen server-side in Make.
- Two separate tables get updated because `guest_passes` (owner-readable, has PII) and `guest_pass_lookup` (public-readable, no PII) are kept in sync but are two different rows/tables — see the schema note in [guest-pass-referral.md](guest-pass-referral.md).

## Integration Webflow, Klaviyo

**Modules:** Webflow (Watch Events) → Klaviyo (Make an API Call)

![Integration Webflow, Klaviyo scenario](screenshots/Integration-Webflow-Klaviyo-Make-08-10-2026_09_35_PM.png)

Not part of the guest-pass feature — a separate, older integration (last edited 2026-07-20) syncing Webflow events into Klaviyo. Not referenced anywhere in this repo's JS, so it's presumably driven entirely by Webflow-side triggers (form submits / CMS events) rather than custom code here. No further detail available without opening the scenario's module configs.

## Note

The "All scenarios" list-view screenshot (showing the 4 scenarios' Make dashboard row, one blurred and intentionally not documented here) wasn't added to `screenshots/` — only the 3 individual scenario-canvas screenshots above.
