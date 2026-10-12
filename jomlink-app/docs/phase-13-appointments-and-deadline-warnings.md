# Phase 13 — Appointment Notifications, Rejection Recovery, Track Records & Deadline Warnings

**Status:** ✅ Done · **Depends on:** Phase 5.6.1 (deadline/flag), Phase 6 (connection/appointment), Phase 9 (deadline + progress), Phase 10 (notifications), Phase 12 (lifecycle guards) · **Updated:** 2026-10-12

> **Built 2026-10-12.** A UX + evidence pass driven by live-testing feedback:
> appointment proposals were silently invisible to the Seeker, a rejected
> appointment left both parties with no way forward, the appointment history was
> not retained as a visible track record, the Connections tab had no direct link
> to a connection's detail page, and nothing warned the parties *before* a
> deadline passed while work was still incomplete.
>
> `npx tsc --noEmit` passes · `npm test` **67 passing** (5 files).
>
> **No migration required.** Every change is application code; notifications reuse
> the free-text `notifications.type` column (no enum), so new event types need no
> DDL.

---

## Goals

1. **Tell the Seeker when the Linker proposes an appointment** — they were never
   notified, so an appointment sat invisibly on the workspace.
2. **Make enough contrast** for notifications to actually be noticed.
3. **Let an appointment survive a rejection.** A rejected slot used to deadlock the
   connection — neither side could propose a new date.
4. **Retain an appointment track record** — evidence-bearing, for disputes and proof
   of delivery, visible to the parties *and* to the admin dispute reviewer.
5. **Give the Connections tab a direct route** to each connection's detail page.
6. **Warn before the deadline, not only after.** Alert both parties when an open
   connection is running out of time and the work is not complete.

---

## Changes

### 1. Appointment proposal notified nobody (Seeker side)

**Symptom.** Reported as *"seeker dint get notification on appointment date from
linker. it should popup so seeker will notice it"*.

`proposeAppointmentAction` (`src/app/actions/appointments.ts`) persisted the
appointment row and called `revalidatePath(...)`. Like the Phase 12 proposal bug,
`revalidatePath` only refreshes the client — it does not write a notification row,
and the action never imported `@/lib/notify`.

**Fix.** `notifyUser(opp.seeker_id, conn.id, { type: "APPOINTMENT_PROPOSED", ... })`
after the appointment is created, carrying the date/location and `connectionId`.

Companion changes so the notification is actionable:

- `src/lib/notification-links.ts` — `APPOINTMENT_*` now routes to
  `/dashboard/connections/{connectionId}`.
- `src/app/dashboard/notifications/page.tsx` — `APPOINTMENT*` maps to the
  `Handshake` icon (was falling through to the generic `Info` icon).
- `src/lib/notification-links.test.ts` — `APPOINTMENT_PROPOSED`,
  `APPOINTMENT_ACKNOWLEDGED`, `APPOINTMENT_REJECTED` added to the
  "connection-scoped events route to the workspace" case.

### 2. High-contrast notification styling

**Symptom.** Reported as *"make notification more pop out to user, change it color
to more contrast so user can notice it"*.

The dashboard "you have unread notifications" nudge used a faint `primary-soft/40`
background that blended into the page.

**Fix** (`src/app/dashboard/page.tsx`):

- Solid carmine (`bg-primary`) card with **white text** (≈8:1 contrast), drop
  shadow + ring glow.
- A **pulsing white dot** and the unread count in a **white pill badge**.
- White-on-carmine "View notifications" button.

`src/app/dashboard/notifications/page.tsx`:

- Unread rows get a **4px solid carmine left border** + tinted background +
  shadow; hover strengthens both.
- The **"New" badge** is now solid carmine, bold, uppercase (was the subtle
  default).

> Accessibility note: the pulsing dot uses Tailwind's `animate-ping`. A
> `motion-reduce:` guard is a reasonable follow-up (tracked in *Follow-ups*).

### 3. A rejected appointment deadlocked the connection

**Symptom.** Reported as *"appointment got a problem if seeker reject it. both
party can set a new or suggest new date"*.

When the Seeker rejected an appointment, the rejected row became the
`latestAppointment`. The Seeker's acknowledge/reject controls only render for
`PROPOSED`; the Linker's propose form only rendered when there was **no**
appointment at all. Result: after a rejection, **neither party had any action**.

