# 📋 Jomlink — Project Plan

**Version:** 1.0 · **Status:** MVP complete + hardening
**Updated:** 2026-10-06

A marketplace for business introductions — connecting people who need access to people, organisations and opportunities with people who hold legitimate professional relationships (Linkers).

---

## 1. Purpose of This Document

We build **phase by phase**, validating each phase before moving on. This plan defines:

1. How the project is broken into **buildable, testable phases**.
2. What is **in scope / out of scope** for each phase.
3. The **definition of done** for each phase.
4. The **current status** so we always know where we are.

---

## 2. Confirmed Technical Decisions

| Concern | Decision | Notes |
|--------|----------|-------|
| Framework | Next.js 16 (App Router, TypeScript) | Turbopack, `src/` dir |
| Styling | Tailwind CSS v4 + design tokens | Jomlink brand (carmine/cotton-candy) |
| Data layer | supabase-js 2 (service-role) → `jomlink` schema | Replaced Prisma at runtime; legacy Prisma artifacts kept as reference only |
| Database | Supabase PostgreSQL (isolated `jomlink` schema) | NOT `public` — avoids collision with other apps in same Supabase |
| Schema isolation | `db: { schema: 'jomlink' }` at `createClient` | Headers are derived at construction; per-call `.schema()` is silently dropped |
| Auth | Supabase Auth (self-hosted) | Anon key public; SERVICE_ROLE server-only; users tagged `app='jomlink'` to avoid conflicts |
| Auth isolation | `app='jomlink'` tag check | `getCurrentUser()` only matches/link Jomlink-tagged users |
| Payments | Sandbox/stubbed gateway (planned) | 10% refundable posting deposit (wallet auto-deduct, less RM10 listing fee on pre-selection cancel), full reward settlement at Linker acceptance, escrow, 10% linker fee, 7-day auto-release |
| Verification | Simplified (status + badge) | Full document KYC deferred |

---

## 3. High-Level Architecture

```
Browser
  → Next.js App (React Server Components + Client components)
      → Server Actions / Route Handlers (business logic)
          → supabase-js service-role client (db.schema = 'jomlink') → Supabase Postgres
          → Supabase Auth        ── identity / sessions (tagged app='jomlink')
```

**Key principles:**
- All **business data lives in the isolated `jomlink` schema** inside the user's self-hosted Supabase (NOT `public`), so it can never collide with other apps.
- Supabase Auth users are **tagged `app='jomlink'`** via `app_metadata`; all member queries filter `app='jomlink'`, so the app only ever touches its own users.
- The service-role key is **server-only** and must never be exposed to the browser.

---

## 4. Phase Roadmap (Build Order)

| Phase | Focus | Status |
|-------|-------|--------|
| **0** | Foundation / scaffolding | ✅ Done |
| **Plan** | Project planning documentation | ✅ Done |
| **1** | DB migrate + seed + auth flow | ✅ Done |
| **2** | Member profile + relationships | ✅ Done |
| **3** | Opportunity marketplace + matching | ✅ Done |
| **4** | Linker proposals + negotiation | ✅ Done |
| **5** | Transactions / escrow | ✅ Done |
| **6** | Connection + completion + trust | ✅ Done |
| **7** | Admin / RBAC + disputes | ✅ Done |
| **8** | Dashboard + wallet + polish | ✅ Done |
| **9** | Deadline setting + progress report thread + yellow flag | ✅ Done |
| **10** | Notifications + navigation + workflow guards | ✅ Done |
| **11** | Match score + relationship save + schema routing | ✅ Done |

> Each phase has its own detail page in this `docs/` folder.

> **Phase 9** covers the Seeker/Linker deadline & progress-report workflow defined in
> blueprint §5.6.1, §5.6.2 and §9.11.1 — the Linker requests a task deadline, the
> Seeker accepts it, the Linker reports progress against it, both parties comment with
> edits preserved as evidence, and a missed Linker-proposed deadline raises a yellow
> flag. It builds on Phase 6 (connection workflow) and extends Phase 7 (dispute
> evidence of record). **Migration:** run `supabase/phase-09-deadline-progress.sql`.

