# Guest Pass — Design

Referral feature: eligible members send friends a free trial invite (MasterClass-style), track sent invites, and see redemption status. Custom on top of Memberstack — Memberstack's own "Free Trial w/ Credit Card" plan only covers the trial mechanic itself, not invites/tracking.

## Understanding Summary

- Eligible members (specific paid plan tier(s), TBD which) get a one-time fixed quota of N passes (TBD count), each with its own expiry date.
- UI: a personal shareable link, an "invite by email" box, and a table of previously sent invites (recipient email, status, date sent).
- Recipient redeems a link → signs up with card on file (Memberstack "Free Trial w/ Credit Card") → 14-day trial → auto-converts to paid unless canceled.
- Email delivery goes through a native Webflow Form → Make scenario (no custom backend/email API in this project).
- No resend/revoke actions on sent invites in v1.

## Assumptions

- Exact pass count per tier and which tier(s) qualify: **TBD**, treated as a config constant in code, not hardcoded business logic.
- Preventing a non-invited signup from reaching the same trial plan (platform-wide trial-eligibility gating) is out of scope — this feature only governs the *invite* path.
- Redeem page is a new Webflow page (`/redeem`), not an existing signup page repurposed.

## Decision Log

1. **Email delivery**: Webflow Form → Make, not a custom backend. *Why*: project has zero backend infra; matches existing low-infra pattern. (Originally scoped with Zapier, swapped to Make per client preference — no design impact, same mechanic.)
2. **Quota model**: fixed N passes per eligible plan tier, granted once, each with own expiry. *Why*: matches the MasterClass reference.
3. **Trial mechanic**: card required upfront (Memberstack "Free Trial w/ Credit Card"). *Why*: client's own linked reference.
4. **Sender eligibility**: specific paid plan tier(s) only. *Why*: referral-perk gating, client's call.
5. **Sent-invites table**: recipient email + status + date sent, no resend/revoke actions in v1. *Why*: minimal useful scope, avoid overbuilding.
6. **Grant mechanism**: lazy client-side grant of pooled rows (no server/webhook to *grant* quota). *Why*: matches existing `favorites.js`/`video-progress.js` pattern (client-owned Data Table rows, `MEMBER_OWNER`/`AUTHENTICATED_OWN`-style access); avoids new infra for a bounded, low-severity risk (a member could in theory self-grant extra unclaimed rows via devtools; worst case is exceeding intended quota, not a financial/security exploit, since every redemption still requires a real card). Alternatives considered: webhook + serverless admin-key grant (more airtight, more infra to build/maintain) and manual ops-seeded quota (zero risk, doesn't scale).
7. **Redemption and status writes**: route through Make + Memberstack Admin REST API, not the client SDK. *Why*: confirmed via Memberstack docs that Data Table rules only go down to `AUTHENTICATED_OWN` for updates — a newly-signed-up recipient is never the owner of the sender's pass row, so no client-side rule permits them to flip it. Reusing the already-accepted Make dependency avoids standing up a new backend service just for this write.
8. **PII isolation under public read**: split into two tables rather than one `PUBLIC`-readable table. *Why*: a table-wide `PUBLIC` read rule likely permits querying/enumerating the whole table, not just a single filtered row — a single table would leak every member's `recipient_email` to anonymous requests. Two thin tables closes this without adding meaningful complexity.
9. **Expiry display**: computed live at render time from `expiry_date`, never written as a stored status flip. *Why*: removes an entire write path (and its access-rule problem) for a purely cosmetic state — only actual redemption needs an authoritative write.
10. **Grant idempotency across tier changes**: tracked via a flag in the member's existing Memberstack JSON metadata (`guestPassGrantedPlans: [planId, ...]`), not inferred from "does this member have any rows yet." *Why*: inferring from row existence breaks if a member upgrades to a second eligible tier later — they'd never get that tier's allotment.

## Data Model

Two Memberstack Data Tables:

**`guest_passes`** — `readRule: AUTHENTICATED_OWN`, sender-owned, holds all PII:

| field | type | notes |
|---|---|---|
| `member` | MEMBER_REFERENCE | the sender |
| `token` | TEXT | random, unguessable (`crypto.randomUUID()`) |
| `status` | TEXT | `unclaimed` \| `sent` \| `redeemed` |
| `recipient_email` | TEXT | empty until an email invite claims the row |
| `sent_date` | TEXT (ISO) | set when status → `sent`, or on redemption if claimed via the personal link |
| `expiry_date` | TEXT (ISO) | set at grant time |
| `redeemed_by` | MEMBER_REFERENCE | filled by the Make/Admin-API write on redemption |

**`guest_pass_lookup`** — `readRule: PUBLIC`, no PII, written alongside its `guest_passes` counterpart at grant time and kept in sync only by the Make/Admin-API write on redemption:

| field | type | notes |
|---|---|---|
| `token` | TEXT | matches the `guest_passes` row |
| `expiry_date` | TEXT (ISO) | mirrors the `guest_passes` row |
| `status` | TEXT | mirrors the `guest_passes` row (only meaningful value an anonymous reader needs: has this been redeemed) |

Field-key gotcha (per existing project convention): whatever Name is typed gets locked and lowercased as the key — create both tables by hand in the dashboard and confirm actual keys before writing JS against them.

## Grant Flow

New `js/ms-scripts/guest-pass.js`, loaded the same no-op-if-absent way as other feature scripts. `initGuestPassGrant()` on page load:

1. Read current member + plan.
2. Check plan ID against a `{ [planId]: passCount }` config constant in the file.
3. Check `guestPassGrantedPlans` in member metadata — if this plan's ID isn't in that list, create `passCount` rows in both tables (matching tokens, `status: 'unclaimed'`, `expiry_date` = now + config constant window), then append the plan ID to the metadata list.

Idempotent, cheap, runs every page load.

## Invite UI

`renderGuestPassUI()`, after the grant check:

- **Personal link box**: first `unclaimed` row (oldest `expiry_date` first) → `https://<site>/redeem?token=<token>`. No unclaimed rows left → empty state, box hidden.
- **Email invite box**: claims the same "oldest unclaimed" row (`recipient_email`, `status: 'sent'`, `sent_date: now` written immediately), then submits a parallel native Webflow Form so Make's form-submission trigger sends the actual email. No delivery-confirmation loop back into `status` — accepted risk for v1.
- **Sent-invites table**: clone-a-hidden-template pattern (like Continue Watching), one row per `guest_passes` record that isn't still bare-`unclaimed`. Displays recipient email (or "—"), a derived status badge (`Expired` if past `expiry_date` regardless of stored status, else stored status), and sent date.

## Redeem Page

New Webflow page `/redeem?token=`, new `initGuestPassRedeem()` (no-op if its container is absent):

1. Query `guest_pass_lookup` by token (anonymous, `PUBLIC` read).
2. No match → invalid-link state. Match but past `expiry_date` → expired state (computed live, nothing written). Match and not expired → show the Free-Trial-w/-Credit-Card Memberstack signup form.
3. On signup success → call a Make webhook with `{ token, newMemberId }`. That Make scenario calls Memberstack's Admin REST API (secret key lives only in Make's connection) to update the matching row in **both** tables: `status: 'redeemed'`, and `redeemed_by: newMemberId` in `guest_passes`.

