// Memberstack/Make identifiers that change whenever this project's Webflow site or Memberstack
// app gets duplicated or transferred (e.g. a client workspace handoff) — collected here so
// there's one place to update instead of hunting through each ms-scripts file.
//
// Price IDs (prc_...) live as data-price-id/data-ms-price:* attributes on Webflow Designer
// elements (Plans, Gift/Purchase, Redeem Trial pages), not here — there's no code path that
// reads them, so they're not duplicated in this file. Only plan IDs (pln_...) that a script
// actually branches on belong here.

// Make.com webhook URLs (guest pass feature) — from each scenario's Webhooks module.
export const GUEST_PASS_INVITE_WEBHOOK_URL = 'https://hook.us2.make.com/wn5rubicev15olao95oafw1as8gsfjt5';
export const GUEST_PASS_REDEMPTION_WEBHOOK_URL = 'https://hook.us2.make.com/erkkgyqrkeiypaey23xapym895khmdp6';

// Required by the redemption scenario's Webhooks module (API Key authentication) — a secret this
// project invented, not issued by Webflow/Memberstack. Shipped in this public, CDN-served file,
// so it's not a real security boundary — anyone can read it out of the source. It only blocks
// casual/bot hits on the raw webhook URL; the actual protection is the server-side token
// lookup+verify already in the Make scenario. The invite-email webhook has no key configured.
export const GUEST_PASS_REDEMPTION_WEBHOOK_API_KEY = '37b77c71fdfa194ae55d85542871e2702061c99e8008e3388626f144445b1c69';

// Memberstack plan IDs eligible for guest passes, mapped to how many passes each grants. Value is
// a count, not a bare flag, in case per-tier counts ever differ (currently they don't — client
// confirmed the same count for every eligible tier).
export const GUEST_PASS_ELIGIBLE_PLANS = {
    'pln_plan-monthly-2c4l0n4j': 3,
    'pln_plan-quarterly-ell10i4j': 3,
    'pln_plan-annually-684o0nxj': 3,
};

// Not read by any code path — the Trial plan's price ID is set directly on the Redeem Trial
// page's signup button in Webflow, and Memberstack resolves the plan from that price
// automatically. Kept here purely as a reference so it's found/updated alongside everything else.
export const TRIAL_PLAN_ID = 'pln_trial-lbl30i8w';
