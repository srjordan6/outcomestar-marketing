# outcomestar.app / FOCMS — Changelog

Reverse-chronological. Companion records live in Postgres `archive_entries`
(query by `source_id`); this file is the human-readable index.

---

## 2026-07-19 (late) — Four live signup failures fixed (backend v0.11.19)

Operator ran a real paid signup and hit four failures. All root-caused from
source, fixed, deployed, and verified the same session. Archive:
`signup_four_failures_fixed_v0_11_19`.

1. **No verification email — ever.** `_send_verification_email` and
   `_send_reset_email` referenced an undefined `html` variable →
   `NameError` on every call, silently swallowed by the non-fatal wrappers.
   Since their introduction, no verification or password-reset email was
   ever sent. Both now build branded HTML bodies.
2. **Paid but never reached the portal.** Provisioning is webhook-only and
   the token went only into the welcome email; Stripe returned the payer to
   a static page. Now: `success_url` carries `sid={CHECKOUT_SESSION_ID}`,
   and new anonymous `POST /auth/claim-signup` (single-use via
   `pending_signups.claimed_at`, 30-min window, `pending` while the webhook
   runs) mints a fresh portal token. signup.html polls it and lands the
   parent authenticated — the setup wizard finally opens after payment.
3. **False age accepted.** Birth certificate was only required ≤10; ages
   11–17 were self-attested while driving pricing, COPPA handling, and
   student access. Now required for **all minors under 18** (backend gate +
   signup page block/copy). The $3 automated-review charge stays 0–10 only.
4. **Lied-age case now durable.** A failed AI cert check writes
   `tenant_settings.feature_flags.age_verification = {status: failed,
   dob_on_document, dob_entered, reasons}` — queryable, not email-only;
   cleared by a passing re-upload through the portal.

Remaining: one real end-to-end paid signup test (email delivery + wizard).

### v0.11.19a — the 500 behind it all (same session)

The operator's paid signup had actually returned HTTP 500 on every Stripe
webhook delivery: `student_identity_documents`' RLS policy was the only one
in the provisioning chain without the platform (`current_tenant_id() IS
NULL`) allowance, so any signup carrying a birth certificate poisoned the
transaction and rolled back all provisioning. Policy fixed live via MCP —
Stripe Resend returned 200, the account provisioned fully
(`comet-delta-2a5771`), and the welcome + verification emails **arrived**,
proving the email fix end-to-end. v0.11.19a also wraps the webhook's three
`tenant_settings` writes in `SET LOCAL` tenant context (table owned by
`focms_user`; same policy gap, unfixable via MCP) and removes the raw portal
token from the welcome email — sign-in with password covers all paths.
Archive: `webhook_500_rls_root_cause_v0_11_19a`.

### v0.11.20 + portal v282 — the two hard gates (operator decisions, same night)

**Gate 1 — birth certificate verifies BEFORE checkout** (backend v0.11.20):
the document must pass automated verification (is a certificate, name
matches, birth date matches, registrar seal, no tamper signs, high
confidence) before the Stripe session is created. Failing document → 400
with parent-facing reasons, nothing charged; checker unavailable → 503
fail-closed. Passing verdicts are parked; the webhook stores the document
`verified` with the 10-year tenant flag; the post-provision AI check is a
legacy fallback only. Requires a vision/LLM API key on Render — without
one, all under-18 signups 503.

**Gate 2 — both emails verify before the portal opens** (backend v0.11.20 +
portal v282): student email required at signup from age 13 (COPPA boundary;
younger children are covered by the parent verification). New
`GET auth/email-verification-status`; the portal shows a blocking overlay
listing every address with live status and per-address Resend, fail-open on
endpoint errors, and only fires the onboarding wizard once every address is
confirmed.

---

## 2026-07-19 — Six-org parity, age-tiered access, live billing, security hardening

Single working session. Portal v259→v281, backend v0.12.150→v0.12.158,
five new tables, first live payment rail, and a full-stack security audit.

### Youth-organization parity (portal v259–v274, backend v0.12.150–v0.12.153)

Brought five organizations to the same depth as the existing Sea Cadets build:
**Scouting America (BSA)**, **Girl Scouts (GSA)**, **Civil Air Patrol**,
**JROTC** (all six branches), and **Young Marines**.

- New platform reference table `org_rank_catalog` (bsa 7, usnscc 7, gsa 6,
  cap 14, ym 12) plus `cadet_training_catalog` seeds; public catalog endpoints
  `GET /catalogs/org-ranks` and `/catalogs/org-trainings` (bsa serves 147:
  6 activities + 141 merit badges).
- `POST /student/{id}/affiliations/{id}/org-profile` — whitelisted detail keys
  merged into `affiliations.details` jsonb (bsa 15, gsa 11, cap 6, jrotc 9,
  ym 11). Existing GET already returned `details`, so no model changes.
- Portal cards per org: unit structure, Rank Badges & Awards, Training &
  Service Hours log (Training vs Service Project), Camping (nights, miles,
  service hours), Leadership Positions with tenure hints for Star/Life/Eagle.
- Reference data scraped and verified: **236 BSA councils** in 52 state groups,
  **112 GSUSA councils**, 16 Council Service Territories, 52 CAP wings,
  64 JROTC ranks, two 100-skill pools (BSA operator-supplied, GSA composed
  from GSUSA pillars).
- 6 Scouting meta-skills seeded (internal-only, never shown to parents).

**Annual maintenance:** re-sync merit badges and both council lists each January.
**Open:** Young Marines division labels are approximate — verify at youngmarines.org.

### Session security (portal v275)

30-minute inactivity timeout. Passive listeners refresh the clock; a 60-second
sweep clears the session and returns to login with an explanatory toast.
Boundary exact at 29:59 / 30:00. Complements the existing session-scoped token.

