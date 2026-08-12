// Guest Pass referral feature. Two Memberstack Data Tables — create both by hand in the
// dashboard first, Data Tables aren't reachable from the client API used here. Full design +
// setup checklist: docs/guest-pass-design.md.
//
//   guest_passes      sender-owned, holds PII. Fields: member (MEMBER_REFERENCE) token (TEXT)
//                      status (TEXT) recipient_email (TEXT) sent_date (TEXT) expiry_date (TEXT)
//                      redeemed_by (MEMBER_REFERENCE)
//                      Access: create AUTHENTICATED, read/update AUTHENTICATED_OWN, delete ADMIN
//   guest_pass_lookup  no PII, public read. Fields: token (TEXT) status (TEXT) expiry_date (TEXT)
//                      Access: create AUTHENTICATED, read PUBLIC, update/delete ADMIN_ONLY
//
// Memberstack lowercases a field's Key regardless of the Name typed at creation (same gotcha
// documented in video-progress.js) — confirm actual keys in the dashboard before relying on the
// ones used below.

import {
    GUEST_PASS_INVITE_WEBHOOK_URL,
    GUEST_PASS_REDEMPTION_WEBHOOK_URL,
    GUEST_PASS_REDEMPTION_WEBHOOK_API_KEY,
    GUEST_PASS_ELIGIBLE_PLANS,
} from './memberstack-config.js';

const PASSES_TABLE = 'guest_passes';
const LOOKUP_TABLE = 'guest_pass_lookup';
const PAGE_SIZE = 100;
const PASS_EXPIRY_DAYS = 365; // one-time grant, no refill
const REDEEM_PATH = '/redeem-trial'; // the original /redeem was renamed to /redeem-gift (Gift flow)

// Make Scenario B ("guest-pass-redemption") — updates status: redeemed in both tables via the
// Memberstack Admin API. See docs/guest-pass-design.md Decision #7 for why this can't be a
// direct client-side write.
const REDEMPTION_WEBHOOK_URL = GUEST_PASS_REDEMPTION_WEBHOOK_URL;
const REDEMPTION_WEBHOOK_API_KEY = GUEST_PASS_REDEMPTION_WEBHOOK_API_KEY;

// Make Scenario A (email send). The original design routed this through a hidden native Webflow
// form + Make's "Watch Events" trigger, but Webflow's own form JS marks any form inside a
// display:none container as permanently non-interactive (w-form-loading) at page load, before any
// submission is ever attempted — confirmed live, zero executions ever reached Make regardless of
// how the submit was triggered (click, requestSubmit, dispatched event). Calling a custom webhook
// directly, same pattern as REDEMPTION_WEBHOOK_URL above, sidesteps Webflow's form system entirely.
const INVITE_WEBHOOK_URL = GUEST_PASS_INVITE_WEBHOOK_URL;

// Same pass count for every eligible tier (client confirmed) — kept as a map, not a bare number,
// in case that ever changes to per-tier counts. IDs live in memberstack-config.js.
const ELIGIBLE_PLANS = GUEST_PASS_ELIGIBLE_PLANS;

function generateToken() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();

    // Fallback for browsers without randomUUID but with getRandomValues (broader support than
    // randomUUID alone) — still cryptographically secure, unlike Math.random().
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function isoDaysFromNow(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
}

// Mirrors the waitForMemberstackReady() guard in video-progress.js.
function waitForMemberstackReady() {
    return new Promise((resolve) => {
        if (window.$memberstackDom && window.$memberstackReady) {
            resolve();
        } else {
            document.addEventListener('memberstack.ready', resolve, { once: true });
            setTimeout(resolve, 2000);
        }
    });
}

async function getMember(ms) {
    await waitForMemberstackReady();
    const res = await ms.getCurrentMember();
    return res && res.data ? res.data : null;
}

// Client API uses flat query (where/take/skip), not findMany — mirrors favorites.js/video-progress.js.
async function fetchAllRecords(ms, table, memberId) {
    const all = [];
    let skip = 0;
    let records;
    do {
        const page = await ms.queryDataRecords({
            table,
            query: { where: { member: { equals: memberId } }, take: PAGE_SIZE, skip },
        });
        records = page.data?.records || [];
        all.push(...records);
        skip += records.length;
    } while (records.length === PAGE_SIZE);
    return all;
}

// NOT YET VERIFIED against a live member payload — Memberstack's DOM package member object is
// expected to carry planConnections: [{ planId, status, ... }] with status values like "ACTIVE",
// but this hasn't been confirmed live yet. Check on first real test (per this project's
// verify-live testing convention — no test suite).
function activeEligiblePlanId(member) {
    const connections = member.planConnections || [];
    const active = connections.find((c) => c.status === 'ACTIVE' && ELIGIBLE_PLANS[c.planId]);
    return active ? active.planId : null;
}

