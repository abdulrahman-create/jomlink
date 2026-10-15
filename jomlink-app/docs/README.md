# Jomlink — Build Documentation

Phased build plan for the Jomlink business-introductions marketplace.

| Document | Purpose |
|----------|---------|
| `PROJECT-TRACKING.md` | **Start here** — status board, outstanding migrations, gaps, conventions |
| `../../CHANGELOG.md` | Reverse-chronological record of **what happened when** (repo root) |
| `00-project-plan.md` | Master plan, decisions, road map, current status |
| `phase-01-auth.md` | DB migration + registration/login flow |
| `phase-02-profile.md` | Member profile + relationship declarations |
| `phase-03-marketplace.md` | Opportunity marketplace + matching |
| `phase-04-proposals.md` | Linker proposals + negotiation |
| `phase-05-transactions.md` | Transactions / escrow |
| `phase-06-connection.md` | Connection workflow + trust |
| `phase-07-admin.md` | Admin / RBAC + disputes |
| `phase-08-dashboard.md` | Dashboard + wallet + polish |
| `phase-09-deadline-progress.md` | Deadline setting + progress report thread + yellow flag |
| `phase-10-notifications-nav-guards.md` | Both-party notifications, navigation fixes, evidence upload, workflow guards |
| `phase-11-match-score-and-data-layer.md` | Match score rewrite, relationship save fix, `jomlink` schema routing |
| `phase-12-lifecycle-guards-and-money-path.md` | Centralised lifecycle state machine, notification deep-links, Linker negotiation UI, escrow/affordability fixes |
| `phase-13-appointments-and-deadline-warnings.md` | Appointment notifications + track records, rejection recovery, connection-list link, running-out-of-time deadline warnings |
| `phase-14-verification-gated-release.md` | **Built** — verification-gated escrow release: Seeker confirms, platform verifies, only the platform releases (⚠️ migration not applied) |
| `phase-15-compliance-hardening.md` | **Planned** — category deny-list, AML/KYC-before-payout, biometric purge job (closes legal loopholes) |
| `legal-compliance-gaps.md` | **Legal gaps checklist** — loopholes vs Malaysian law, for counsel review |

## How to use

We build **one phase at a time**. Before starting a phase, read its doc.
When a phase's *Definition of Done* is met, mark it complete in
`00-project-plan.md` and move to the next.

> **Post-phase refinements** land as dated *Update* sections inside the relevant
> phase doc (and a `CHANGELOG.md` entry) rather than new phase numbers. Recent
> ones: **2026-10-12** — optional proposal reward (`phase-04-proposals.md`),
> escrow payout visibility + bank withdrawal requests (`phase-05-transactions.md`,
> `phase-08-dashboard.md`, `phase-07-admin.md`).

> Source of truth for the product: `../JOMLINK PLATFORM BLUEPRINT v1.md`
> (kept at the workspace root).