> **Phase 10** closes gaps found in live testing: it wires **event-driven
> notifications** to both parties for connection, dispute, negotiation, evidence and
> admin events (§9.14) — before this, admin rulings that released or refunded escrow
> notified nobody; it makes the progress thread reachable in one hop from the
> dashboard and the connections list, with honest back-links; it adds **document
> upload** to connection evidence (private bucket + short-lived signed URLs); and it
> adds guards so no action is offered in a state where the server would reject it
> (§9.11 evidence of record). **Migration:** run the `connection-evidence` bucket
> `insert` from `supabase/jomlink-schema.sql` (§ 6d).

> **Phase 11** fixes two data-layer bugs and rewrites the match score. The
> `jomlink` schema was being requested **after** client construction, which
> supabase-js silently drops — so **every query resolved against `public`** and
> failed with `PGRST205`; the relationship form is simply where it was noticed.
> A phantom `app` column on the relationship insert was a second, independent
> failure. The match score's heaviest signal had never fired (an enum compared
> against free-text industry), restricted categories carried no penalty, entity
> matching missed common name variants, and the Seeker — the party choosing a
> Linker — could not see the score at all. **No migration required**; the
> database was already correct.

> **Phase 12** centralises the lifecycle state machine and fixes two money-path
> defects. The rule *"is this still open?"* had been re-written in **nine places
> across four rules** and had drifted in each: a `COMPLETED` project still offered
> *Select* and *Counter-offer*; a closed connection still accepted evidence and new
> appointments; escrow committed the Linker's **opening ask** rather than the
> negotiated amount (RM2,200 charged on an RM1,500 opportunity); and
> `acceptTermsAction` had **no wallet check at all**, so a Seeker holding RM1,030
> could accept RM2,100 terms and flip a proposal to `ACCEPTED` with no escrow and
> no funds behind it. Proposal submission notified nobody, notifications were not
> clickable, and the Linker had no UI to answer a counter-offer. All status rules
> now live in `src/lib/status.ts`. **No migration required.** ⚠️ One stale-escrow
> row is left for manual resolution — see the phase doc.

---

## 5. Guiding Rules

- **Build one phase at a time.** Do not jump ahead.
- **Every phase is production-build-clean** (`npm run build` passes) before we move on.
- **DB schema is centralized** in `prisma/schema.prisma`. Add migrations phase-by-phase.
- **Never expose `SERVICE_ROLE_KEY`** to the browser.
- **Privacy by design** — relationship data must never leak personal contacts.
- **MVP simplicity + scalable architecture** — avoid decisions that block future multi-country, multi-currency, or business accounts.

---

## 6. Current Project Snapshot

Already built:

**Phase 0 (Foundation):**
- Next.js + Tailwind + TS scaffold ✅
- Supabase env config (`.env.local`, git-ignored) ✅
- Full Prisma schema (validated, client generated) ✅
- Design system + landing page + core UI components ✅
- Prisma 7 config + pg driver adapter ✅
- PostgreSQL running in Docker (ready for migrations) ✅
- Personal logo + icon integrated (header, footer, favicon) ✅

**Phase 1 (Auth):**
- Initial migration applied (26 tables) ✅
- Seed script: super admin, demo member, sample orgs/relationships ✅
- Register / login / logout (Supabase Auth + Prisma) ✅
- `getCurrentUser()` with auto-provisioning for existing Supabase users ✅
- Route protection via Next.js 16 `proxy.ts` ✅
- Build passes ✅

**Phase 2 (Profile + Relationships):**
- Dashboard layout with sidebar navigation ✅
- Profile edit page (headline, position, org, industry, languages, bio) ✅
- Employment history CRUD ✅
- Relationship declarations with category, visibility, degree ✅
- Business profile creation + role toggle (Seeker/Linker/Both) ✅
- Public profile page (`/members/[id]`) — privacy-by-design, no contact leakage ✅
- Build passes ✅

**Phase 3 (Opportunity Marketplace + Matching):**
- Opportunity creation wizard (`/opportunities/new`) with all blueprint fields ✅
- Posting model (`src/lib/funding.ts`): **10% refundable posting deposit** auto-deducted from the Seeker's wallet; posting blocked when credit is insufficient. Cancelling before a Linker is selected refunds the deposit less the **RM10 non-refundable listing fee** ✅
- Publish flow: DRAFT → PENDING_PAYMENT → ACTIVE (simulated transactions) ✅
- Marketplace browse (`/marketplace`) with search + filters (category, country, reward) ✅
- Opportunity detail page (`/opportunities/[id]`) with funding breakdown ✅
- Rule-based match score (`src/lib/matching.ts`) shown to Linkers ✅
- Restricted Government / Public Sector category flagged + forced RESTRICTED ✅
- Build passes ✅