**Fix — iteration 1 (both parties).** `proposeAppointmentAction` was widened so
either party could propose, with a guard against stacking proposals while one is
still `PROPOSED`, and the UI grew a "Propose new date" form for a `REJECTED`
slot.

**Fix — iteration 2 (Linker-only, per review).** The product owner clarified that
**only the Linker** should propose. Final behaviour:

- `proposeAppointmentAction` again requires `conn.linker_id === user.id`
  ("Only the Linker can propose an appointment").
- Kept: re-propose **after a rejection** (never deadlocks), and the
  **no-stacked-proposals** guard (one slot must be decided before another).
- The `REJECTED`-state re-propose form now renders **only for the Linker**
  (`isLinker && status === "REJECTED"`).
- The Seeker's role stays acknowledge/reject.
- `ProposeAppointment` gained a `submitLabel` prop so the re-propose button reads
  "Propose new date".

### 4. Appointment track record (evidence of record)

**Symptom.** Reported as *"make this section had track record? it very importance
for dispute and proff"*.

The connection page showed only `latestAppointment`; the full history was fetched
but never rendered.

**Fix** (`src/app/dashboard/connections/[id]/page.tsx`): a new **"Appointment track
record"** list below the current slot — every proposed slot, newest first, with
date · method · location, a colour-coded status badge, and the **proposed-on**
timestamp.

### 5. Admin can see the appointment record in a dispute

**Symptom.** Requested follow-up: *"when dispute is raise, make sure admin can see
all track record transaction."*

**Fix — data layer** (`src/lib/queries.ts`): `getEvidenceOfRecord()` now also
returns `appointments` (via `getAppointmentsByConnection`) alongside the deadline,
progress reports, comment revisions, and flags.

**Fix — UI** (`src/app/admin/disputes/[id]/page.tsx`): an **"Appointments: N"**
summary badge, plus an **"Appointment Record"** card listing every slot with
date · method · location · target · remarks, a status badge, and
**Proposed / Last updated** timestamps — the schedule-of-record for the dispute.

### 6. Connections tab had no direct link to the connection

**Symptom.** Reported as *"there is no direct click to open connection detail. in
connection tab, it only had view progress"*.

Each row's action button was driven by `nextAction`, which often points at the
**progress thread**; the direct "Open" link only appeared when there was no next
action at all.

**Fix** (`src/app/dashboard/connections/page.tsx`): an always-present **"Open
connection"** button (`→ /dashboard/connections/{id}`, Handshake icon) on every
row, alongside the contextual next-action button and the Progress link. Removed
the redundant conditional "Open" fallback.

### 7. Running-out-of-time warnings (§5.6.1 / §5.14)

**Symptom.** Requested: *"if connection is running out of time and all progress
still not complete, make it warn related parties, so they will be alerted."*

The yellow flag is raised only **after** a deadline is missed — too late to act.
Added a proactive warning layer.

**New file — `src/lib/deadline-warnings.ts`:**

- `daysUntil(date, now)` — whole days to a date (negative once past).
- `deadlineProximity(deadline, now)` — pure predicate → `NONE` / `SOON` (≤3 days) /
  `URGENT` (≤1 day) / `OVERDUE`. Constants `WARN_WINDOW_DAYS = 3`,
  `URGENT_WINDOW_DAYS = 1`.
- `warnDeadlineApproaching({ connectionId, deadline?, proximity? })` — notifies
  **both parties** via `notifyConnectionParties` with type
  `DEADLINE_APPROACHING`. Only fires when the connection is **still open** and
  **no progress report is marked `COMPLETE`**.

**New query — `src/lib/queries.ts`:** `listDeadlinesApproaching(withinDays = 3)` —
accepted deadlines in the future within the window (the existing
`listOverdueAcceptedDeadlines` only looked at *past* ones).

**New cron-ready route — `src/app/api/connections/deadline-sweep/route.ts`:** mirrors
the payments reconcile pattern (same `x-reconcile-secret` auth; open in dev).
Sweeps approaching deadlines, **de-duplicates one warning per connection per
level**, returns `{ ok, checked, warned, skipped }`.

```
curl -H "x-reconcile-secret: $RECONCILE_SECRET" \
     https://app/api/connections/deadline-sweep
```

**In-app banner** (`src/app/dashboard/connections/[id]/page.tsx`): when the
connection is open, the deadline is SOON/URGENT, and work is not complete, a
prominent banner appears above the deadline card:

- **URGENT** → destructive (red): *"Connection running out of time — deadline is
  nearly up"*.
- **SOON** → warning (amber): *"Connection running out of time"*.
- States how long is left and what to do (deliver, post progress, or request an
  extension).

**Notification presentation:** `DEADLINE_APPROACHING` maps to an
`AlertTriangle`/warning tone on the notifications page (was the generic
Handshake), and routes to the connection workspace via the existing `DEADLINE_`
prefix rule.

**Tests — `src/lib/deadline-warnings.test.ts`:** 7 cases covering `daysUntil` and
every `deadlineProximity` branch. The suite is now **67 tests across 5 files**.

---

## Files touched

| File | Change |
|------|--------|
| `src/app/actions/appointments.ts` | Notify Seeker on propose; Linker-only with no-stack + re-propose-after-rejection; notify Linker on acknowledge/reject |
| `src/lib/notification-links.ts` | Route `APPOINTMENT_*` to the connection workspace |
| `src/lib/notification-links.test.ts` | Appointment routing cases |
| `src/app/dashboard/notifications/page.tsx` | High-contrast unread rows + "New" badge; `APPOINTMENT`/`DEADLINE_APPROACHING` icons |
| `src/app/dashboard/page.tsx` | High-contrast pulsing unread-notifications nudge |
| `src/app/dashboard/connections/[id]/page.tsx` | Linker-only re-propose; appointment track record; running-out-of-time banner |
| `src/app/dashboard/connections/[id]/actions.tsx` | `ProposeAppointment.submitLabel` prop |
| `src/app/dashboard/connections/page.tsx` | Always-present "Open connection" button |
| `src/lib/queries.ts` | `listDeadlinesApproaching`; `getEvidenceOfRecord` now returns `appointments` |
| `src/lib/deadline-warnings.ts` | **New** — proximity predicate + both-party warning |
| `src/lib/deadline-warnings.test.ts` | **New** — 7 tests |
| `src/app/api/connections/deadline-sweep/route.ts` | **New** — cron-ready deadline-warning sweep |
| `src/app/admin/disputes/[id]/page.tsx` | Appointment Record card + summary badge |

---

## Definition of Done

- [x] Seeker is notified when the Linker proposes an appointment, and the
      notification deep-links to the connection.
- [x] Unread notifications are visually high-contrast and obvious.
- [x] A rejected appointment no longer deadlocks — the Linker can propose a new
      date.
- [x] Appointment track record is visible to both parties on the connection page.
- [x] Admin dispute review shows the full appointment record.
- [x] Connections tab has a direct "Open connection" link on every row.
- [x] Both parties are warned before a deadline passes while work is incomplete
      (in-app banner + notification), with a cron-ready sweep.
- [x] `npx tsc --noEmit` clean · `npm test` 67 passing.

---

## Follow-ups (not done in this phase)

- **`motion-reduce` guard** on the pulsing unread dot for reduced-motion users.
- **Wire the deadline-sweep route into a schedule** (Vercel cron / system cron).
  The route exists and is idempotent per connection per level, but nothing calls
  it yet.
- **Warning de-duplication is cadence-based**, not persisted. A warning is emitted
  once per connection per level per *run*; the intended cadence is a once-daily
  cron. If the sweep is run more often, consider persisting a
  `deadline_warnings(connection_id, level, sent_at)` marker for true idempotency.
- **Extension shortcut in the warning banner** — one-click request for the Linker
  directly from the running-out-of-time banner.
- **Deferred cron/runtime note:** the sweep resolves parties and progress inside
  `warnDeadlineApproaching`; on a very large connection volume this would want a
  bulk query, but for pilot scale the per-deadline loop matches the payments
  reconcile pattern.

---

## Recurring bug patterns (see PROJECT-TRACKING.md)

This phase is a **third instance of Shape 1** — *the UI offers (or hides) what the
backend never reaches*:

| Instance | UI showed | Reality |
|----------|-----------|---------|
| Appointment proposed | Nothing for the Seeker | Action never wrote a notification (same class as the Phase 12 proposal bug) |
| Appointment rejected | No action for either party | Rejected slot became "latest"; propose form gated on *no* appointment |
| Connections row | Only "View progress" | "Open connection" rendered only when `nextAction` was null |

It also adds a **proactive counterpart to the yellow flag**: the flag is
*reactive* (raised after a miss); the deadline-warning layer is *preventive*
(fires before the miss, while both parties can still act).