// One-time grant, tracked in the member's JSON metadata (not inferred from row existence) so
// upgrading between eligible tiers later still grants that tier's own allotment — see Decision
// #10 in docs/guest-pass-design.md. getMemberJSON/updateMemberJSON are Memberstack's
// free-form-metadata calls (distinct from Custom Fields) — also not yet verified live.
async function ensureGrant(ms, member, planId) {
    const { data: json } = await ms.getMemberJSON();
    const granted = (json && json.guestPassGrantedPlans) || [];
    if (granted.includes(planId)) return;

    const count = ELIGIBLE_PLANS[planId];
    const expiryDate = isoDaysFromNow(PASS_EXPIRY_DAYS);

    for (let i = 0; i < count; i++) {
        const token = generateToken();
        await ms.createDataRecord({
            table: PASSES_TABLE,
            data: {
                member: member.id,
                token,
                status: 'unclaimed',
                recipient_email: '',
                sent_date: '',
                expiry_date: expiryDate,
                redeemed_by: '',
            },
        });
        await ms.createDataRecord({
            table: LOOKUP_TABLE,
            data: { token, status: 'unclaimed', expiry_date: expiryDate },
        });
    }

    await ms.updateMemberJSON({ json: { ...json, guestPassGrantedPlans: [...granted, planId] } });
}

// Expiry is computed live, never written as a stored status flip — see Decision #9.
function deriveDisplayStatus(record) {
    if (new Date(record.data.expiry_date) < new Date()) return 'expired';
    return record.data.status;
}

function renderPersonalLink(unclaimed) {
    const input = document.querySelector('[data-guestpass-link]');
    const box = document.querySelector('[data-guestpass-link-box]');
    const copyBtn = document.querySelector('[data-guestpass-copy]');
    const empty = document.querySelector('[data-guestpass-empty]');
    if (!input) return;

    if (!unclaimed) {
        if (box) box.style.display = 'none';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (box) box.style.display = '';
    if (empty) empty.style.display = 'none';
    input.value = `${window.location.origin}${REDEEM_PATH}?token=${unclaimed.data.token}`;

    if (copyBtn && !copyBtn._guestpassWired) {
        copyBtn._guestpassWired = true;
        copyBtn.addEventListener('click', () => navigator.clipboard.writeText(input.value));
    }
}

// Clone-a-hidden-template pattern, same as the Continue Watching component — [data-guestpass-row-template]
// must be a real Designer-built row, hidden via a display:none class (never Webflow's native
// visibility toggle, which strips the element from published HTML — see video-progress.js's note).
function renderTable(records) {
    const table = document.querySelector('[data-guestpass-table]');
    const template = table?.querySelector('[data-guestpass-row-template]');
    if (!table || !template) return;

    table.querySelectorAll('[data-guestpass-row-clone]').forEach((el) => el.remove());

    records
        .filter((r) => r.data.recipient_email || r.data.status !== 'unclaimed')
        .sort((a, b) => new Date(b.data.sent_date || 0) - new Date(a.data.sent_date || 0))
        .forEach((r) => {
            const row = template.cloneNode(true);
            row.removeAttribute('data-guestpass-row-template');
            row.setAttribute('data-guestpass-row-clone', '');
            row.classList.remove('guestpass-row-template-hidden');

            const email = row.querySelector('[data-guestpass-row-email]');
            if (email) email.textContent = r.data.recipient_email || '—';

            const status = row.querySelector('[data-guestpass-row-status]');
            if (status) status.textContent = deriveDisplayStatus(r);

            const date = row.querySelector('[data-guestpass-row-date]');
            if (date) date.textContent = r.data.sent_date ? new Date(r.data.sent_date).toLocaleDateString() : '—';

            table.appendChild(row);
        });
}

// token is included so Make can look up the guest_passes record itself and send using ITS OWN
// stored recipient_email/token — never trusting recipientEmail/link directly from this payload.
// Without that check, this webhook would be an open, unauthenticated relay: anyone who reads this
// public JS could extract the URL and email arbitrary content to arbitrary addresses using this
// site's Gmail identity. The Make side still needs a lookup+verify step mirroring
// guest-pass-redemption's pattern before this is safe to leave running unattended.
async function postInvite(token, recipientEmail, link) {
    try {
        await fetch(INVITE_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, recipientEmail, link }),
        });
    } catch (e) {
        console.error('guest pass invite webhook failed', e);
    }
}