**Phase 4 (Linker Proposals + Negotiation):**
- Linker proposal submission (`/opportunities/[id]/apply`) with relationship declaration ✅
- Seeker proposal comparison (`/opportunities/[id]/proposals`) ✅
- Negotiation thread + counter-offers (reward/terms) via `/api/proposals/[id]/negotiations` ✅
- Target substitution flag + reason (Seeker acknowledges) ✅
- Linker selection → opportunity `LINKER_SELECTED`, terms locked (agreed_reward/deliverable) ✅
- Linker "My Proposals" dashboard page (`/dashboard/proposals`) ✅
- Build passes ✅

**Phase 5 (Transactions / Escrow):**
- Double-entry ledger helper (`src/lib/ledger.ts`) — balanced debit/credit pairs ✅
- Posting deducts the 10% deposit; accepting a Linker settles the **full reward** into escrow via `transaction_ledger` ✅
- Reward release on completion with 10% linker service fee deducted (net payout) ✅
- Refund flow for failed/cancelled/expired opportunities ✅
- Payout + refund records; 7-day auto-release rule (cron-ready) ✅
- Wallet page (`/dashboard/wallet`) with balance, transactions, payouts, refunds ✅
- Build passes ✅

**Phase 6 (Connection + Completion + Trust):**
- Connection created on Linker selection; connection list + detail pages (`/dashboard/connections`) ✅
- Appointment proposal (Linker) + Seeker acknowledge/reject ✅
- Evidence submission by Linker with status review ✅
- Completion review → opportunity COMPLETED + schedules 7-day payout release ✅
- Extension request + failed-opportunity handling ✅
- Mutual ratings/reviews post-completion ✅
- Reputation metrics (success rate, avg rating) updated + shown on public profile ✅
- Build passes ✅

**Phase 7 (Admin / RBAC + Disputes):**
- RBAC helper + admin guard (`src/lib/rbac.ts`); role-scoped admin layout + sidebar (`/admin`) ✅
- Member management (search/suspend/reinstate/role), opportunity moderation (approve/flag/reject), restricted-category toggle ✅
- KYC status management (simplified): admin reviews `kyc_records` → sets `verification_status` + `verified_badge` on member profile; relationship verification queue ✅
- Dispute workflow (raise → payment hold → review → resolve: REFUNDED/FAILED → escrow→seeker; COMPLETED → escrow→linker net + 10%; PARTIALLY_COMPLETED → 50/50) ✅
- Audit trail (`audit_logs`) for financial + sensitive admin actions ✅
- Build passes ✅

**Phase 8 (Dashboard + Wallet + Polish) — FINAL MVP:**
- Role-aware Seeker+Linker dashboard hub (`/dashboard`) ✅
- Notifications (in-app, mark read), wallet top-up via ToyyibPay (Malaysian gateway, FPX+card, sandbox) ✅
- Public info pages (`/how-it-works`, `/fees`, `/trust-safety`, `/prohibited`) ✅
- Profile basic-details editing + avatar upload (Supabase storage bucket) ✅
- Build passes (26 routes). **MVP COMPLETE — ready for Malaysia/MYR pilot.**

**Phase 10 (Notifications + Navigation + Workflow Guards):**
- Shared notification fan-out (`src/lib/notify.ts`): `notify`, `notifyMany`, `notifyUser`, `notifyConnectionParties` — all best-effort (never roll back the triggering action) ✅
- Event notifications for **both parties** on connection, dispute, evidence and negotiation events; admin actions (suspend/reinstate/role/moderation/KYC/relationship verdicts) notify the affected member ✅
- Dispute raised → counterparty; status change and resolution → **both**, with per-side bodies describing what happened to each party's money ✅
- Progress thread reachable in one hop from the dashboard rows and the connections list; no duplicate buttons; honest back-links on every connection page ✅
- Evidence **document upload** → private `connection-evidence` bucket, `file_access_key` path, served via `GET /api/evidence/[id]` (party-gated, 60s signed URL) ✅
- Guards: review form disappears once reviewed (server also verifies party + `COMPLETED` + counterparty); extension unavailable on a closed connection (UI + server) ✅
- Evidence "Pending review" badge removed — it promised an approval step that no code path ever performed ✅
- Build passes ✅