### Age-tiered student access (backend v0.12.154)

**Amends the standing no-student-login rule.** Policy stored as data in
`portal_access_policy`, computed per request from birth date so birthdays flip
access with no cron:

| Age | Tier | Rights |
|---|---|---|
| <10 | none | Parent-operated only |
| 10–12 | supervised | Login, view, create/edit **own** records only. Parent records immutable. COPPA: no publishing, visibility control, sharing or messaging; writes flagged for parent review |
| 13–17 | standard | COPPA lifts — adds sharing + messaging; publish/visibility become proposals the parent approves. **Parent records still immutable** |
| 18+ | owner | Full control. Parent access becomes a **revocable consent** (`student_access_consents`) |

The never-override guarantee is enforced by ownership (`created_by`), not UI.
`GET /student/{id}/access-tier` returns tier, rights matrix and parent-access
state. **Remaining:** the student login itself — a coordinated session on the
shared auth file; enforcement spec archived.

### Billing rail — live (backend v0.12.155–v0.12.157, portal v276–v280)

The product previously had **no payment capability**: signup copy promised
Stripe with nothing behind it, and `resume_ai_charges` was Stripe-shaped but
never written to.

- **Tables:** `billing_plans` (10 plans at confirmed pricing), `subscriptions`
  (tenant entitlement), `billing_events` (webhook idempotency).
- **Stripe client:** stdlib only (urllib in a thread) — zero new dependencies.
- **Webhook:** HMAC-SHA256 signature verification (t/v1, 300s tolerance,
  `compare_digest`), idempotent insert-first, handles checkout completion and
  subscription updated/deleted.
- **Products provisioned:** 9 Stripe products/prices, IDs written to
  `billing_plans`.
- **Storage quotas connected (v0.12.156):** upload enforcement existed since
  v0.9.0 but nothing wrote entitlements into the tenant quota. Now the webhook
  recomputes `base plan + add-ons` on every subscription change. Verified live
  at exactly 101 GiB (1 GB base + 100 GB Archive add-on).
- **Card management before purchase (v0.12.157):** `_get_or_create_stripe_customer`
  creates the Stripe customer on demand; `portal-session-v2` opens Stripe's
  billing portal even with zero purchases, and checkout attaches the same
  customer so a saved card is reused. Proven live.
- **One surface (v279–v280):** a *second*, pre-existing billing page was
  discovered mid-session (parallel line: `auth/pricing`, `auth/billing-session`)
  whose pricing **contradicted** the canonical sheet ($13/yr vs $11.99). It now
  delegates to the canonical page; its endpoints remain live but unlinked.

**Pricing:** K–5 free (1 GB) · grades 6–8 $119.99 · grades 9–11 $249.99 ·
grade 12 $399 · post-12 $11.99 (all annual) · storage add-ons $29/10 GB,
$79/50 GB, $149/100 GB · age verification $3 · AI resume $1 (one-time).

**Untested hop:** Stripe event delivery → webhook. Self-proves on the first
real payment (`billing_events` + `subscriptions` rows appear).

### Security audit and remediation (backend v0.12.158, `public/_headers`)

Full-stack audit: client, backend, database, infrastructure.

**One real vulnerability, fixed:** `subscriptions`, `student_access_consents`
and `billing_events` had **no row-level security**. Since the app role cannot
bypass RLS, any endpoint missing its `WHERE tenant_id=` would have leaked
across tenants. Policies added, matching the proven `students`/`tenants` pattern.

**Hardening shipped:**
- `public/_headers` — HSTS, full CSP, **X-Frame-Options DENY** (closes
  clickjacking), nosniff, Referrer-Policy, Permissions-Policy, COOP. The CSP
  allowlist was built from an actual inventory of every external origin the
  site loads. Confirmed: Cloudflare Workers honors `public/_headers`.
- `resume_kind` / `plan_code` bounded and whitelisted.
- Webhook PII retention cut: a curated 16-field audit record replaces the full
  Stripe event (which carries email, address, card metadata).
- Per-tenant rate limiting (10 per 5 min) on the two endpoints that create
  Stripe objects. Verified live: `200 ×10, then 429`.

**Verified not vulnerable:** IDOR (token-scoped `_pp_context` + RLS), SQL
injection (all queries parameterized; UUID-validated before any interpolation),
XSS (user fields escaped; flagged interpolations are hardcoded catalog
constants), CORS (explicit allowlist, hostile origins not reflected), token
handling (URL-hash handoff stripped immediately, sessionStorage + idle timeout),
error verbosity, and static-host exposure.

**Caught pre-ship:** `field_validator` was missing from the pydantic import —
would have crashed the API at startup.

**Residual (documented, not blocking):** HSTS `preload` not submitted; CSP
requires `unsafe-inline` until inline `onclick` handlers are refactored;
localhost origins remain in the parallel line's CORS allowlist.

### Data cleanup

Removed the `srjconsvcs@gmail.com` test signup (user, credentials, email
verification, "Test Jordan" student, tenant role). Its tenant could not be hard
deleted — RLS has no DELETE policy on `tenants` by design — so it was tombstoned
with the email scrubbed. Residue: Stripe customer `cus_UtOHL2MhzusQV2` may be
deleted in the Stripe dashboard.

---

## Conventions

- **Portal releases:** bump `?v=N` in `portal.html` on every `portal.js` change;
  the deployed file is byte-identical to `public/portal.js`.
- **Backend releases:** append the version entry to the `focms_form_schemas.py`
  header changelog; verify deploy by polling until the new route returns 401
  instead of 404.
- **Every proven change** is archived to Postgres `archive_entries` in the same
  session.
