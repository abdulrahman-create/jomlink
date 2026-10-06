import type {
  OpportunityRow,
  MemberProfileRow,
  RelationshipRow,
  EmploymentRow,
} from "@/lib/jomlink-types";

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
    | "target_role_exact"
    | "geographic_preference"
    | "is_restricted_category"
  >;
  profile: Partial<
    Pick<
      MemberProfileRow,
      | "industry"
      | "country"
      | "city"
      | "current_organisation"
      | "current_position"
    >
  > | null;
  relationships: RelationshipRow[];
  /** Prior roles, used to credit experience at the target entity. */
  employment?: EmploymentRow[];
  /** Reputation bonus if the Linker has a verified badge. */
  verifiedBadge?: boolean | null;
  yearsOfExperience?: number | null;
}

/** Weight ceilings per signal. Exported so the UI and tests can reason about them. */
export const MATCH_WEIGHTS = {
  /** Linker works at / has worked at the target entity (strongest signal). */
  directEmployment: 25,
  /** Same employer as the target entity via current_organisation. */
  currentOrganisation: 15,
  /** A declared relationship names the target entity. */
  relationship: 15,
  /** Relationship naming the exact target role, not just the org. */
  relationshipRole: 5,
  category: 20,
  role: 15,
  geography: 10,
  reputation: 8,
  degreeBonus: 5,
} as const;

export const MATCH_CAP = 100;

/**
 * Category → industry keywords. Used when the Linker's free-text `industry`
 * does not literally contain the category enum value — which it never does,
 * because the enum is SCREAMING_SNAKE and the industry is prose.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  BUSINESS_INTRODUCTION: ["business", "corporate", "enterprise", "commerce", "trade"],
  EXECUTIVE_MEETING: ["executive", "management", "leadership", "c-suite", "decision"],
  INVESTOR_CONNECTION: [
    "investor", "finance", "financial", "private equity", "vc", "venture",
    "capital", "banking", "fund",
  ],
  CUSTOMER_CLIENT_CONNECTION: ["customer", "client", "sales", "retail", "consumer", "account"],
  SUPPLIER_CONNECTION: ["supplier", "procurement", "sourcing", "vendor", "logistics", "supply chain"],
  DISTRIBUTOR_AGENT_CONNECTION: ["distributor", "agent", "channel", "wholesale", "dealer", "franchise"],
  STRATEGIC_PARTNER: ["partnership", "partner", "strategy", "strategic", "alliance", "collaboration"],
  GOVERNMENT_PUBLIC_SECTOR: [
    "government", "public sector", "ministry", "agency", "regulator",
    "municipal", "civil service",
  ],
  PROFESSIONAL_EXPERT: [
    "consulting", "consultant", "advisory", "professional services",
    "legal", "accounting", "expert",
  ],
  SITE_VISIT_ACCESS: [
    "site", "operations", "facilities", "industrial", "manufacturing",
    "property", "construction",
  ],
  OTHER: [],
};

/** Relationship categories that imply a direct, warm introduction. */
const STRONG_RELATIONSHIP_CATEGORIES = new Set([
  "CURRENT_EMPLOYEE",
  "FORMER_EMPLOYEE",
  "BUSINESS_PARTNER",
  "CLIENT",
  "FORMER_CLIENT",
  "INVESTOR",
  "ADVISOR",
]);

/** Generic words that should never drive an entity or role match. */
const STOPWORDS = new Set([
  "the", "and", "of", "for", "a", "an", "to", "in", "at", "on", "with",
  "bhd", "sdn", "ltd", "limited", "inc", "llc", "plc", "pte", "co", "corp",
  "corporation", "company", "group", "holdings", "berhad", "sendirian",
  "senior", "junior", "lead", "head", "chief", "officer", "manager",
  "director", "executive", "assistant", "associate", "specialist",
  "division", "department", "team", "unit",
]);

/**
 * Normalise text for case/whitespace-insensitive checks. Strips punctuation so
 * "Maybank Berhad." and "maybank berhad" compare equal.
 */