---

## 7. Next Action

**MVP is feature-complete.** Remaining work is production hardening:

1. **Verify the `connection-evidence` storage bucket exists** — run the § 6d `insert` from `supabase/jomlink-schema.sql`, or create it in the Supabase dashboard with the same settings (private, 10 MB, jpeg/png/webp/pdf). Evidence upload fails until it exists. *(The Phase 9 migration is confirmed already applied — those tables are reachable on the live database.)*
2. KYC hardening: liveness/selfie, expiry tracking, automated verification providers. (Member-facing doc upload + admin review + admin document preview are built.)
3. Live payment gateway (ToyyibPay sandbox → production keys, webhook tunnel for callback).
4. **Relationship verification** — the match score trusts self-declared relationships, so a member can claim any relationship and collect up to 26 points. `relationship_verifications` exists in `prisma/schema.prisma` for exactly this and has **no table** in the live database. Decide whether to build it. *(Phase 11 open item 4.)*
5. Fraud/risk scoring engine + advanced matching (Phase 2 marketplace intelligence). Note: repeated yellow flags (§5.6.1) are already recorded and can feed this.
6. **Extension is still unilateral** — a Linker self-approves an extension, which also auto-clears their own yellow flag. Consider a Linker-requests / Seeker-approves pair (see `phase-10-notifications-nav-guards.md` → *Open / follow-up*).
7. Notification delivery is **in-app only** — `notification_channel` supports EMAIL/SMS/PUSH but no worker sends them.
8. **Decide whether match score should persist or influence ordering** — it is currently computed per-request, stored nowhere (`opportunities.match_score` is reserved and always `NULL`), and the Seeker's badge is informational only. Persisting it needs cache invalidation whenever a Linker edits their profile or relationships. *(Phase 11 open item 1–2.)*
9. Business accounts, multi-country, multi-currency (architecture-ready, not built).

> **Reconcile Prisma and Supabase.** `prisma/schema.prisma` lists
> `relationship_verifications` and `membership`, neither of which exists in the
> live database or in `supabase/jomlink-schema.sql`, and neither is used by
> `src/`. Prisma is legacy reference only — the runtime data path is Supabase.

---

## 8. Change Log