## Edge Cases

- **Race condition**: two tabs claiming the same "oldest unclaimed" row isn't atomically prevented client-side. Accepted as low-likelihood/unresolved for v1 — worst case is a redundant redemption attempt that fails cleanly.
- **Grant double-dip**: solved by Decision #10 (metadata flag per plan, not row-existence check).
- **PII leak under public read**: solved by Decision #8 (two-table split).

## Testing (manual, no test suite — matches project convention)

- Grant: eligible vs. ineligible plan, no duplicate grants on revisit, second-tier upgrade grants correctly.
- Quota exhaustion: both UI elements hit empty state with zero unclaimed rows.
- Email path: `guest_passes` row written immediately regardless of Make's actual delivery; Make scenario itself verified separately via its own run history.
- Redeem page: valid / invalid / expired token states, confirming no DB write happens for the expired case.
- Redemption write: real signup off a valid link, confirmed via the *sender's* table (not just Make's run log) that `status`/`redeemed_by` actually landed.
- PII check: logged-out session querying `guest_pass_lookup` cannot reach any email/member field.

## Open Items Before Implementation

- Exact pass count per tier, and which tier(s) qualify.
- Sanity-check `PUBLIC` read on `guest_pass_lookup` actually returns data logged-out (functional check only — not a privacy blocker, since that table holds no PII by design, so full-table exposure there is harmless either way).

