import type { OpportunityRow, MemberProfileRow, RelationshipRow } from "@/lib/jomlink-types";

/**
 * Jomlink Rule-Based Match Scoring
 *
 * Produces an integer 0–100 "relevance" score between a Linker (their profile,
 * relationships and reputation) and an Opportunity the Seeker posted.
 *
 * IMPORTANT: The score is a signal, NOT a guarantee of access. Per blueprint
 * §3–4 the true 'fit' is confirmed by the Linker's actual relationship to the
 * target entity; this heuristic only surfaces likely candidates.
 */

export interface MatchInput {
  opportunity: Pick<
    OpportunityRow,
    | "category"
    | "target_entity"
    | "target_role"
    | "geographic_preference"
    | "is_restricted_category"
  >;
  profile: Partial<
    Pick<
      MemberProfileRow,
      | "industry"
      | "country"
      | "current_organisation"
      | "current_position"
    >
  > | null;
  relationships: RelationshipRow[];
  /** Reputation bonus if the Linker has a verified badge. */
  verifiedBadge?: boolean | null;
  yearsOfExperience?: number | null;
}

export const MATCH_CAP = 100;

/**
 * Normalise text for case/whitespace-insensitive substring checks.
 */
function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Compute a 0–100 match score.
 *
 * Heuristic (weights sum ≤ 100):
 *   • Entity / organisation overlap        → up to 40
 *   • Category relevance                   → up to 20
 *   • Target-role keyword overlap          → up to 15
 *   • Geographic preference                → up to 10
 *   • Reputation (verified badge, exp.)    → up to 10
 *   • Relationship degree bonus            → up to 5
 */
export function computeMatchScore(input: MatchInput): number {
  const { opportunity, profile, relationships, verifiedBadge, yearsOfExperience } = input;
  let score = 0;

  // 1) Entity / organisation overlap (heaviest signal).
  const target = norm(opportunity.target_entity);
  const org = norm(profile?.current_organisation);
  if (target && org && (target.includes(org) || org.includes(target))) {
    score += 25; // same/near-same employer
  }
  // Also reward declared relationships that mention the target entity.
  const relMatch = relationships.filter((r) => {
    const name = norm(r.entity_name);
    return target && name && (name.includes(target) || target.includes(name));
  });
  if (relMatch.length > 0) {
    // + up to 15 based on the best relationship degree.
    const bestDegree = Math.min(...relMatch.map((r) => degreeRank(r.connection_degree)));
    score += bestDegree <= 1 ? 15 : bestDegree <= 2 ? 10 : 5;
  }

  // 2) Category relevance.
  const cat = norm(opportunity.category);
  const industry = norm(profile?.industry);
  if (cat && industry) {
    // Hitting the exact category label is a 20, otherwise a loose match on
    // the linking industry keyword.
    const labels: Record<string, string> = {
      GOVERNMENT_PUBLIC_SECTOR: "government|public sector|ministry|public sector",
      INVESTOR_CONNECTION: "investor|finance|private equity|vc|venture",
      BUSINESS_INTRODUCTION: "business|corporate|enterprise",
      STRATEGIC_PARTNER: "partnership|strategy|alliance",
    };
    const pattern = labels[opportunity.category] ?? "";
    if (industry) {
      const industry2 = norm(industry) || "";
      if (industry2 && (cat.includes(industry2) || industry2.includes(cat))) score += 20;
      else if (pattern && new RegExp(pattern).test(industry2)) score += 15;
      else if (cat === "OTHER") score += 12; // neutral default
      else score += 8;
    } else {
      score += 5;
    }
  } else {
    score += 8; // neutral
  }

  // 3) Target-role keyword overlap.
  const role = norm(opportunity.target_role);
  const pos = norm(profile?.current_position);
  if (role && pos) {
    const roleWords = role.split(/\s+/).filter(Boolean);
    const matched = roleWords.filter((w) => pos.includes(w) || w === pos).length;
    if (matched > 0) score += Math.min(15, matched * 5);
  }

  // 4) Geographic preference.
  const geo = norm(opportunity.geographic_preference);
  const country = norm(profile?.country);
  if (geo && country && (geo.includes(country) || country.includes(geo))) {
    score += 10;
  }

  // 5) Reputation.
  if (verifiedBadge) score += 5;
  if (yearsOfExperience && yearsOfExperience >= 10) score += 3;
  else if (yearsOfExperience && yearsOfExperience >= 5) score += 2;

  // 6) Relationship degree bonus (extra for first-degree).
  if (relMatch.length > 0) {
    const bestDegree = Math.min(...relMatch.map((r) => degreeRank(r.connection_degree)));
    if (bestDegree <= 1) score += 5;
    else if (bestDegree <= 2) score += 3;
  }

  return Math.max(0, Math.min(MATCH_CAP, Math.round(score)));
}

/** Convert degree enum to a numeric rank (FIRST=1, SECOND=2, THIRD=3+). */
function degreeRank(degree: string | null | undefined): number {
  switch ((degree ?? "").toUpperCase()) {
    case "FIRST":
      return 1;
    case "SECOND":
      return 2;
    default:
      return 3;
  }
}

/** Human-friendly label for a score band. */
export function matchLabel(score: number | null | undefined): string {
  const s = score ?? 0;
  if (s >= 80) return "Strong match";
  if (s >= 50) return "Good match";
  if (s >= 25) return "Possible match";
  return "Low match";
}