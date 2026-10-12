# Changelog — Jomlink

A single reverse-chronological record of **what happened when**. Newest first.

Format follows [Keep a Changelog](https://keepachangelog.com/). Dates are ISO
(`YYYY-MM-DD`, Asia/Kuala_Lumpur). Entries link to the detailed phase doc.

> Full narrative lives in `jomlink-app/docs/00-project-plan.md` and the per-phase
> docs. The status board is `jomlink-app/docs/PROJECT-TRACKING.md`.

---

## [Refinements] — 2026-10-12 · Optional proposal reward, escrow payout visibility & bank withdrawals

> Three ship-blocking gaps closed after Phase 13: Linkers are **no longer forced
> to invent a reward**, both parties can now **see what the Linker will be paid
> and when**, and members can **withdraw their wallet balance to a bank account**
> (admin-settled). ⚠️ **Requires migration** `supabase/phase-payout-request.sql` —
> **not yet applied**. `npm test` **67 passing**.

### Added
- **Bank payout requests** — both Seekers and Linkers can now request a
  withdrawal of their available wallet balance to a bank account; an admin
  settles it from `/admin/transactions?tab=requests`.
  - New member action file `src/app/actions/payouts.ts`:
    `updateBankDetailsAction` (bank name / account no / holder, validated) and
    `requestPayoutAction` (requires bank on file, amount ≤ balance, one open
    request at a time).
  - New admin action `markPayoutPaidAction` (perm `finance:payout`) in
    `src/app/actions/admin.ts` — completes the `WITHDRAWAL` transaction + ledger
    movement (`wallet:{id} → external:payout`), flips the payout row to `PAID`,
    audits `PAYOUT_PAID`, notifies the member. Idempotent on already-paid rows.
  - New wallet UI `src/app/dashboard/wallet/payout-request-panel.tsx` (bank form
    + withdraw form + pending-request state), placed **under the balance** so it
    is visible without scrolling.
  - New admin tab **Withdrawal requests** (`?tab=requests`) +
    `src/app/admin/transactions/mark-paid-button.tsx`.
- **Payout visibility for Linkers** — a new **Reward & payout** card on the
  connection page shows the reward held in escrow, the Linker's **net take-home**
  (reward − 10% service fee), and the **release state** (paid / scheduled release
  date / held by dispute / refunded / "set on completion"). The wallet gained an
  **Incoming payouts** tile (net, next release date).
- **New query helpers** in `src/lib/queries.ts`: `getPayoutById`, `updatePayout`,
  `listPendingPayoutRequestsAdmin` (joins member names + bank details),
  `updateBankDetails`.
- **New audit actions**: `PAYOUT_REQUESTED`, `PAYOUT_PAID`.
- **Schema (needs migration)**: `users.bank_name` / `bank_account_no` /
  `bank_account_name`; `payouts.requested_at` / `approved_by` / `note`; new
  `WITHDRAWAL` transaction type. See `supabase/phase-payout-request.sql`.

### Changed
- **The proposed reward is now OPTIONAL** on a Linker proposal. Leaving the
  field blank defers to the Seeker's advertised reward (`opportunity.offer_amount`)
  — the Seeker sets the reward, the Linker only overrides it with an explicit
  figure. The fallback is resolved **server-side** (blank/omitted → seeker's
  reward, then re-checked against the RM100 floor), so the stored
  `proposed_reward` is always a real number and the downstream negotiation math
  is unaffected.
- **Wallet "Withdraw to bank" relocated** — moved from the bottom of the tall
  right-hand column into the wide left column, directly beneath the Balance /
  Pending escrow tiles, removing the empty gap and the scroll-to-find problem.
- Wallet **"Payouts" list** now distinguishes **Bank withdrawal** vs **Reward
  payout** and shows paid dates; `getWalletBalance` and the wallet page treat
  `WITHDRAWAL` as an **OUT** so the balance drops after payment.

### Fixed
- Merely cosmetic in isolation, but structural: the withdrawal flow **never
  drained the wallet on request** — the debit happens only at admin settlement,
  so an un-actioned request cannot silently remove funds.

> Docs updated: `phase-04-proposals.md`, `phase-05-transactions.md`,
> `phase-08-dashboard.md`, `PROJECT-TRACKING.md`.

---

## [Phase 13] — 2026-10-12 · Appointments, track records & deadline warnings

> Appointment notifications, rejection recovery, appointment **track records**
> (member + admin dispute view), a direct "Open connection" link, and a proactive
> **running-out-of-time** deadline-warning layer. **No migration required.**
> `npm test` **67 passing**.

### Added
- **Appointment notification** to the Seeker when the Linker proposes an
  appointment (`APPOINTMENT_PROPOSED`), and to the Linker on the Seeker's
  decision (`APPOINTMENT_ACKNOWLEDGED` / `APPOINTMENT_REJECTED`).
- **Appointment track record** on the connection page — every proposed slot,
  newest first, with date · method · location, status badge, and proposed-on
  timestamp.
- **Admin dispute view** now shows the full appointment record
  (`getEvidenceOfRecord()` returns `appointments`; new "Appointment Record" card).
- **"Open connection"** button on every Connections-tab row (the row previously
  only offered the progress thread).
- **Running-out-of-time warnings** (`src/lib/deadline-warnings.ts`): warns **both
  parties** before a deadline passes while work is incomplete. In-app banner
  (URGENT = red, SOON = amber) + `DEADLINE_APPROACHING` notification.
- **Cron-ready route** `GET /api/connections/deadline-sweep` — sweeps approaching
  deadlines; de-dupes one warning per connection per level.
- **Query** `listDeadlinesApproaching(withinDays)`.
- **Tests** `src/lib/deadline-warnings.test.ts` (7 cases) + appointment routing
  cases.

### Fixed
- **Appointment proposed notified nobody** — `proposeAppointmentAction` called
  `revalidatePath` (which refreshes the client but writes no row) and never
  imported `@/lib/notify`.
- **A rejected appointment deadlocked the connection** — the rejected slot became
  the "latest", the Seeker's controls only show for `PROPOSED`, and the Linker's
  propose form only showed when there was *no* appointment. Now **Linker-only**
  proposing, but a rejection is always recoverable ("Propose new date"), with a
  guard against stacking proposals.
- **Connections tab had no direct link** to the connection detail page.

### Changed
- **Notification contrast** — dashboard unread nudge is now a solid-carmine card
  with white text (~8:1), a pulsing dot and a count pill; unread rows gained a
  4px carmine left border; the "New" badge is solid carmine.
- `APPOINTMENT_*` routes to the connection workspace; `DEADLINE_APPROACHING` maps
  to an `AlertTriangle`/warning icon.

> Phase doc: `jomlink-app/docs/phase-13-appointments-and-deadline-warnings.md`

---

## [Phase 12] — 2026-10-06 · Lifecycle guards, deep-links & money path

> ⚠️ **Requires migration** `supabase/phase-12-extension-approval.sql` — **not yet
> applied**. One stale-escrow row left for a product decision (see tracking board).

### Added
- **Centralised lifecycle state machine** in `src/lib/status.ts`
  (`isProposalNegotiable` / `isProposalSelectable` / `isConnectionOpen` /
  `isOpportunitySelectable` / `isOpportunityTerminal`) — replacing nine divergent
  inline copies.
- **Notification deep-links** (`src/lib/notification-links.ts`) — every type maps
  to a role-relative destination; clicking marks read **and** navigates.
- **Linker negotiation UI** (`src/components/negotiation-panel.tsx`) on both
  surfaces, with `canAccept` so you cannot accept your own offer.
- **Extension request/decision flow** (§5.14) — Linker requests, Seeker decides;
  new `jomlink.connection_extensions` table.
- **First test suite** — `vitest` + 49 tests (`status.ts`, `notification-links.ts`,
  extension decision table).

### Fixed
- **Escrow committed the wrong amount** — charged the Linker's opening ask
  (RM2,200) instead of the negotiated figure (RM1,500 on live data).
- **`acceptTermsAction` had no affordability check** — a commitment could be made
  with no escrow and no funds behind it.
- **Missing connection-status guards** — a `COMPLETED` connection accepted new
  evidence and appointments.
- **Seeker's connections list was always empty** (only queried `linker_id`).
- **Proposal submission notified nobody**; **notifications were not clickable**.
- **Extension was unilateral** — the Linker cleared their own yellow flag.
- **Negotiations API was unauthorized** (`GET /api/proposals/[id]/negotiations`).

### Data
- Repaired proposal `7bb3dcbc…` (reverted to `UNDER_REVIEW`) with explicit
  approval. **Left unresolved:** stale RM2,200 escrow on an RM1,500 opportunity.

> Phase doc: `jomlink-app/docs/phase-12-lifecycle-guards-and-money-path.md`

---

## [Phase 11] — 2026-10-06 · Match score, relationship save & schema routing

> **No migration required.** The database was already correct.

### Fixed
- **Relationship form would not save** — the `jomlink` schema was set via
  per-call `.schema()` (dropped by supabase-js) so **every query** hit `public`
  (`404 PGRST205`); fixed by setting `db: { schema: "jomlink" }` at construction.
  Also removed a phantom `app` column insert (that column exists only on `users`).
- **Match score** — category relevance compared an enum against free-text
  `industry`, so the heaviest signal had **never fired**; rewrote with an
  11-category map, entity-name normalisation, employment precedence, and an
  exported `MATCH_WEIGHTS`.

### Added
- **The Seeker** can now see the match score (it was Linker-only); both sides
  score identically from one code path.

> Phase doc: `jomlink-app/docs/phase-11-match-score-and-data-layer.md`

---

## [Phase 10] — 2026-10-06 · Notifications, navigation & workflow guards

### Added
- **Notification fan-out** (`src/lib/notify.ts`) — best-effort; `notify`,
  `notifyMany`, `notifyUser`, `notifyConnectionParties`.
- **Notification coverage** across admin, disputes, completions, negotiations and
  evidence (previously zero).
- **Evidence document upload** — private `connection-evidence` bucket +
  `GET /api/evidence/[id]` signed-URL redirect.

### Fixed
- **No path reached the progress thread** from the dashboard connections card.
- **Extension after completion** added days to the escrow release timer on a
  finished job.
- **Repeated reviews** — the form stayed visible; a crafted POST could rate any
  member.
- **Evidence "Pending review"** badge — no code path ever set `approved`.

> Phase doc: `jomlink-app/docs/phase-10-notifications-nav-guards.md`

---

## [Phase 9] — 2026-10-05 · Deadline, progress thread & yellow flag

### Added
- **Deadline setting** (§5.6.1) — Linker requests a timestamped task deadline;
  Seeker accepts (task → `IN_PROGRESS`) or rejects (terms reopen).
- **Yellow flag** (§5.6.1) — commitment signal raised when a Linker misses their
  own proposed deadline; does **not** release the reward; cleared on delivery or
  an accepted extension.
- **Progress report thread** (§5.6.2) — Linker posts, both parties comment, edits
  preserve prior versions as update history.
- **Admin evidence of record** — `/admin/disputes/[id]` (deadline record, flags,
  full thread with revisions).
- New tables: `opportunity_deadlines`, `progress_reports`,
  `progress_report_comments`, `progress_report_comment_revisions`, `linker_flags`.

### Fixed
- **Empty Connections tab** — a `SELECTED` proposal could have no `connections`
  row; `selectLinkerAction` made idempotent and recoverable.

> Migration `supabase/phase-09-deadline-progress.sql` (applied).
> Phase doc: `jomlink-app/docs/phase-09-deadline-progress.md`

---

## [2026-10-01] — Seeker opportunity editing

### Added
- `/opportunities/[id]/edit` + `updateOpportunityAction`.
- **Edit-lock rule:** a listing is editable only while its status allows it **and**
  no Linker has submitted a proposal; enforced in the action, the page and the
  button.

---

## [Phases 7 + 8] — 2026-09-24 · Admin/RBAC/disputes + dashboard/wallet/polish

> **MVP feature-complete.** KYC was simplified at this point (admin review only;
> no member document upload).

### Added
- Admin RBAC, disputes, dashboard, wallet (ToyyibPay sandbox), polish.
- **Member-facing KYC submission** — `/dashboard/kyc` + private `kyc-documents`
  bucket + `/admin/kyc` review queue.
- **Admin KYC document preview** — `/api/admin/kyc/[id]/document` (60s signed URL).

---

## [Phases 1–6] — 2026-09-18 · Foundation through connection & trust

### Added
- **Phase 1** — initial migration (26 tables), seed, register/login/logout
  (Supabase Auth + Prisma), `getCurrentUser()` auto-provisioning, route protection
  via `proxy.ts`.
- **Phase 2** — dashboard layout, profile edit, employment history CRUD,
  relationship declarations, business profiles + role toggle, public profile.
- **Phase 3** — opportunity marketplace + matching.
- **Phase 4** — Linker proposals + negotiation.
- **Phase 5** — transactions / escrow.
- **Phase 6** — connection workflow + completion + trust.

---

## [Phase 0 / Plan] — 2026-09-18 · Scaffold & planning

### Added
- Project plan + all phase docs (01–08); Phase 0 scaffold complete.

---

## Outstanding operational items

- ⚠️ **Migration not applied:** `supabase/phase-12-extension-approval.sql` — the
  extension UI errors until it is run.
- ⚠️ **Unresolved data:** stale RM2,200 escrow on an RM1,500 opportunity
  (connection `255a7894-afa2-4474-9c67-123e001746d2`) — needs a product decision.
- ⚠️ **Not scheduled:** `/api/connections/deadline-sweep` exists but no cron calls
  it yet (the in-app banner works without it).
- ⚠️ **Verify:** the `connection-evidence` bucket insert (`jomlink-schema.sql`
  § 6d) — uploads fail until the bucket exists.
