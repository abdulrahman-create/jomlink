import { describe, it, expect } from "vitest";
import {
  checkCategoryPostable,
  isCategoryEnabled,
  isCategoryDisabled,
  isKnownCategory,
  categoryLabel,
  restrictedConfidentialityFor,
  ENABLED_CATEGORY_VALUES,
  KNOWN_CATEGORY_VALUES,
  DISABLED_CATEGORIES,
  SELECTABLE_CATEGORIES,
} from "./category-policy";
import {
  OPPORTUNITY_CATEGORIES,
  DISABLED_CATEGORY_VALUES,
  PUBLIC_OPPORTUNITY_CATEGORIES,
} from "./constants";

/**
 * Blueprint v1.2 §11.9.1 — server-side category deny-list (LEG-02/03/06).
 *
 * These tests pin the *rules*, not the implementation: default-deny, both
 * regulated categories blocked with equal force, unknown values blocked, and a
 * blocked decision that is safe to show a member and carries no side effect.
 */

describe("deny-list membership", () => {
  it("blocks government/public-sector opportunities (MACC Act 2009)", () => {
    expect(isCategoryEnabled("GOVERNMENT_PUBLIC_SECTOR")).toBe(false);
    expect(isCategoryDisabled("GOVERNMENT_PUBLIC_SECTOR")).toBe(true);
  });

  it("blocks investor connections with the SAME rigour (§11.9 / LEG-03)", () => {
    // Previously INVESTOR_CONNECTION had no restriction at all.
    expect(isCategoryEnabled("INVESTOR_CONNECTION")).toBe(false);
    expect(isCategoryDisabled("INVESTOR_CONNECTION")).toBe(true);
  });

  it("allows an ordinary low-risk category", () => {
    expect(isCategoryEnabled("BUSINESS_INTRODUCTION")).toBe(true);
    expect(isCategoryDisabled("BUSINESS_INTRODUCTION")).toBe(false);
  });

  it("denies by default: unknown values are not enabled", () => {
    for (const bad of ["", "  ", "NOT_A_CATEGORY", "business_introduction", "OTHERX"]) {
      expect(isCategoryEnabled(bad)).toBe(false);
      expect(isKnownCategory(bad)).toBe(false);
    }
  });

  it("cannot accidentally enable a brand-new category", () => {
    // Every enabled value must be a real enum member AND absent from the deny-list.
    for (const v of ENABLED_CATEGORY_VALUES) {
      expect(KNOWN_CATEGORY_VALUES).toContain(v);
      expect(DISABLED_CATEGORIES as readonly string[]).not.toContain(v);
    }
  });
});

describe("checkCategoryPostable", () => {
  it("passes an enabled category through unchanged", () => {
    const r = checkCategoryPostable("SUPPLIER_CONNECTION");
    expect(r.allowed).toBe(true);
    if (r.allowed) expect(r.category).toBe("SUPPLIER_CONNECTION");
  });

  it("rejects a disabled category with a member-facing message", () => {
    const r = checkCategoryPostable("GOVERNMENT_PUBLIC_SECTOR");
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.code).toBe("CATEGORY_DISABLED");
      // Must be clear about the block AND that no money moved (§11.9.1 rule 2).
      expect(r.message).toMatch(/not available/i);
      expect(r.message).toMatch(/No posting deposit has been charged/i);
    }
  });

  it("rejects investor connections via the same code path", () => {
    const r = checkCategoryPostable("INVESTOR_CONNECTION");
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe("CATEGORY_DISABLED");
  });

  it("distinguishes an unknown category from a disabled one", () => {
    const r = checkCategoryPostable("CRYPTO_TO_THE_MOON");
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.code).toBe("CATEGORY_UNKNOWN");
      expect(r.message).toMatch(/not recognised/i);
    }
  });

  it("treats missing / blank input as not postable (default-deny)", () => {
    for (const bad of [null, undefined, "", "   "]) {
      expect(checkCategoryPostable(bad).allowed).toBe(false);
    }
  });

  it("does not leak the internal deny-list vocabulary in the message", () => {
    const r = checkCategoryPostable("INVESTOR_CONNECTION");
    if (!r.allowed) {
      expect(r.message).not.toContain("INVESTOR_CONNECTION");
      expect(r.message).not.toMatch(/DISABLED_CATEGORY_VALUES/);
    }
  });

  it("normalises surrounding whitespace before deciding", () => {
    expect(checkCategoryPostable("  BUSINESS_INTRODUCTION  ").allowed).toBe(true);
    expect(checkCategoryPostable("  INVESTOR_CONNECTION  ").allowed).toBe(false);
  });
});

describe("single source of truth", () => {
  it("public selectors and the server rule read the same deny-list", () => {
    expect(SELECTABLE_CATEGORIES).toEqual(PUBLIC_OPPORTUNITY_CATEGORIES);
    for (const c of OPPORTUNITY_CATEGORIES) {
      const blocked = isCategoryDisabled(c.value);
      expect(PUBLIC_OPPORTUNITY_CATEGORIES.some((p) => p.value === c.value)).toBe(
        !blocked
      );
    }
  });

  it("no disabled category leaks into the selectable list", () => {
    for (const d of DISABLED_CATEGORY_VALUES) {
      expect(SELECTABLE_CATEGORIES.some((c) => c.value === d)).toBe(false);
    }
  });
});

describe("presentation helpers", () => {
  it("labels a category, falling back to the raw value", () => {
    expect(categoryLabel("GOVERNMENT_PUBLIC_SECTOR")).toBe(
      "Government / Public Sector"
    );
    expect(categoryLabel("SOMETHING_ELSE")).toBe("SOMETHING_ELSE");
    expect(categoryLabel(null)).toBe("");
  });

  it("does not use the restricted flag as a substitute for a hard block", () => {
    // §11.9.1 rule 5: 'restricted' and 'disabled' are distinct states. The
    // confidentiality helper is display-only and never authorises a post.
    expect(isCategoryDisabled("GOVERNMENT_PUBLIC_SECTOR")).toBe(true);
    expect(checkCategoryPostable("GOVERNMENT_PUBLIC_SECTOR").allowed).toBe(false);
    // An enabled category keeps the caller's chosen confidentiality.
    expect(restrictedConfidentialityFor("STRATEGIC_PARTNER", "PUBLIC")).toBe("PUBLIC");
  });
});
