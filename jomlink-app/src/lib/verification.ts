/**
 * Completion risk scoring + verification core (Phase 14, blueprint §5.12.1).
 *
 * Pure and dependency-free so it is unit-testable and shareable between the
 * platform verification action, the automated sweep, and any future admin
 * review surface — mirroring `src/lib/release.ts` (a plain module, NOT a
 * `"use server"` file, so it never becomes its own action endpoint).
 *
 * The rule it enforces: the Seeker *confirms* completion, but the platform
 * *verifies* it. Every completion is scored; HIGH risk is held for manual
 * review, LOW/MEDIUM are released. The score is metadata-based (evidence
 * counts, progress reports, first-time pairs, timing) — no content analysis.
 */

export interface VerificationInput {
  connectionId: string;
  /** Number of evidence items the Linker attached to the connection. */
  evidenceCount: number;
  /** Did the (meeting-type) opportunity carry a target acknowledgement? */
  hasTargetAcknowledgement: boolean;
  /** How many progress reports were filed during delivery. */
  progressReportCount: number;
  /** Is this the Linker's first completed engagement? */
  linkerIsFirstTime: boolean;
  /** Is this the Seeker's first completed engagement? */
  seekerIsFirstTime: boolean;
  /** Hours between the accepted deadline and the evidence submission. */
  hoursSinceDeadlineAccepted: number;
  /**
   * Is the opportunity a meeting-type engagement, where target acknowledgement
   * is the strongest anti-collusion signal? (Default false.)
   */
  isMeetingType?: boolean;
  /**
   * Minimum hours after the accepted deadline before evidence is considered
   * "instant" (a collusion signal). Defaults to 24.
   */
  minHoursAfterDeadline?: number;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface VerificationResult {
  riskLevel: RiskLevel;
  riskScore: number;
  reasons: string[];
}

/**
 * Score a completion. Higher score = riskier. The score is a bounded integer
 * (0–100) so it survives a round-trip through the `risk_score` integer column.
 *
 * Rules (blueprint §5.12.1):
 *   HIGH  — evidence submitted < minHoursAfterDeadline hours after the deadline
 *           was accepted, OR a first-time Linker AND a first-time Seeker,
 *           OR zero progress reports, OR a meeting-type opportunity with no
 *           target acknowledgement.
 *   MEDIUM — a single weaker signal (e.g. thin evidence).
 *   LOW   — otherwise.
 */
export function scoreCompletionRisk(
  input: VerificationInput
): VerificationResult {
  const minHours = input.minHoursAfterDeadline ?? 24;
  const reasons: string[] = [];

  let score = 0;
  let high = false;

  // ── HIGH-signal conditions ──────────────────────────────────────────────
  const instantEvidence =
    input.hoursSinceDeadlineAccepted >= 0 &&
    input.hoursSinceDeadlineAccepted < minHours;
  if (instantEvidence) {
    high = true;
    score += 40;
    reasons.push(
      `Evidence submitted only ${Math.max(
        0,
        Math.round(input.hoursSinceDeadlineAccepted)
      )}h after deadline acceptance (minimum ${minHours}h).`
    );
  }

  const bothFirstTime = input.linkerIsFirstTime && input.seekerIsFirstTime;
  if (bothFirstTime) {
    high = true;
    score += 30;
    reasons.push("Both parties are completing their first engagement.");
  }

  if (input.progressReportCount <= 0) {
    high = true;
    score += 20;
    reasons.push("No progress reports were filed during delivery.");
  }

  const meetingWithoutAck = !!input.isMeetingType && !input.hasTargetAcknowledgement;
  if (meetingWithoutAck) {
    high = true;
    score += 30;
    reasons.push("Meeting-type opportunity with no target acknowledgement.");
  }

  // ── MEDIUM-signal conditions ────────────────────────────────────────────
  if (input.evidenceCount <= 1) {
    // Thin evidence is only a weak signal on its own — it is the ordinary case
    // for a clean, single-item completion.
    score += 10;
    reasons.push(
      input.evidenceCount === 0
        ? "No evidence items were submitted."
        : "Only a single evidence item was submitted."
    );
  } else if (input.evidenceCount === 2) {
    score += 5;
  }

  // ── Derive the level ────────────────────────────────────────────────────
  let riskLevel: RiskLevel;
  if (high || score >= 50) {
    riskLevel = "HIGH";
  } else if (score >= 10) {
    // Any weaker signal on its own (thin evidence) is enough to mark MEDIUM.
    riskLevel = "MEDIUM";
  } else {
    riskLevel = "LOW";
  }

  if (reasons.length === 0) {
    reasons.push("No risk signals detected.");
  }

  return {
    riskLevel,
    riskScore: Math.min(100, score),
    reasons,
  };
}

/** Is this risk level one that must be held for manual review before release? */
export function isHighRisk(riskLevel: RiskLevel): boolean {
  return riskLevel === "HIGH";
}
