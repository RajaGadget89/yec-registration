# YEC Day Project Roadmap — Revised (Statuses, Deadlines, Bilingual Comms)
**Version:** v2025-08-13  
**Owner:** Product & Eng (YEC Day)  
**Scope:** Incorporates new status taxonomy (with subreasons), admin-set deadlines, auto-reject rules, early-bird pricing, and bilingual email communications.  
**Timezone Policy:** Display times in Asia/Bangkok; persist in UTC.

---

## 0) Decision & Guiding Principles
- Build **Workflow (#2) first**, with a narrow but complete vertical slice that covers: new registration → review → decisions → user update loop → approval with badge.  
- Keep current Magic Link for admin access during early phases; upgrade to RBAC after the workflow is stable.  
- Use **event-driven, auditable** transitions; every meaningful state change must be logged.

---

## 1) Status Model (Authoritative)
### 1.1 Registration.status (enum)
- `waiting_for_review` — waiting for admin review.
- `awaiting_user_update` — waiting for the applicant to update something (see `update_reason` below).
- `approved` — the attendee is approved for the event (badge is issued).
- `rejected` — the registration is rejected due to ineligibility, missed deadline, or explicit admin decision.

> **Note:** We intentionally **avoid the ambiguous word “Pending.”** Use `awaiting_user_update` + `update_reason` for clarity.

### 1.2 Registration.update_reason (enum, nullable)
Used only when `status = 'awaiting_user_update'`:
- `payment` — applicant must re-upload / correct the payment slip.
- `info` — applicant must correct profile info (name, image, etc.).
- `tcc` — applicant must re-upload/replace an invalid or expired TCC card.

### 1.3 Admin Review Checklist (3-track gating)
Each registration must pass **all three** checks to become `approved`. Store per-track fields:
- `payment_review_status` enum: `pending` | `needs_update` | `approved` | `rejected`
- `profile_review_status` enum: `pending` | `needs_update` | `approved` | `rejected`
- `tcc_review_status` enum: `pending` | `needs_update` | `approved` | `rejected`

**Transition rule (trigger or server logic):**  
When all three review statuses become `approved`, set `registration.status = 'approved'` (and emit event).  
When any becomes `needs_update`, set `registration.status = 'awaiting_user_update'` and set `update_reason` accordingly.  
When any becomes `rejected`, set `registration.status = 'rejected'` with a `rejected_reason` and emit event.

### 1.4 Rationale
- Separates **global status** (what the applicant sees) from **per-criterion review** (what admins do).  
- Enables clear UI filters and deterministic automation (e.g., auto-approve when all tracks are green).

---

## 2) Event Settings (Admin-Configurable)
A single-row `event_settings` table (or JSON config) with the following fields:
- `registration_deadline_utc` (timestamp): after this, new submissions are blocked; in-progress drafts auto-reject on sweep.
- `early_bird_deadline_utc` (timestamp): determines pricing tier at submission time.
- `price_packages` (JSONB): array of 4 packages, each with `{code, name, currency, early_bird_amount, regular_amount}`.
- `eligibility_rules` (JSONB, optional): e.g., `{blocked_emails:[], blocked_domains:[], blocked_keywords:[]}`.
- `timezone` (text): defaults to "Asia/Bangkok" for display purposes only.

**Admin UI:** a simple “Event Settings” page with date pickers (Bangkok local time), price editors, and a preview panel for computed prices.

---

## 3) Pricing & Validation (v1)
- On **registration submit**, compute `price_applied` from (`event_settings`, selected package, `now_utc` vs `early_bird_deadline_utc`).  
- Persist `price_applied` to the `registrations` row.
- **Manual payment flow (Phase 1):** Admin checks that slip amount equals `price_applied`. If mismatch → `needs_update` on `payment_review_status` and set `awaiting_user_update (payment)`.
- Future: OCR reconciliation to automate slip amount extraction (out of scope for Phase 1).

---

## 4) Auto-Reject Rules
Triggered by a nightly scheduled job (or on-demand admin action):
- **Missed Deadline:** Any registration not fully approved by `registration_deadline_utc` becomes `rejected` with reason `deadline_missed`.
- **Ineligibility:** If an applicant matches any `eligibility_rules` → set `rejected` with reason `ineligible_rule_match`.
- **Stale Draft (optional, future):** Drafts stuck in `awaiting_user_update` for N days can be auto-rejected (configurable).

On auto-reject, send a bilingual email explaining the reason and next steps (if any).

---

## 5) Email Communications (Bilingual, Branded)
**Theme:** Use brand variables from `CONTEXT_ENGINEERING_ANCHOR.md` (e.g., `--brand-primary`, `--brand-accent`).  
**Languages:** Thai + English in all system emails.  
**Templates (IDs to be configured in ENV):**
1) **Registration Received / Tracking Code**  
2) **Request Update — Payment**  
3) **Request Update — Profile Info**  
4) **Request Update — TCC Card**  
5) **Approval & Badge** (with badge attachment/link)  
6) **Rejection** (deadline/ineligibility)

