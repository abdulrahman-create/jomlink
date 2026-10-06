# Phase 10 — Notifications, Navigation & Workflow Guards

**Status:** ✅ Done · **Depends on:** Phase 9 ✅ · **Updated:** 2026-10-06

> **Built 2026-10-06.** Event-driven notifications for both parties and admin
> actions, connection navigation fixes, evidence document upload, and guards
> against out-of-state actions. `npm run build` passes.
>
> **Migration required:** the `connection-evidence` storage bucket is declared in
> `supabase/jomlink-schema.sql` (§ 6d). Run that `insert` on any existing
> database, or create the bucket manually with the same settings — uploads fail
> until it exists. No table changes were needed.

---

## Goals

1. **Notify both parties** — the Seeker and the Linker — about every material
   event on their shared connection, whether it originates from the counterparty
   or from an administrator (§9.14).
2. **Make the connection workflow navigable** — every surface that mentions the
   progress thread should reach it, and every page needs a truthful way back.
3. **Let the Linker attach proof** — evidence can carry an uploaded document,
   not just a pasted external URL.
4. **Guard against out-of-state actions** — the UI must not offer an action the
   server would reject, or one that is meaningless at that point in the lifecycle.

---

## Scope

### In scope
- Shared notification helper (`src/lib/notify.ts`) with a both-parties fan-out
- Notifications on **admin** actions: suspend, reinstate, role change, opportunity
  moderation, KYC verdict, relationship verdict
- Notifications on **dispute** lifecycle: raised, status change, resolution
- Notifications on **connection** lifecycle: opened, completed, extension
  requested, failed
- Notifications on **evidence** submission and **negotiation** events
- Notification icon mapping for the new event types
- Evidence **document upload** to a private Supabase storage bucket, served via
  short-lived signed URLs
- Progress thread reachable from the dashboard and the connections list
- Review form hidden once the member has reviewed
- Extension form restricted to connections that are still open

### Out of scope (later)
- Email / SMS / push delivery (schema supports `notification_channel`; no
  delivery worker exists — everything is `IN_APP`)
- Per-type notification preferences / mute
- Admin queue for evidence moderation (see *Evidence has no approver* below)

---

## Bugs found in live testing

### 1. Linker dashboard → "All" → Progress Reports was unreachable

**Symptom.** From the dashboard's *Active Connections* card, clicking a connection
title opened the detail page, and `All` opened the connections list — but neither
led to the progress report thread, which only appeared on the detail page.

**Cause.** Every path to `/dashboard/connections/[id]/progress` funnelled through
the `[id]` detail page. The list page's action button comes from a computed
`nextAction`, which returns the progress href **only** in the `ACCEPTED` deadline
state; all other states returned `null` and fell back to a plain `Open` button.
Compounding it, the `[id]` page's back-link hardcoded `/dashboard` (skipping the
list level entirely) and the progress page's single back-link pointed *deeper*
into the hierarchy ("Back to connection" → `/[id]`).

**Fixes.** A `progressHref` is now computed independently of `nextAction` on the
list page, the dashboard rows route straight to the thread when the deadline is
accepted, and every page has an honest back-link (detail → list, progress → both
detail and list).

### 2. Duplicate "Progress" + "Update progress" buttons

**Symptom.** In the `ACCEPTED` state the list row showed two buttons, both
pointing at the same progress thread.

**Cause.** `nextAction` already returns `/progress` with the label "Update
progress" in that state; the new standalone thread link then duplicated it.

**Fix.** The standalone button is suppressed when the primary action already
targets the same href (`progressHref && next?.href !== progressHref`).

### 3. Linker could self-extend **after** completion

**Symptom.** After the Seeker marked a connection complete, the Linker was
offered "Request extension".

**Cause.** The form was gated on `conn.status === "COMPLETED"` — the inverse of
the intended condition — and `requestExtensionAction` had no status guard. Since
`auto_release_at` **is the escrow release timer**, the extension pushed the
Linker's own payout date further out on a closed job, set
`release_status = "EXTENDED"`, and cleared the missed-commitment flag with the
reason "Extension accepted".

**Fix.** The form renders only for `IN_PROGRESS` / `AWAITING_VERIFICATION`, and
the action rejects `COMPLETED` / `FAILED` / `DISPUTED`. *This was not caused by
closing early — the button was gated on the wrong status.*

### 4. Review form never disappeared

**Symptom.** The review form stayed visible after submitting, so a member could
attempt repeated reviews.

