# KYC Biometric Data Collection (face + ID)

**Status:** ✅ Implemented (data-collection pipeline) · No automated matching yet
**Related:** `docs/phase-07-admin.md` (KYC), blueprint §2.9 (KYC & identity verification)

---

## Why this exists

Jomlink's identity verification (KYC) is **manual today** — an admin reviews an
uploaded ID document in `/admin/kyc` and approves or rejects it.

To move to **automated, instant verification** later (a face-match: "does this
selfie belong to this ID document?"), we need a **labelled dataset** of real
face + ID pairs. This system captures that dataset now, with the member's
explicit consent, so an in-house model can be trained when volume is sufficient.

> **This is data collection only.** No face recognition or matching runs in
> production. The captures are stored, labelled by admins, and held for training.

---

## What is collected

Per consented capture (`jomlink.kyc_biometrics` row):

| Field | Meaning |
| --- | --- |
| `selfie_path` | Path of the live face photo in the **private** `kyc-biometrics` bucket |
| `id_document_path` | Path of the ID-document photo in the same private bucket |
| `face_width` / `face_height` | Detected face bounding box (px), if the detector ran |
| `face_confidence` | Client detector confidence (0–100) — a **quality hint**, not a decision |
| `liveness_passed` | Client-side liveness heuristic result (MVP-level only) |
| `capture_device` | User-agent string (bounded to 250 chars) |
| `capture_source` | `WEB_CAMERA` (default) |
| `consent_version` / `consented_at` | Which consent wording was agreed to, and when |
| `label_status` | Training label: `UNLABELLED` \| `MATCH` \| `NO_MATCH` \| `UNUSABLE` |
| `labelled_by` / `labelled_at` | Which admin labelled it, and when |
| `purge_requested_at` | Set when the member withdraws consent (retention job deletes) |

Consent itself is recorded on the member row
(`users.biometric_consent`, `biometric_consent_at`, `biometric_consent_version`).

---

## How it works

### Member side — `/dashboard/kyc`
`src/app/dashboard/kyc/biometric-form.tsx` (client component):

1. **Camera** — `navigator.mediaDevices.getUserMedia` shows a live preview. The
   raw video **never leaves the device**; only a captured still is uploaded.
2. **Face check** — best-effort client-side detection. Uses the experimental
   `FaceDetector` API where available (Chromium); otherwise a brightness
   heuristic. Records the face box + confidence as metadata. **Not a decision.**
3. **ID photo** — the member photographs/uploads the ID document page.
4. **Consent** — an explicit checkbox is required; the submit button is disabled
   until both images exist and consent is ticked.
5. **Submit** — `submitKycBiometricAction` (`src/app/actions/kyc.ts`) uploads both
   images to the private bucket and writes a `kyc_biometrics` row.

**Member data controls** (same page):
- **Withdraw consent** — `withdrawBiometricConsentAction`: sets
  `users.biometric_consent = false` and stamps `purge_requested_at` on all rows.
- **Delete my biometric data** — `wipeBiometricDataAction`: hard-deletes the
  storage objects and the rows (right-to-erasure), and resets consent.

### Admin side — `/admin/kyc?tab=biometrics`
- Lists captures with the member, quality metadata, and current label.
- **View face / ID** via `/api/admin/kyc/biometrics/[id]` — an admin-guarded
  route (`kyc:read`) that mints a **60-second signed URL** for the private
  object and redirects. Images are never public.
- **Label** each capture: `MATCH` / `NO_MATCH` / `UNUSABLE` via
  `labelBiometricAction` (writes label + `labelled_by`/`labelled_at`, and an
  audit-log entry).
- Dataset stats tile: total / unlabelled / match / no-match+unusable.

---

## Privacy & compliance guardrails

- **Private storage only.** Bucket `kyc-biometrics` is `public = false`. Objects
  are addressed by path; access is only via short-lived signed URLs gated on
  `kyc:read`. No public URLs are ever produced.
- **Explicit, versioned consent.** Consent is captured with a version string
  (`BIOMETRIC_CONSENT_VERSION`) so we know which wording each member agreed to.
- **Purpose limitation.** Data is used only for identity verification and
  training Jomlink's own verification model. It is never sold or shared.
- **Right to erasure.** Members can withdraw consent and hard-delete their data.
- **Minimisation.** Only the two images needed (face + ID) and lightweight
  capture metadata are stored; raw video is discarded on-device.
- **PDPA alignment.** Under Malaysia's PDPA 2010 (and equivalent laws as Jomlink
  expands), biometric images are sensitive personal data. Obtain legal sign-off
  on the consent wording and retention period before scaling collection.
- **Retention.** `purge_requested_at` marks rows for deletion. A scheduled
  retention job (not yet implemented) must delete the storage objects + rows
  for those captures. Add it before volume grows.

> ⚠️ **Before launching collection beyond a pilot:** review the consent copy with
> legal, publish a biometric-data notice in the privacy policy, and implement the
> retention/purge job. Consult `docs/phase-07-admin.md`.

---

## Roadmap to an automated verifier

1. **Collect** (now) — consented face + ID pairs, admin-labelled.
2. **Curate** — build a training/eval split from `MATCH` vs `NO_MATCH`; drop
   `UNUSABLE`. Enforce a minimum per-identity count to avoid leakage.
3. **Train** — a face-embedding model + a match threshold (in-house or an
   open-source backbone fine-tuned on the curated set).
4. **Evaluate** — measure FAR/FRR on a held-out set; require a high-confidence
   band before automating any decision.
5. **Deploy** — automate only the **clear `MATCH`** cases; route the ambiguous
   band to manual admin review. Never auto-reject on a low-confidence signal.
6. **Monitor** — track drift, false accepts, and appeals; keep a manual override.

---

## Files

| File | Role |
| --- | --- |
| `supabase/jomlink-schema.sql` | `kyc_biometrics` table, `users` consent cols, `kyc-biometrics` bucket |
| `src/lib/jomlink-types.ts` | `KycBiometricRow`, `BiometricLabelStatus`, consent fields on `JomlinkUserRow` |
| `src/lib/queries.ts` | `createKycBiometric`, `getKycBiometricsByUser`, `listKycBiometrics`, `labelKycBiometric`, `getBiometricDatasetStats`, `setBiometricConsent` |
| `src/app/actions/kyc.ts` | `submitKycBiometricAction`, `withdrawBiometricConsentAction`, `wipeBiometricDataAction` |
| `src/app/dashboard/kyc/biometric-form.tsx` | Member capture UI (camera + ID + consent) |
| `src/app/admin/kyc/page.tsx` | Admin biometric dataset queue + tabs |
| `src/app/admin/kyc/label-biometric-form.tsx` | Admin labelling control |
| `src/app/actions/admin.ts` | `labelBiometricAction` |
| `src/app/api/admin/kyc/biometrics/[id]/route.ts` | Admin signed-URL access to captures |

## Setup

Re-run `supabase/jomlink-schema.sql` in the Supabase SQL editor, then restart the
Supabase container so PostgREST picks up:
- the new `kyc_biometrics` table,
- the new `users.biometric_consent*` columns,
- the `kyc-biometrics` storage bucket.
