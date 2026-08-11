# Guest pass referral

**File:** `js/ms-scripts/guest-pass.js` (exports: `guestPass`, `guestPassRedeem`)
**Design doc:** `docs/guest-pass-design.md`

## What it does

Lets a member on an eligible paid plan generate guest-pass tokens, share a personal redeem link or send it by email, and track sent invites. A recipient who signs up through the link gets their pass marked redeemed.

### On the referral page (`guestPass()`)

Runs if `[data-guestpass-link]`, `[data-guestpass-email-form]`, or `[data-guestpass-table]` is present.

1. Looks up the member's active plan against `ELIGIBLE_PLANS` (a map of plan ID → pass count — kept as a map rather than a bare number in case per-tier counts ever differ, though today every eligible tier gets the same count of 3).
2. If eligible and not already granted for that plan (tracked via `guestPassGrantedPlans` in the member's JSON metadata, not by counting existing rows — so upgrading between eligible tiers later still grants that tier's own allotment), creates `count` passes: one `guest_passes` row (owned, has PII) + one mirrored `guest_pass_lookup` row (public-readable, no PII) per pass, each with a `crypto.randomUUID()`/`getRandomValues` token and a 365-day expiry.
3. Renders the member's current unclaimed pass as a personal link (`{origin}/redeem-trial?token=...`) with a copy button, or an "empty" state if none are unclaimed.
4. Wires the email-invite form: on submit, marks the pass `sent` with the recipient email + timestamp, then POSTs to a Make.com webhook to actually send the email (see below), and re-renders.
5. Renders a table of sent/redeemed invites (email, derived status, sent date) by cloning a hidden Designer-built row template.

### On the redeem page (`guestPassRedeem()`)

Runs if `[data-guestpass-redeem]` is present. Reads `?token=` from the URL, looks it up in the public `guest_pass_lookup` table (anonymous read, no PII), and shows one of an invalid/expired/valid state. On a **logged-out → logged-in** transition happening on that same page load (i.e. the visitor signing up right there, via `ms.onAuthChange`), POSTs `{ token, newMemberId }` to a separate Make.com redemption webhook. An already-logged-in visitor opening someone else's invite is left unhandled on purpose — not the intended redemption flow. The actual signup form (Trial plan `pln_trial-zgug0auc`, 14-day card-required trial) must already exist on this page in Webflow; this script only reacts to it.

## Why two webhooks and not direct client writes

- **Redemption webhook** (`REDEMPTION_WEBHOOK_URL`) — flips `status: redeemed` in both tables via the Memberstack **Admin** API, which the client SDK can't call directly.
- **Invite webhook** (`INVITE_WEBHOOK_URL`) — sends the invite email. The original design routed this through a hidden native Webflow form + Make's "Watch Events" trigger, but Webflow's own form JS permanently marks any form inside a `display:none` container as non-interactive (`w-form-loading`) at page load, before any submission attempt — confirmed live, zero executions reached Make regardless of trigger method. Calling the webhook directly via `fetch` sidesteps Webflow's form system entirely. The email-invite button binds to the submit button's `click` (with `preventDefault`) rather than the form's `submit`, since Webflow's site-wide JS already listens for `submit` on the real `.w-form` and can stop it from bubbling to an ancestor listener.

**Security note:** the invite webhook payload includes the token specifically so the Make scenario can look up the `guest_passes` record itself and send using its **own** stored `recipient_email`/token — never trusting the `recipientEmail`/`link` fields directly from the request. Without that server-side check, the webhook would be an open, unauthenticated relay: anyone reading this public JS could extract the URL and email arbitrary content to arbitrary addresses using the site's identity. The Make side now has this lookup+verify step in place (`guest-pass-invite-email`'s filter — see [make-scenarios.md](make-scenarios.md)), confirmed live 2026-08-11.

## Memberstack Data Tables

Created by hand in the dashboard (not reachable via the client API).

- **`guest_passes`** (sender-owned, has PII) — `member` (MEMBER_REFERENCE), `token`, `status`, `recipient_email`, `sent_date`, `expiry_date` (TEXT), `redeemed_by` (MEMBER_REFERENCE). Access: create `AUTHENTICATED`, read/update `AUTHENTICATED_OWN`, delete `ADMIN`.
- **`guest_pass_lookup`** (no PII, public read) — `token`, `status`, `expiry_date` (TEXT). Access: create `AUTHENTICATED`, read `PUBLIC`, update/delete `ADMIN_ONLY`.

Same field-key-lowercasing gotcha as elsewhere in this codebase — confirm actual keys in the dashboard before relying on the ones used in code.

## Known unverified assumptions (flagged in code comments)

- `member.planConnections` shape (`[{ planId, status: 'ACTIVE', ... }]`) — not yet confirmed against a live member payload.
- `getMemberJSON`/`updateMemberJSON` free-form metadata calls — not yet verified live for this feature.
- `ms.onAuthChange` firing on a logged-out→logged-in transition — not yet verified live.

## Other notes

- Expiry is always computed live from `expiry_date` (`deriveDisplayStatus`), never written as a stored status flip.
- A pass row is written as `sent` regardless of whether the invite webhook call actually succeeds — no delivery-confirmation loop back into status for v1.
- `INVITE_WEBHOOK_URL` points at a working `guest-pass-invite-email` Make scenario, confirmed delivering real invite emails end-to-end as of 2026-08-11 (see [make-scenarios.md](make-scenarios.md) for the scenario's own history — it shipped once already but sat non-functional due to a Make-side field-mapping issue, unrelated to this file). The inline TODO calling it a placeholder is stale and can be removed next time this file is touched.