**Cause.** The server rejected duplicates
(`getReviewByAuthorAndOpportunity`), but the UI gated only on
`conn.status === "COMPLETED"` and never checked whether *this* member had already
reviewed. The summary line also loaded `getReviewsForSubject(isSeeker ? user.id :
opp.seeker_id)` — for a Seeker that is the **Seeker's own** reviews, not the
counterparty's, so the rating shown on the page was the wrong person's.

**Fixes.** The page loads `myReview`; the form is replaced by a confirmation once
a review exists. The summary now shows the **counterparty's** reviews. The server
action additionally verifies the reviewer is a party to a `COMPLETED` connection
and that `subjectId` is genuinely the counterparty — previously a crafted POST
could rate any member.

### 5. Evidence badge promised a review that never happens

**Symptom.** Every piece of evidence showed a **"Pending review"** badge,
permanently.

**Cause.** `connection_evidence.approved` defaults to `null`, and **no code path
in the codebase ever sets it**. There is no `evidence:*` permission in
`src/lib/rbac.ts` and no admin evidence queue — admins only *read* evidence when
adjudicating a dispute (`/admin/disputes/[id]`).

**Fix (option 1 — remove the badge).** Evidence is a **record**, not a vetting
queue, per the §9.11 evidence-of-record principle. The three-state badge was
removed and replaced with a one-line explanation that evidence is kept on the
record and reviewed by both parties and an admin if a dispute is raised. The
`approved` column was left in place (an always-`null` column is harmless;
dropping it would be a destructive migration).

---

## What was built

### Shared notification helper

`src/lib/notify.ts` centralises the fan-out so the "notify both sides" rule is
expressed once rather than repeated at ~20 call sites:

| Helper | Purpose |
|--------|---------|
| `notify(input)` | Send one notification |
| `notifyMany(userIds, input)` | De-duplicated multi-recipient send |
| `notifyUser(userId, connectionId, input)` | One recipient, null-safe |
| `notifyConnectionParties(connectionId, input, parties?)` | **Both** parties, actor excluded |
| `getConnectionParties(connectionId)` | Resolve `{ seekerId, linkerId }` |

**All helpers swallow errors and log.** A notification failure must never roll
back the business action that triggered it — this matches the pre-existing inline
`try/catch` convention in `deadlines.ts` / `progress-reports.ts`, but is now
impossible to forget.

`notifications.type` is free-form `text` (not an enum), so new event types need
no migration. Types are prefixed `CONNECTION_*`, `DISPUTE_*`, `ADMIN_*`,
`NEGOTIATION_*`, `EVIDENCE_*` so `iconForType()` can pick the right icon.

### Coverage added (previously silent)

| Source | Events now notified |
|--------|--------------------|
| `actions/admin.ts` | suspend · reinstate · role change · opportunity approve/reject/flag · KYC approve/reject · relationship verify/reject |
| `actions/disputes.ts` | dispute raised (counterparty) · status change (**both**) · resolution (**both**, tailored per side) |
| `actions/completions.ts` | marked complete (payout date) · extension requested · marked failed (**both**) |
| `actions/evidence.ts` | evidence submitted (Seeker) |
| `actions/negotiations.ts` | counter-offer · terms accepted · Linker selected |

**Before this phase, `admin.ts`, `disputes.ts`, `completions.ts`,
`negotiations.ts` and `evidence.ts` created zero notifications.** An admin ruling
that released or refunded escrow reached nobody.

**Deliberate asymmetry.** Dispute resolution tailors the body per recipient, because
the same outcome means opposite things: the Seeker reads *"your escrow has been
refunded in full"*, the Linker reads *"the escrow was refunded to the Seeker, so
no reward is payable"*. The "marked failed" event notifies **both** parties
including the actor — the Linker is flagged and the Seeker's escrow is being
voided, so both need the record.

### Evidence document upload

- **Bucket:** `connection-evidence` — private (`public = false`), 10 MB limit,
  `image/jpeg|png|webp|application/pdf` (declared in `jomlink-schema.sql` § 6d).
- **Storage slot:** the pre-existing but unused `connection_evidence.file_access_key`
  column holds the object **path** (never a public URL).
- **Upload:** `submitEvidenceAction` validates MIME + size **before** any network
  call, uploads via the service-role client, then persists the path. An untouched
  file input still submits a zero-byte `File`, so `size > 0` distinguishes "no
  file chosen" from an error.
