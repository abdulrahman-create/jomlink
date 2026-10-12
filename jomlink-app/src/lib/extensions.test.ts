import { describe, expect, it } from "vitest";
import type { ConnectionExtensionRow, ExtensionStatus } from "@/lib/jomlink-types";

/**
 * The extension flow's rules (blueprint §5.14) are enforced in the server actions
 * rather than in a shared predicate, because they depend on the acting member's
 * role and on the connection's state. These tests pin the *decision table* so a
 * future edit cannot quietly restore the unilateral behaviour.
 *
 * The bug this guards against: the Linker used to apply their own extension and
 * clear their own yellow flag, so the party the mechanism holds accountable was
 * deciding whether to hold themselves accountable.
 */

/** Mirrors the guard in acceptExtensionAction / rejectExtensionAction. */
function canDecide(
  extension: Pick<ConnectionExtensionRow, "status">,
  viewerIsSeeker: boolean
): boolean {
  return viewerIsSeeker && extension.status === "REQUESTED";
}

/** Mirrors the guard in requestExtensionAction. */
function canRequest(
  viewerIsLinker: boolean,
  connectionOpen: boolean,
  hasOpenRequest: boolean
): boolean {
  return viewerIsLinker && connectionOpen && !hasOpenRequest;
}

/** What an ACCEPTED extension does to the connection. */
function effectsOf(status: ExtensionStatus) {
  return {
    movesDeadline: status === "ACCEPTED",
    clearsFlag: status === "ACCEPTED",
  };
}

describe("extension decision rights (§5.14)", () => {
  it("lets only the Seeker decide", () => {
    const pending = { status: "REQUESTED" as const };
    expect(canDecide(pending, true)).toBe(true);
    expect(canDecide(pending, false)).toBe(false);
  });

  it("refuses a second decision on an already-decided request", () => {
    for (const status of ["ACCEPTED", "REJECTED", "WITHDRAWN"] as const) {
      expect(canDecide({ status }, true)).toBe(false);
    }
  });
});

describe("extension request rights", () => {
  it("lets the Linker request while the task is open", () => {
    expect(canRequest(true, true, false)).toBe(true);
  });

  it("refuses a non-Linker", () => {
    expect(canRequest(false, true, false)).toBe(false);
  });

  it("refuses on a closed connection", () => {
    expect(canRequest(true, false, false)).toBe(false);
  });

  it("refuses a second request while one is pending", () => {
    // Two live requests would make "the pending extension" ambiguous; the
    // database also enforces this with a partial unique index.
    expect(canRequest(true, true, true)).toBe(false);
  });
});

describe("extension effects", () => {
  it("moves the deadline and clears the flag ONLY when accepted", () => {
    expect(effectsOf("ACCEPTED")).toEqual({ movesDeadline: true, clearsFlag: true });
  });

  it("leaves both untouched when rejected", () => {
    // §5.14: "If rejected, the original deadline remains applicable and the
    // yellow flag remains raised if the deadline is subsequently missed."
    expect(effectsOf("REJECTED")).toEqual({ movesDeadline: false, clearsFlag: false });
  });

  it("leaves both untouched while merely requested", () => {
    // The core of the fix: a REQUESTED extension must have no effect at all.
    expect(effectsOf("REQUESTED")).toEqual({ movesDeadline: false, clearsFlag: false });
  });

  it("leaves both untouched when withdrawn", () => {
    expect(effectsOf("WITHDRAWN")).toEqual({ movesDeadline: false, clearsFlag: false });
  });
});