- **2026-09-18** — Created project plan + all phase docs (01–08). Phase 0 scaffold complete. Ready to start Phase 1.
- **2026-09-18** — Phase 1 complete: initial migration (26 tables), seed (admin + demo + orgs), register/login/logout with Supabase Auth + Prisma, `getCurrentUser()` with auto-provisioning (resolves redirect loop for existing Supabase users), route protection via `proxy.ts`. Build passes. Personal logo + icon integrated. Ready for Phase 2.
- **2026-09-18** — Phase 2 complete: dashboard sidebar layout, profile edit, employment history CRUD, relationship declarations (category/visibility/degree), business profiles + role toggle, public profile page (privacy-safe). Build passes. Ready for Phase 3.- **2026-09-24** — Phases 7 +  8 complete (admin/RBAC/disputes + dashboard/wallet/polish. MVP feature-complete. KYC is **simplified**: admin reviews `kyc_records` status → sets `verification_status` + `verified_badge` on the member profile; there is **no member-facing KYC submission flow** (no document upload/liveness) — full document KYC remains deferred. Wallet top-up wired to ToyyibPay sandbox.
- **2026-09-24** — Member-facing KYC submission flow added: `/dashboard/kyc` (upload identity doc → private `kyc-documents` bucket → PENDING `kyc_records` row → admin `/admin/kyc` review queue). Files: `src/app/actions/kyc.ts` (`submitKycAction`), `src/app/dashboard/kyc/` (page + `kyc-form.tsx`), `getKycRecordsByUser` query helper, `kyc-documents` storage bucket in schema SQL, "Verification" nav item. Build passes (27 routes).
- **2026-09-24** — Admin KYC document preview added: `/api/admin/kyc/[id]/document` (admin-guarded `kyc:read`, generates 60s signed URL for the private object and redirects). "View document" link in the admin KYC queue. Build passes (28 routes.
- **2026-10-01** — Seeker opportunity editing added (bug fix): owners could not edit a posted Opportunity. New `/opportunities/[id]/edit` page + `opportunity-edit-form.tsx`, `updateOpportunityAction` server action, `hasProposalsForOpportunity` query helper, and an "Edit opportunity" button on the detail page. **Edit-lock rule:** a listing is editable only while its status allows it **and** no Linker has submitted a proposal. As soon as **any Linker submits a proposal** (or a Linker is selected / reward is escrowed) the listing becomes read-only; the rule is enforced in the server action, the edit page, and the button. See `phase-03-marketplace.md` → *Opportunity editing (Seeker)*.
- **2026-10-05** — **New Seeker/Linker deadline & progress-report workflow documented** (blueprint §5.6.1, §5.6.2, §9.11.1). (1) **Deadline setting** — after the Seeker accepts the Linker, the **Linker requests the task deadline** as a distinct timestamped step; the Seeker accepts (task → `IN_PROGRESS`) or rejects/requests a change (terms reopen for negotiation, §5.6). (2) **Yellow flag** — a Linker who set a deadline but cannot deliver by it receives a yellow flag: a commitment signal (not a penalty) that does not by itself release the reward, is cleared on on-time delivery or an accepted extension, feeds the Linker Performance Record/Reputation, and counts as an abuse signal when repeated. (3) **Progress report thread** — opens at deadline acceptance and runs until the deadline ends; the Linker posts reports, both parties comment, and extension requests are raised through the thread. (4) **Evidence of record** — nothing in the thread is ever destroyed: either party may edit their own comment, but **every edit preserves the prior version as retrievable update history**, so a dispute can be resolved on what was actually claimed and when. Docs updated: `phase-06-connection.md`, `phase-04-proposals.md`, `phase-07-admin.md`, `00-project-plan.md` (new **Phase 9**).
- **2026-10-05** — **Fixed: empty Connections tab / unreachable Phase 9 workflow (bug found in live testing).** A Linker with a `SELECTED` proposal had **no `connections` row**, so the Connections tab was empty and the entire deadline/progress workflow was unreachable. Root cause was **upstream of Phase 9**, in the Phase 4→6 handoff: `createConnection()` is called only from `selectLinkerAction` (which also escrows the reward and requires wallet funds), while `acceptTermsAction` sets the proposal to `ACCEPTED` and stops. A proposal could therefore read as accepted/selected with no connection. Fixes: (1) `selectLinkerAction` made **idempotent** — already-`SELECTED` proposals are not charged twice, and a missing connection is created **without re-charging escrow**, so the stuck proposal recovers when the Seeker presses Select; (2) the proposal card keeps **"Complete acceptance (open the connection)"** visible for a `SELECTED` proposal with no connection; (3) the opportunity page no longer claims *"the reward is held in escrow"* when no connection exists; (4) `getProposalsWithLinker` now selects `connections(id)`. Documented in `phase-09-deadline-progress.md`. `npm run build` passes. Blueprint §5.6.1, §5.6.2, §9.11.1 implemented end-to-end.
- **2026-10-05** — **Phase 9 built (Seeker/Linker deadline + progress report + yellow flag).** Blueprint §5.6.1, §5.6.2, §9.11.1 implemented end-to-end.
  - **Schema:** new models `opportunity_deadlines`, `progress_reports`, `progress_report_comments`, `progress_report_comment_revisions`, `linker_flags`; new enums `DeadlineStatus`, `FlagType`, `FlagStatus`, `ProgressReportStatus`, `ProgressAuthorRole`; `OpportunityStatus` gained `DEADLINE_REQUESTED` + `FLAGGED`; `reputation_metrics` gained `deadlines_requested/met/missed` + `flags_raised/cleared`. Migration: `supabase/phase-09-deadline-progress.sql` (idempotent) + the base `jomlink-schema.sql` updated for fresh installs.
  - **Actions:** `src/app/actions/deadlines.ts` (request / accept / reject), `src/app/actions/progress-reports.ts` (post report, post comment, **edit with revision history written before the overwrite**). `src/lib/flags.ts` owns the raise/clear lifecycle.
  - **UI:** deadline card + yellow-flag banner on `/dashboard/connections/[id]`; new `/dashboard/connections/[id]/progress` thread with per-comment "edited · N revisions kept" and an expandable **update history**.
  - **Admin:** new `/admin/disputes/[id]` — the **evidence of record** (deadline record, flag history, full progress thread with every comment's prior versions), linked from the disputes list.
  - **Lifecycle wiring:** completion counts `deadlines_met` and clears any flag; failure raises the flag and counts `deadlines_missed` + `flags_raised`; an accepted extension clears the flag. Confirmed design decisions: the flag does **not** release the reward (only a §5.13 failure does), and a Seeker rejection reopens negotiation. `npm run build` passes (31 routes).
- **2026-10-06** — **Phase 10: notifications + navigation + workflow guards.** See `phase-10-notifications-nav-guards.md`.
  - **Notifications (`src/lib/notify.ts`, new).** Shared fan-out: `notify`, `notifyMany`, `notifyUser`, `notifyConnectionParties` (both parties, actor excluded), `getConnectionParties`. Every helper is **best-effort** — it logs and returns rather than throwing, so a notification failure can never roll back the business action that triggered it. `notifications.type` is free-form text, so new event types need no migration.
  - **Coverage.** Before this change `admin.ts`, `disputes.ts`, `completions.ts`, `negotiations.ts` and `evidence.ts` created **zero** notifications — an admin ruling that released or refunded escrow reached nobody. Now: admin actions (suspend/reinstate/role/moderation/KYC/relationship verdicts) notify the affected member; disputes notify the counterparty when raised and **both** parties on status change and resolution (with per-side bodies describing that party's money); connection opened/completed/extension-requested/failed notify the affected party (failure notifies **both**); evidence submission notifies the Seeker; counter-offers, accepted terms and Linker selection notify the counterparty. Notification icons extended (`ShieldCheck` for admin/verification events).
  - **Navigation (bug, found in live testing).** From the dashboard's Active Connections card, `All` opened the connections list, but **no path reached the progress thread** — every route funnelled through the `[id]` detail page, and the list's action button only produced a progress href in the `ACCEPTED` deadline state. Fixed by computing `progressHref` independently of `nextAction`, routing dashboard rows straight to the thread when the deadline is accepted, and de-duplicating the button when the primary action already targets it. Back-links corrected: detail page now returns to the **list** (was `/dashboard`), and the progress page offers both "Back to connection" and "All connections".
  - **Evidence document upload.** The evidence form's "File URL (optional)" text box became a real file picker (jpeg/png/webp/pdf, ≤10 MB). Uploads go to a new **private** `connection-evidence` bucket, with the object path stored on the pre-existing-but-unused `connection_evidence.file_access_key` column. Paths are timestamped + randomised per connection. New `GET /api/evidence/[id]` authorises against the connection (Linker or Seeker only) and 302-redirects to a **60-second signed URL**. Validation runs before any network call, and a zero-byte `File` is treated as "no file chosen". **Migration:** the bucket is declared in `jomlink-schema.sql` § 6d — run that `insert` or create the bucket manually.
  - **Guards.**
    - *Extension after completion (bug).* The form was gated on `conn.status === "COMPLETED"` — the inverse of the intent — and the action had no status check, so it added days to `auto_release_at` (the escrow release timer!) on a **finished** job, set `release_status = "EXTENDED"`, and cleared the missed-commitment flag. Now gated to `IN_PROGRESS` / `AWAITING_VERIFICATION` in the UI and rejects `COMPLETED` / `FAILED` / `DISPUTED` in the action. *Not* caused by closing early.
    - *Repeated reviews (bug).* The server rejected duplicates but the UI never checked, so the form stayed visible forever; the summary line also loaded the **Seeker's own** reviews instead of the counterparty's. The page now loads `myReview` and swaps the form for a confirmation; the summary shows the counterparty's reviews; and `submitReviewAction` verifies the reviewer is a party to a `COMPLETED` connection whose `subjectId` is genuinely the counterparty (previously a crafted POST could rate any member).
    - *Evidence "Pending review" badge (bug).* `connection_evidence.approved` defaults to `null` and **no code path ever set it** — there is no `evidence:*` permission and no admin evidence queue, so every item showed "Pending review" permanently. Per the §9.11 evidence-of-record principle the badge was **removed** and replaced with a one-line explanation; the column was left in place (always-`null` is harmless; dropping it would be a destructive migration).
  - **Latent bug surfaced by the type-checker:** `updateDisputeStatusAction` referenced the dispute without ever loading it — the missing lookup was added. `npm run build` passes.
- **2026-10-06** — **Phase 11: match score + relationship save + schema routing.** See `phase-11-match-score-and-data-layer.md`. **No migration required.**
  - **Relationship form would not save (bug, found in live testing).** Reported as *"linker > relationship. i cant save this form."* Two independent causes, both confirmed by probing the live Supabase instance. **(a)** `src/lib/supabase/admin.ts` built the client with no `db.schema` and then called `.schema("jomlink")` per request — but supabase-js derives its `Accept-Profile` header inside `createClient`, and calling `.schema()` on a built client returns a **new** client whose REST headers are dropped. Requests went out with no schema header, so PostgREST answered from `public` where no Jomlink table lives → `404 PGRST205`. **This was not relationship-specific — it broke every query in the data layer.** Fixed by setting `db: { schema: "jomlink" }` at construction and removing the six now-redundant `.schema()` calls. **(b)** `createRelationship()` inserted `app: JOMLINK_APP_TAG`, a column that exists **only on `users`** → `400 42703`. Removed. Verified live: 28 of 30 tables reachable, and a real end-to-end insert against an existing member succeeded.
  - **Match score rewrite.** Four defects, the worst of which was silent: category relevance compared the **enum** (`"BUSINESS_INTRODUCTION"`) against free-text `industry` (`"Finance"`) — values that can never substring-match — and its `labels` table covered only 4 of 11 categories, so **the heaviest signal had never once fired** and every member received the 8/20 fallback while the UI showed a confident band label. Also: `is_restricted_category` was accepted as input and never read; entity matching missed common variants (`"Bhd"`, `"Sdn"`, plurals, orgs held via `organisation_id`), so real relationships scored zero; and `current_organisation` could pay out twice for the same employer. Rewrote with an 11-category `CATEGORY_KEYWORDS` map matching industry **prose**, `entityNamesMatch()` (punctuation/plural/legal-suffix normalisation, all-tokens-must-match), employment precedence over `current_organisation`, `target_role_exact` enforcement, a city fallback for geography, a −10 restricted penalty, and an exported `MATCH_WEIGHTS` so the docstring can no longer drift from the code (it claimed "Reputation → up to 10" when the code paid at most 8).
  - **The Seeker can now see the score (gap).** It was computed only for a logged-in non-owner — i.e. the Linker. The party actually choosing between Linkers saw nothing. `getProposalsWithLinker()` now embeds `member_profiles`, `employment_history` and `relationships`; the proposals page scores each proposal via new shared helpers (`buildMatchInput`, `matchOpportunityFields`) so both sides score **identically** from one code path; the proposal card shows a match badge plus a plain-language reason ("1st-degree relationship to the target entity").
  - **`match_score` column documented as reserved.** It is defined in the schema but **no code writes it** — the score is computed per-request because it depends on which Linker is viewing. Comment added; persisting it remains an open item.
  - **Verification.** 36 assertions across 12 scorer scenarios (entity-name edge cases, every category, all three degrees, employment precedence, exact-role gating, restricted penalty, cap/floor, null-safety) via a temporary harness built on the esbuild bundled with Next — **deleted after the run**; the repo still has no test runner. `npm run build` and `npx tsc --noEmit` both pass. Two lint findings in touched files are pre-existing and were confirmed as such by stashing the changes and re-running.
- **2026-10-06** — **Phase 12: lifecycle guards + notification deep-links + money path.** See `phase-12-lifecycle-guards-and-money-path.md`. **No migration required.**
  - **State machine centralised (root cause of most of this phase).** The *"can this still be negotiated?"* rule existed inline in **five** places that disagreed — `negotiations.ts` (correct), `proposal-card.tsx` (missing `SELECTED`), the new `negotiation-panel.tsx` (missing `SELECTED`), and `acceptTermsAction` (no check at all). The server action was right and the **UI** was wrong, so a `SELECTED` project — escrow committed, terms locked — still rendered *Counter-offer* and *Accept*. Compounding it: **completing a connection does not rewrite its proposal rows**, so a proposal can read `Selected`/`Under review` on an opportunity that is already `COMPLETED`. `src/lib/status.ts` now owns `isProposalNegotiable` / `isProposalSelectable` / `isConnectionOpen` / `isOpportunitySelectable` / `isOpportunityTerminal`, and all nine call sites delegate to it. Surfaces gate on **both** the proposal's and the opportunity's status.
  - **Escrow committed the wrong amount (bug, money).** The *Select this Linker* form submitted `proposal.proposed_reward` — the Linker's **opening ask** — ignoring negotiation, while the helper text beside it showed the negotiated figure. On live data all three disagreed: thread RM2,100, helper text RM2,100, **submitted RM2,200**. Confirmed it had fired in production — the wallet holds `Reward escrow −RM2,200.00` for an opportunity whose reward is **RM1,500**. Now commits `agreed_reward ?? last counter-offer ?? proposed_reward`, and the charged figure and displayed figure derive from one source.
  - **`acceptTermsAction` had no affordability check (bug, money).** It enforced only the RM100 reward floor. A Seeker with **RM1,030** could accept **RM2,100** terms: the proposal flipped to `ACCEPTED` and `agreed_reward` was written with **no escrow and no transaction** — a commitment with nothing behind it. Two paths both say "accept" but only `selectLinkerAction` checked funds. Now the Seeker's balance is verified server-side before writing (the Linker is exempt — they are paid, not charged). The proposals page also loads the balance so **Select and Accept are disabled up front**, stating the gap and linking to top-up, instead of letting the member click into a rejection.
  - **Missing connection-status guards.** The *"is this connection closed?"* rule had six copies; `evidence.ts` and `appointments.ts` had **none**. A `COMPLETED` connection rendered a live *Submit evidence* form directly beneath *"The thread has ended"*, and submissions succeeded and notified the Seeker; new appointments could also be proposed on a finished job. Both now call `isConnectionOpen`, and the forms are replaced with a closed-state explanation.
  - **Seeker's connections list was always empty (bug).** `/dashboard/connections` called only `getConnectionsByUser()`, which filters `.eq("linker_id", userId)` — a Seeker is never the `linker_id`, so they saw *"No connections yet. They appear once a Seeker selects your proposal"* while owning a completed connection whose detail page worked. A `getConnectionsForSeeker()` query already existed but was unused by that page. The page now fetches both sides and de-duplicates; the empty-state copy is role-aware.
  - **Proposal submission notified nobody (bug).** `submitProposalAction` called `revalidatePath` — which only invalidates Next.js's cache — and never wrote a notification. It was the sole outlier among eight comparable actions, despite `lib/notify.ts` documenting the both-parties rule. Added `PROPOSAL_SUBMITTED` / `PROPOSAL_RESUBMITTED` / `PROPOSAL_WITHDRAWN` (withdrawal was silent too).
  - **Notifications were not clickable (gap).** Rows were static markup with a "Mark read" button; the `data` payload already carried `connectionId` / `opportunityId` / `proposalId` / `disputeId` and nothing read it. New `src/lib/notification-links.ts` maps all 24 types to **role-relative** destinations (the same proposal is reached via `/dashboard/proposals` for a Linker and `/opportunities/[id]/proposals` for a Seeker). Clicking marks read **and** navigates, via `openNotificationAction`, which validates the target is a same-origin relative path — otherwise the client-supplied href would be an open redirect.
  - **Linker had no negotiation UI (bug).** The counter-offer form existed only in `proposal-card.tsx`, rendered under the **Seeker's** page; the Linker's `/dashboard/proposals` was read-only. A Seeker could counter, the Linker was notified, and there was no means to respond. Extracted `src/components/negotiation-panel.tsx` and rendered it on both surfaces. Added `canAccept` so you can no longer accept your own standing offer, and corrected thread copy that promised an Accept action the author does not have.
  - **Negotiations API was unauthorized.** `GET /api/proposals/[id]/negotiations` was readable by id alone — its own comment admitted it. The thread carries offered rewards and free-text messages. Now 401/403/404 as appropriate; this became **required** by the Linker-UI change, since that list fetches the endpoint.
  - **Data repaired during the session (with explicit approval).** Proposal `7bb3dcbc…` was flipped to `ACCEPTED` by the missing-affordability bug and reverted to `UNDER_REVIEW` with its agreed fields cleared; the single test counter-offer row was deleted. **Left unresolved:** the stale **RM2,200 escrow on an RM1,500 opportunity** — a live financial commitment on a `COMPLETED` connection that needs a product decision.
  - **Verification.** `tsc`, `eslint` and `npm run build` (31/31 pages) all clean; behaviour checked in the browser on both accounts. **Not verified:** the `BOTH`-role de-duplication path in the connections list (no such test account was used) — reasoned, not exercised. A **test suite was then added** (`vitest`, `npm test`) covering the `status.ts` predicates and `notification-links.ts` — 39 tests, and confirmed to fail when the SELECTED rule is reverted. Coverage is pure logic only: nothing yet exercises actions, the database, or a request context.