function wireEmailInvite(ms, getUnclaimed, onClaimed) {
    const form = document.querySelector('[data-guestpass-email-form]');
    const emailInput = document.querySelector('[data-guestpass-email-input]');
    // The visible form is real .w-form markup, and Webflow's own site-wide JS already listens
    // for its 'submit' event to run its own AJAX handling — that listener can stop the event
    // from ever bubbling up to a listener on an ancestor wrapper (which is what
    // data-guestpass-email-form actually resolves to, since it's on both the wrapper and the
    // <form> tag and querySelector returns the first match in document order). Binding to the
    // submit button's 'click' instead sidesteps Webflow's submit handling entirely — this form
    // was never meant to actually submit anywhere.
    const submitBtn = form && form.querySelector('input[type="submit"], button[type="submit"]');
    if (!form || !emailInput || !submitBtn) return;

    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const unclaimed = getUnclaimed();
        if (!unclaimed) return;

        const recipientEmail = emailInput.value.trim();
        if (!recipientEmail) return;

        const sentDate = new Date().toISOString();
        const link = `${window.location.origin}${REDEEM_PATH}?token=${unclaimed.data.token}`;

        // Row is written regardless of whether the Make send below actually succeeds — no
        // delivery-confirmation loop back into status for v1, per docs/guest-pass-design.md.
        await ms.updateDataRecord({
            recordId: unclaimed.id,
            data: { ...unclaimed.data, recipient_email: recipientEmail, status: 'sent', sent_date: sentDate },
        });

        // Custom webhook + direct fetch, same pattern as postRedemption() — see the
        // INVITE_WEBHOOK_URL comment for why this replaced the hidden-Webflow-form approach.
        postInvite(unclaimed.data.token, recipientEmail, link);

        emailInput.value = '';
        onClaimed();
    });
}

// ON THE REFERRAL PAGE: grant check, personal link, email invite, sent-invites table.
export async function guestPass() {
    const hasUI = document.querySelector('[data-guestpass-link], [data-guestpass-email-form], [data-guestpass-table]');
    if (!hasUI) return;

    const ms = window.$memberstackDom;
    const member = await getMember(ms);
    if (!member) return;

    const planId = activeEligiblePlanId(member);
    if (planId) await ensureGrant(ms, member, planId);

    async function refresh() {
        const records = await fetchAllRecords(ms, PASSES_TABLE, member.id);
        const unclaimed = records
            .filter((r) => r.data.status === 'unclaimed' && new Date(r.data.expiry_date) >= new Date())
            .sort((a, b) => new Date(a.data.expiry_date) - new Date(b.data.expiry_date))[0] || null;

        renderPersonalLink(unclaimed);
        renderTable(records);
        return unclaimed;
    }

    let currentUnclaimed = await refresh();
    wireEmailInvite(ms, () => currentUnclaimed, async () => { currentUnclaimed = await refresh(); });

    console.log('Loading guestPass()');
}

async function postRedemption(token, newMemberId) {
    try {
        await fetch(REDEMPTION_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-make-apikey': REDEMPTION_WEBHOOK_API_KEY },
            body: JSON.stringify({ token, newMemberId }),
        });
    } catch (e) {
        console.error('guest pass redemption webhook failed', e);
    }
}

// Fires onSuccess exactly once, only on a logged-out -> logged-in transition that happens on this
// same page load — i.e. the visitor actually signing up right here, not someone who just happens
// to already be logged in when they open the link (that case is left unhandled on purpose: an
// existing member opening someone else's invite isn't the intended redemption flow). onAuthChange
// existing/firing this way on the Memberstack DOM SDK is NOT yet verified live.
async function watchForSignupSuccess(ms, onSuccess) {
    const alreadyLoggedIn = await getMember(ms);
    if (alreadyLoggedIn) return;

    let fired = false;
    ms.onAuthChange((member) => {
        if (member && !fired) { fired = true; onSuccess(member.id); }
    });
}

// ON /redeem PAGE — token validity + expiry check (anonymous read against guest_pass_lookup,
// PUBLIC read rule, no PII — Decision #8), then on signup success posts { token, newMemberId } to
// Make's redemption webhook, which performs the actual status: redeemed write via the Memberstack
// Admin API in both tables (client SDK can't do that write itself — Decision #7). The signup form
// itself (Trial plan, pln_trial-lbl30i8w — already configured with a 14-day card-required trial)
// still needs to exist on this page in Webflow; this only reacts to it, doesn't render it.
export async function guestPassRedeem() {
    const container = document.querySelector('[data-guestpass-redeem]');
    if (!container) return;

    const token = new URLSearchParams(window.location.search).get('token');
    const invalidState = container.querySelector('[data-guestpass-invalid]');
    const expiredState = container.querySelector('[data-guestpass-expired]');
    const validState = container.querySelector('[data-guestpass-valid]');
    [invalidState, expiredState, validState].forEach((el) => { if (el) el.style.display = 'none'; });

    if (!token) { if (invalidState) invalidState.style.display = 'block'; return; }

    const ms = window.$memberstackDom;
    const page = await ms.queryDataRecords({
        table: LOOKUP_TABLE,
        query: { where: { token: { equals: token } }, take: 1 },
    });
    const record = page.data?.records?.[0];

    if (!record) { if (invalidState) invalidState.style.display = 'block'; return; }
    if (new Date(record.data.expiry_date) < new Date()) { if (expiredState) expiredState.style.display = 'block'; return; }
    if (validState) validState.style.display = 'block';

    watchForSignupSuccess(ms, (newMemberId) => postRedemption(token, newMemberId));

    console.log('Loading guestPassRedeem()');
}