**Content Guidelines:**  
- Subject starts with `[YEC Day]` (EN) / `[YEC Day]` (TH).  
- Header with event logo/color bar.  
- Clear action button; deep-link tokens are single-use and time-limited.  
- Footer includes help contact / reply-to.

---

## 6) Phase Plan (Execution)
### Phase 0 (Complete): Ground truth & guardrails
- Magic Link guards for `/admin/**`.
- Buckets exist (`profile-images`, `chamber-cards`, `payment-slips`, `yec-badges`).
- Audit logging ready.

### Phase 1: Core Workflow + Pricing & Settings (Vertical Slice)
**Goal:** Deliver an end-to-end path covering new registration, review, updates, approval, and price application.

**Scope:**
- Implement `event_settings` model + Admin Settings UI (registration & early-bird deadlines, package prices).
- Compute and persist `price_applied` on submission.
- Registration flow (form → preview → PDPA → submit), file uploads to 3 buckets.
- Admin Waiting Review list + Review page with 3-track checklist (payment/profile/tcc).
- Decision actions → updates to global status + per-track status + reason.
- Bilingual emails for #1–#5 above.
- User update loop via secure deep-links; lock edits when status is `waiting_for_review` or beyond.

**DoD:**
- Creation of settings row + guards; `price_applied` persists and is visible in Admin UI.
- All four decisions update DB + send correct bilingual email + audit events written.
- Auto-approve when all tracks approved.
- E2E tests for: (happy path) new reg → approve → badge + (update loop) needs_update → user edits → approve.

### Phase 2: Automation & Auto-Reject
**Scope:**
- Nightly job (pg_cron or Supabase Scheduled Function) to enforce auto-reject logic.
- Rejection email (#6) with bilingual copy and clear explanation (deadline/ineligible).
- Admin UI: manual “Run Sweep Now” button.

**DoD:**
- Jobs visible in logs; test run changes statuses correctly and sends emails.
- Dashboard tile: counts by status; list of rejections with reasons.

### Phase 3: Auth Upgrade (RBAC) & Ops
**Scope:**
- Supabase Auth roles: `admin`, `super_admin`; onboarding flow.
- RLS policies harden admin endpoints; middleware for `/admin/**` by role.
- Export CSV; basic analytics; improved audit reporting.

**DoD:**
- Role-gated pages & APIs; green test suite.

---

## 7) Data Model Changes (SQL Sketch)
> Execute these in Supabase SQL editor (adjust schema name if needed).

```sql
-- 7.1 Event settings (single-row)
create table if not exists event_settings (
  id uuid primary key default gen_random_uuid(),
  registration_deadline_utc timestamptz not null,
  early_bird_deadline_utc timestamptz not null,
  price_packages jsonb not null,
  eligibility_rules jsonb,
  timezone text not null default 'Asia/Bangkok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_event_settings_singleton on event_settings ((true));

-- 7.2 Registrations: review & pricing fields
alter table registrations
  add column if not exists status text not null default 'waiting_for_review',
  add column if not exists update_reason text null,
  add column if not exists payment_review_status text not null default 'pending',
  add column if not exists profile_review_status text not null default 'pending',
  add column if not exists tcc_review_status text not null default 'pending',
  add column if not exists rejected_reason text null,
  add column if not exists price_applied numeric(12,2) null,
  add column if not exists currency text default 'THB';

-- Optional: constraint checks
alter table registrations add constraint chk_status
  check (status in ('waiting_for_review','awaiting_user_update','approved','rejected'));

alter table registrations add constraint chk_update_reason
  check (update_reason is null or update_reason in ('payment','info','tcc'));

alter table registrations add constraint chk_review_statuses
  check (
    payment_review_status in ('pending','needs_update','approved','rejected') and
    profile_review_status in ('pending','needs_update','approved','rejected') and
    tcc_review_status in ('pending','needs_update','approved','rejected')
  );
```

**Trigger (pseudo):**
- On `registrations` row update, if all three `*_review_status = 'approved'` → set `status = 'approved'` AND emit event.
- If any `*_review_status = 'needs_update'` → set `status = 'awaiting_user_update'` and set `update_reason` accordingly.
- If any `*_review_status = 'rejected'` → set `status = 'rejected'` with `rejected_reason`.

---

## 8) Scheduled Jobs (Supabase)
Two options (choose one):
1) **pg_cron** (SQL-only): enable extension and schedule a function `registration_sweep()` nightly.
2) **Supabase Scheduled Functions** (Edge): write TypeScript function and schedule via dashboard.

