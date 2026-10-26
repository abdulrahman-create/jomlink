import {
  DISABLED_CATEGORY_VALUES,
  OPPORTUNITY_CATEGORIES,
  PUBLIC_OPPORTUNITY_CATEGORIES,
} from "./constants";

/**
 * Category allow-list / deny-list policy (blueprint v1.2 §11.9.1).
 *
 * "Regulated and high-risk categories must be governed by a **server-side
 * allowlist**, not by UI flags." (§11.9.1)
 *
 * This module is the ONE place that answers "may this category be posted?".
 * It is a pure module (no `"use server"`, no DB, no `next/*` imports) so that:
 *   • every server action imports the same rule instead of re-writing it;
 *   • the UI imports the same rule to decide what is selectable (§11.9.1 rule 3);
 *   • the rule is unit testable without a database.
 *
 * Default-deny
 * ------------
 * A category is postable only when it is **explicitly known** (present in
 * `OPPORTUNITY_CATEGORIES`) and **not** listed in `DISABLED_CATEGORY_VALUES`.
 * Anything else — an unknown string, an empty value, a future enum member
 * someone forgot to register — is rejected. This is the opposite of a
 * deny-list that lets unknown values through.
 *
 * "Disabled" ≠ "restricted"
 * -------------------------
 * §11.9.1 rule 5: a category may be *enabled but restricted* (visible to a
 * subset) only under a separate reviewed rule. `is_restricted_category` +
 * `RESTRICTED` confidentiality is that second concept and is NOT a substitute
 * for a hard block. The two are deliberately kept apart here:
 *   • `isCategoryEnabled()`          → may it be posted at all?
 *   • `restrictedConfidentialityFor()` → the confidentiality a restricted
 *                                        category is stored with (display only).
 */

export type CategoryDecision =
  | { allowed: true; category: string }
  | {
      allowed: false;
      category: string;
      /** Stable machine-readable reason (safe to log / assert on). */
      code: "CATEGORY_DISABLED" | "CATEGORY_UNKNOWN";
      /** Member-facing explanation — never leaks internal vocabulary. */
      message: string;
    };

/** Every category value the platform knows about (including disabled ones). */
export const KNOWN_CATEGORY_VALUES: readonly string[] = OPPORTUNITY_CATEGORIES.map(
  (c) => c.value
);

/** Category values that may be posted right now. */
export const ENABLED_CATEGORY_VALUES: readonly string[] =
  PUBLIC_OPPORTUNITY_CATEGORIES.map((c) => c.value);

const KNOWN = new Set(KNOWN_CATEGORY_VALUES);
const ENABLED = new Set(ENABLED_CATEGORY_VALUES);

/** Human label for a category enum value (falls back to the raw value). */
export function categoryLabel(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  return OPPORTUNITY_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

/** Is this category currently postable? (default-deny — see module docs) */
export function isCategoryEnabled(value: string | null | undefined): boolean {
  return ENABLED.has((value ?? "").trim());
}

/** Is this category known to the platform at all? */
export function isKnownCategory(value: string | null | undefined): boolean {
  return KNOWN.has((value ?? "").trim());
}

/** Is this category on the compliance deny-list (i.e. known but not enabled)? */
export function isCategoryDisabled(value: string | null | undefined): boolean {
  return isKnownCategory(value) && !isCategoryEnabled(value);
}

/**
 * Decide whether a category may be posted, with a member-facing reason.
 *
 * Callers MUST call this **before** any side effect (in particular before
 * `chargePostingDeposit`) — §11.9.1 rule 2: a blocked listing must not charge
 * the posting deposit.
 */
export function checkCategoryPostable(
  value: string | null | undefined
): CategoryDecision {
  const category = (value ?? "").trim();

  if (!isKnownCategory(category)) {
    return {
      allowed: false,
      category,
      code: "CATEGORY_UNKNOWN",
      message: "That category is not recognised. Please choose a category from the list.",
    };
  }

  if (isCategoryDisabled(category)) {
    return {
      allowed: false,
      category,
      code: "CATEGORY_DISABLED",
      message:
        `${categoryLabel(category)} opportunities are not available. ` +
        `This category is disabled while it undergoes compliance review, so it ` +
        `cannot be posted. No posting deposit has been charged.`,
    };
  }

  return { allowed: true, category };
}

/**
 * Categories that are enabled AND should be offered in selectors.
 * Structurally identical to `PUBLIC_OPPORTUNITY_CATEGORIES`; exported from this
 * module so UI code only has to import the policy, not the constants table.
 */
export const SELECTABLE_CATEGORIES = PUBLIC_OPPORTUNITY_CATEGORIES;

/**
 * Confidentiality a restricted category is stored with.
 *
 * Display-only convenience for the write paths. It does **not** authorise
 * anything — enforcement is `checkCategoryPostable`.
 */
export function restrictedConfidentialityFor<T extends string>(
  category: string,
  fallback: T
): T | "RESTRICTED" {
  return isCategoryDisabled(category) ? "RESTRICTED" : fallback;
}

/** Raw deny-list, re-exported so tests and docs have one import. */
export const DISABLED_CATEGORIES: readonly string[] = DISABLED_CATEGORY_VALUES;