function norm(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Significant tokens only — drops stopwords, generic suffixes and 1-char noise. */
function tokens(s: string | null | undefined): string[] {
  return norm(s)
    .split(" ")
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Cheap singular/plural fold so "banks" matches "bank". */
function fold(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

/**
 * Do two entity names refer to the same organisation?
 *
 * Exact containment is checked first; otherwise every significant token of the
 * shorter name must appear in the longer one. This catches "Maybank" ⊆
 * "Maybank Investment Bank" without letting a single coincidental shared word
 * ("Malaysia Airlines" vs "Malaysia Pacific") count as a match.
 */
export function entityNamesMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;

  const ta = tokens(na).map(fold);
  const tb = tokens(nb).map(fold);
  if (ta.length === 0 || tb.length === 0) return false;

  const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return shorter.every((w) => longer.includes(w));
}

/**
 * Compute a 0–100 match score.
 *
 * Heuristic (weights sum ≤ 100):
 *   • Direct/prior employment at target entity → up to 25
 *   • Same org via current_organisation        → up to 15 (fallback)
 *   • Declared relationship to target entity   → up to 26 (15 + 5 + 3 + 3)
 *   • Category relevance                       → up to 20
 *   • Target-role keyword overlap              → up to 15
 *   • Geographic preference                    → up to 10
 *   • Reputation (verified badge, exp.)        → up to  8
 *
 * The employment and current-organisation signals are mutually exclusive so a
 * Linker cannot collect 40 points for describing the same employer twice.
 */
export function computeMatchScore(input: MatchInput): number {
  const {
    opportunity,
    profile,
    relationships,
    employment = [],
    verifiedBadge,
    yearsOfExperience,
  } = input;

  const w = MATCH_WEIGHTS;
  let score = 0;

  const target = norm(opportunity.target_entity);

  // 1) Entity signals — employment beats current_organisation.
  const employedAtTarget = employment.some((e) => entityNamesMatch(e.organisation, target));
  const orgAtTarget = entityNamesMatch(profile?.current_organisation, target);
  if (employedAtTarget) score += w.directEmployment;
  else if (orgAtTarget) score += w.currentOrganisation;

  // Declared relationships naming the target entity.
  const relMatch = relationships.filter((r) => entityNamesMatch(r.entity_name, target));

  // 2) Category relevance — enum-aware, not literal string comparison.
  const cat = (opportunity.category ?? "").toUpperCase();
  const industry = norm(profile?.industry);
  if (!cat) {
    score += 8; // neutral
  } else if (cat === "OTHER") {
    score += 12; // neutral default for a catch-all category
  } else {
    const keywords = CATEGORY_KEYWORDS[cat];
    if (keywords && keywords.length > 0) {
      if (industry && keywords.some((k) => industry.includes(k))) score += w.category;
      else score += 8;
    } else {
      // Unknown category — fall back to literal comparison rather than penalising.
      score += industry && (cat.includes(industry) || industry.includes(cat)) ? w.category : 8;
    }
  }

  // 3) Target-role keyword overlap.
  const roleWords = tokens(opportunity.target_role).map(fold);
  const posWords = tokens(profile?.current_position).map(fold);
  if (roleWords.length > 0 && posWords.length > 0) {
    const matched = roleWords.filter((rw) => posWords.includes(rw)).length;
    // An exact-role requirement is satisfied only by a full overlap.
    const needExact = opportunity.target_role_exact === true;
    if (matched > 0 && (!needExact || matched === roleWords.length)) {
      score += Math.min(w.role, matched * 5);
    }
  }

  // 4) Geographic preference — country, then a looser city fallback.
  const geo = norm(opportunity.geographic_preference);
  const country = norm(profile?.country);
  const city = norm(profile?.city);
  if (geo && country && (geo.includes(country) || country.includes(geo))) {
    score += w.geography;
  } else if (geo && city && (geo.includes(city) || city.includes(geo))) {
    score += Math.round(w.geography / 2);
  }

  // 5) Reputation.
  if (verifiedBadge) score += 5;
  if (yearsOfExperience && yearsOfExperience >= 10) score += 3;
  else if (yearsOfExperience && yearsOfExperience >= 5) score += 2;

  // 6) Relationship strength — degree, warm category, and role specificity.
  if (relMatch.length > 0) {
    const bestDegree = Math.min(...relMatch.map((r) => degreeRank(r.connection_degree)));
    score += bestDegree <= 1 ? w.relationship : bestDegree <= 2 ? 10 : 5;

    if (bestDegree <= 1) score += w.degreeBonus;
    else if (bestDegree <= 2) score += 3;

    // A relationship that also names the target role is a materially better fit.
    const role = norm(opportunity.target_role);
    const roleMatched = relMatch.some((r) => {
      const note = norm(`${r.relevance_note ?? ""} ${r.category ?? ""}`);
      return !!role && !!note && role.split(" ").some((t) => t.length > 3 && note.includes(t));
    });
    if (roleMatched) score += w.relationshipRole;

    if (relMatch.some((r) => STRONG_RELATIONSHIP_CATEGORIES.has((r.category ?? "").toUpperCase()))) {
      score += 3;
    }
  }

  // 7) Restricted categories are harder to service — hold them back slightly.
  if (opportunity.is_restricted_category) score -= 10;

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

/** Badge variant matching the score band, for consistent UI colouring. */
export function matchVariant(
  score: number | null | undefined
): "success" | "warning" | "secondary" {
  const s = score ?? 0;
  if (s >= 80) return "success";
  if (s >= 50) return "warning";
  return "secondary";
}

/** One-line explanation of the strongest contributing signal. */
export function matchReason(input: MatchInput): string {
  const { opportunity, profile, relationships, employment = [] } = input;
  const target = norm(opportunity.target_entity);

  if (employment.some((e) => entityNamesMatch(e.organisation, target))) {
    return "Worked at the target entity";
  }
  if (entityNamesMatch(profile?.current_organisation, target)) {
    return "Currently at the target entity";
  }
  const rel = relationships.find((r) => entityNamesMatch(r.entity_name, target));
  if (rel) {
    const degree = degreeRank(rel.connection_degree);
    const label = degree === 1 ? "1st" : degree === 2 ? "2nd" : "3rd";
    return `${label}-degree relationship to the target entity`;
  }

  const cat = (opportunity.category ?? "").toUpperCase();
  const ind = norm(profile?.industry);
  const keywords = CATEGORY_KEYWORDS[cat];
  if (ind && keywords && keywords.some((k) => ind.includes(k))) {
    return "Industry matches the opportunity category";
  }
  return "Based on your profile, relationships and reputation";
}

/**
 * A Linker profile as embedded by Supabase selects. Every field is optional and
 * nullable because PostgREST returns nulls for unset columns and omits nothing.
 */
export type EmbeddedProfile = Partial<{
  [K in keyof MemberProfileRow]: MemberProfileRow[K] | null;
}> & { employment_history?: EmploymentRow[] | null };

export type EmbeddedRelationship = Partial<{
  [K in keyof RelationshipRow]: RelationshipRow[K] | null;
}>;

export interface LinkedMember {
  full_name?: string | null;
  country?: string | null;
  member_profiles?: EmbeddedProfile | null;
  relationships?: EmbeddedRelationship[] | null;
}

/**
 * Shape a Linker's nested Supabase rows into a MatchInput.
 *
 * `getProposalsWithLinker` and `getUserPublicProfile` both embed
 * member_profiles / employment_history / relationships; this flattens either
 * shape so the Seeker review screen and the Linker view score identically.
 */
export function buildMatchInput({
  opportunity,
  linker,
}: {
  opportunity: MatchInput["opportunity"];
  linker: LinkedMember | null;
}): MatchInput {
  const profile = linker?.member_profiles ?? null;
  return {
    opportunity,
    profile: profile
      ? {
          industry: profile.industry ?? null,
          country: profile.country ?? null,
          city: profile.city ?? null,
          current_organisation: profile.current_organisation ?? null,
          current_position: profile.current_position ?? null,
        }
      : null,
    relationships: (linker?.relationships ?? []) as RelationshipRow[],
    employment: profile?.employment_history ?? [],
    verifiedBadge: profile?.verified_badge ?? false,
    yearsOfExperience: profile?.years_of_experience ?? null,
  };
}

/** The opportunity fields the scorer reads, pulled off a full opportunity row. */
export function matchOpportunityFields(opp: OpportunityRow): MatchInput["opportunity"] {
  return {
    category: opp.category,
    target_entity: opp.target_entity,
    target_role: opp.target_role,
    target_role_exact: opp.target_role_exact,
    geographic_preference: opp.geographic_preference,
    is_restricted_category: opp.is_restricted_category,
  };
}