**Sweep Logic (pseudo):**
- For any row with `status in ('waiting_for_review','awaiting_user_update')` and `now_utc > registration_deadline_utc` → set `rejected`, reason `deadline_missed`, send email.  
- For any row matching `eligibility_rules` → set `rejected`, reason `ineligible_rule_match`, send email.

---

## 9) Admin UI Additions
- **Event Settings Page:** date pickers (local TZ), price table editor, preview computed price for a chosen package at a given time.  
- **Review Page:** three independent toggles/dropdowns for payment/profile/tcc with inline helper text; computed global status at top.  
- **Filters:** by `status`, `update_reason`, date, package, and price range.  
- **Actions:** “Request Update (payment/info/tcc)”, “Approve Track”, “Reject Track”, “Run Sweep Now”.

---

## 10) Emails (Copy Skeletons)
**[TH/EN in one email; variables: {{applicant_name}}, {{tracking_code}}, {{cta_url}}, {{deadline_local}}, {{price_applied}}, {{package_name}} ]**  
- **Registration Received:** “เราได้รับคำขอลงทะเบียนแล้ว / We’ve received your registration”  
- **Request Update — Payment:** reason + instructions + CTA  
- **Request Update — Info:** reason + instructions + CTA  
- **Request Update — TCC:** reason + instructions + CTA  
- **Approval & Badge:** badge link/attachment and arrival instructions  
- **Rejection:** reason (deadline/ineligible), support contact, and next steps if applicable

---

## 11) Manual Steps (Outside Codebase)
1) **Supabase SQL:** run section #7; enable **pg_cron** if chosen.  
2) **Buckets:** verify `profile-images`, `chamber-cards`, `payment-slips`, `yec-badges`.  
3) **Email Provider:** create 6 templates (TH+EN), collect Template IDs.  
4) **ENV:** set `EMAIL_TEMPLATE_*`, `BRAND_*` tokens, and any admin allowlist as needed.  
5) **Admin Settings:** seed one row in `event_settings` with deadlines and prices (both early-bird and regular).  
6) **Scheduled Job:** create nightly sweep (cron) and test in staging.  
7) **Security:** double-check RLS and signed URLs on buckets.

---

## 12) QA & Acceptance
- Unit tests for price calculation and settings.  
- E2E paths: happy path; needs_update loop; auto-reject after deadline.  
- Email snapshots in both Thai and English.  
- Audit log verification for every transition.

---

## 13) Risks & Mitigations
- **Config Drift:** Guard `event_settings` as singleton; surface a banner if missing.  
- **Ambiguous “Pending”:** We use explicit `awaiting_user_update + update_reason`.  
- **Timezones:** Always store UTC; convert to Asia/Bangkok for display & emails.  
- **Price Mismatch:** Persist `price_applied` at submit time; admins compare slips against this value.