- **Path scheme:** `{connectionId}/{type}-{timestamp}-{random}.{ext}` — timestamped
  and randomised so multiple evidence items per connection never collide. (The KYC
  bucket deliberately uses a deterministic per-user path because re-submission
  should overwrite.)
- **Serving:** `GET /api/evidence/[id]` authorises against the connection (Linker
  or Seeker only — the same rule that gates the progress thread) and 302-redirects
  to a **60-second signed URL**. The service-role key never leaves the server.
- **UI:** the "File URL (optional)" text box became a real file picker; each
  evidence row shows "View attachment" (signed URL) or "View link" (legacy
  `file_url`).

### Navigation

| Surface | Now links to the thread |
|---------|------------------------|
| Dashboard row title | Yes, when the deadline is accepted |
| Dashboard action prompt | Yes (was inert text announcing an action) |
| Connections list | Yes — standalone button, or the primary action |
| Connection detail | Yes — "Open the progress report thread", and "View the report history" once closed |
| Detail back-link | `→ /dashboard/connections` (was `/dashboard`) |
| Progress back-links | `→ /[id]` **and** `→ /dashboard/connections` |

### Guards

| Action | Guard |
|--------|-------|
| Extension | UI: `IN_PROGRESS` / `AWAITING_VERIFICATION` only. Server: rejects `COMPLETED` / `FAILED` / `DISPUTED` |
| Review | UI: hidden once reviewed. Server: party check + `COMPLETED` status + `subjectId` must be the counterparty |

---

## Files involved

**New**
- `src/lib/notify.ts` — notification fan-out helpers
- `src/app/api/evidence/[id]/route.ts` — signed-URL viewer for private evidence
- `supabase/jomlink-schema.sql` § 6d — `connection-evidence` bucket

**Modified**
- `src/app/actions/admin.ts` — notifications on all 8 admin actions
- `src/app/actions/disputes.ts` — notifications; `updateDisputeStatusAction` now loads the dispute
- `src/app/actions/completions.ts` — notifications + extension status guard
- `src/app/actions/evidence.ts` — upload + notification
- `src/app/actions/negotiations.ts` — notifications
- `src/app/actions/reviews.ts` — hardened authorisation
- `src/lib/queries.ts` — `getEvidenceById`
- `src/app/dashboard/connections/page.tsx` — `progressHref`, no duplicate button
- `src/app/dashboard/connections/[id]/page.tsx` — back-link, evidence upload UI,
  badge removal, review gating, extension gating
- `src/app/dashboard/connections/[id]/progress/page.tsx` — dual back-links
- `src/app/dashboard/connections/[id]/actions.tsx` — file picker, extension note
- `src/app/dashboard/page.tsx` — rows route to the thread
- `src/app/dashboard/notifications/page.tsx` — icon mapping (`ShieldCheck` for admin events)

---

## Definition of Done

- [x] `npm run build` passes
- [x] Both parties are notified of connection events, whether raised by the counterparty or an admin
- [x] Admin actions (suspend / role / moderation / KYC / relationship) notify the affected member
- [x] Dispute raised, updated and resolved notify the correct parties
- [x] Progress thread reachable in one hop from the dashboard and the connections list
- [x] Every connection page has a truthful back-link
- [x] Linker can attach a document to evidence; both parties can open it
- [x] Evidence attachment is private and served only via a short-lived signed URL
- [x] No action is offered for a state in which the server would reject it
- [x] Review form disappears once the member has reviewed
- [x] Extension is unavailable on a closed connection

---

## Open / follow-up

1. **Extension is still unilateral.** The Linker self-approves an extension, so a
   Linker about to miss a deadline can push their own escrow release date — and
   that also auto-clears their yellow flag (§5.6.1). The extension does nothing to
   constrain the party it is meant to hold accountable. Consider a
   **Linker-requests / Seeker-approves** pair mirroring the deadline flow.
2. **Notification delivery is in-app only.** `notification_channel` supports
   `EMAIL` / `SMS` / `PUSH` but no worker sends them.
3. **No admin evidence queue.** If evidence moderation is actually wanted, add an
   `evidence:write` permission, an `/admin/evidence` page, and a review action.
4. **Bug-found-in-live-testing note.** Four of the five bugs above were invisible
   in code review and only appeared by using the app — the recurring shape being
   *the UI offers a state the backend never reaches, or offers an action at the
   wrong point in the lifecycle*.