## Setup Checklist (manual — outside this repo's code)

I have Webflow API access (can build page/element structure myself on request) and Memberstack dashboard read access is limited to what Webflow's MCP surfaces — table creation and Admin API keys are dashboard-only. I have no Make access at all. Order matters: Memberstack tables → plan IDs → Webflow elements → Make scenarios, since each step needs an output from the one before it.

### 1. Memberstack dashboard

1. Plans → open each eligible tier → copy its **Plan ID**. Also copy the ID of the "Free Trial w/ Credit Card" plan used on the redeem page.
2. Data Tables → create **`guest_passes`**:
   - Fields: `member` (Member Reference), `token` (Text), `status` (Text), `recipient_email` (Text), `sent_date` (Text), `expiry_date` (Text), `redeemed_by` (Member Reference).
   - Access rules: Create = Authenticated, Read = Authenticated + Own records only, Update = Authenticated + Own records only, Delete = Admin only.
   - After saving, open the Fields panel and note the **actual lowercased keys** — needed verbatim for the JS.
3. Data Tables → create **`guest_pass_lookup`**:
   - Fields: `token` (Text), `status` (Text), `expiry_date` (Text).
   - Access rules: Create = Authenticated, Read = Public, Update = Admin only, Delete = Admin only.
   - Note field keys, same as above.
4. Settings → Developer/API → copy the **Admin API secret key**. Paste it only into Make's connection in step 3 below — never into this repo, never shared over chat/email.
5. Send me: the two Plan IDs, and the confirmed field keys for both tables.

### 2. Webflow (tell me if you want me to build this via the API instead of doing it by hand)

1. Referral page (wherever this UI lives — confirm the page/slug): add
   - personal-link `input` + copy button
   - an email-invite input + submit button
   - a **separate, native Webflow Form** wrapping just the email field + a hidden field for the redeem link — this is the one Make watches, kept apart from the JS-driven invite box above.
   - a hidden template row for the sent-invites table (same pattern as the existing "Continue Watching" component — one Designer-built row, cloned by JS).
2. New page **`/redeem`**: a container for the signup/error states, wired to the "Free Trial w/ Credit Card" plan.
3. **Publish** the site after adding these — draft changes aren't live otherwise.
4. Send me the page slugs and confirm element structure once built, so the JS's selectors match.

### 3. Make

**Scenario A — invite email send**
1. Trigger: Webflow → "Watch Form Submissions", pointed at the hidden form from Webflow step 1.
2. Action: your email tool of choice → send to the submitted recipient email, body includes the submitted redeem link.
3. Turn the scenario on.

**Scenario B — redemption write**
1. Trigger: Webhooks → "Custom webhook" — generates a URL. Send me this URL, the redeem page's JS needs to POST `{ token, newMemberId }` to it after a successful signup.
2. Add a Memberstack connection using the Admin API secret key from Memberstack step 4.
3. Action 1: Memberstack Admin API → update the `guest_pass_lookup` record matching `token` → set `status: redeemed`.
4. Action 2: Memberstack Admin API → update the `guest_passes` record matching `token` → set `status: redeemed`, `redeemed_by: newMemberId`.
5. Turn the scenario on.

### What I need back from you before the JS can be finished

- Two Plan IDs (eligible tier(s) + trial plan) and pass count per tier.
- Both tables' actual field keys.
- Confirmed page slugs/element structure (or the go-ahead for me to build them via the Webflow API).
- Scenario B's webhook URL.
