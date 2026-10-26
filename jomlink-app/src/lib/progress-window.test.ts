import { describe, it, expect } from "vitest";
import {
  commentEditWindow,
  isWithinCommentEditWindow,
  COMMENT_EDIT_WINDOW_MS,
} from "./progress-window";
import { PROGRESS } from "./constants";

/**
 * Blueprint §5.6.2 — progress comment edits.
 *
 * Two guarantees are pinned here:
 *   • a comment is editable only within the 15-minute window from posting;
 *   • the window is measured from `created_at`, so repeated edits cannot
 *     extend it forever.
 */

const POSTED = "2026-10-26T10:00:00.000Z";

function at(offsetMs: number) {
  return new Date(new Date(POSTED).getTime() + offsetMs);
}

describe("commentEditWindow", () => {
  it("allows an edit immediately after posting", () => {
    const r = commentEditWindow(POSTED, at(0));
    expect(r.canEdit).toBe(true);
    expect(r.minutesLeft).toBe(15);
  });

  it("is still editable one second before the limit", () => {
    const r = commentEditWindow(POSTED, at(COMMENT_EDIT_WINDOW_MS - 1000));
    expect(r.canEdit).toBe(true);
    // Rounds up, so 1s left still reads as 1 minute.
    expect(r.minutesLeft).toBe(1);
  });

  it("closes exactly at the window boundary", () => {
    const r = commentEditWindow(POSTED, at(COMMENT_EDIT_WINDOW_MS));
    expect(r.canEdit).toBe(false);
    expect(r.msLeft).toBe(0);
  });

  it("is closed one second after the limit", () => {
    const r = commentEditWindow(POSTED, at(COMMENT_EDIT_WINDOW_MS + 1000));
    expect(r.canEdit).toBe(false);
    expect(r.reason).toMatch(/15 minutes/);
  });

  it("stays closed for a day-old comment", () => {
    const r = commentEditWindow(POSTED, at(24 * 60 * 60 * 1000));
    expect(r.canEdit).toBe(false);
  });

  it("fails closed on an unparseable timestamp", () => {
    const r = commentEditWindow("not-a-date");
    expect(r.canEdit).toBe(false);
  });

  it("reports minutes remaining mid-window", () => {
    // 10 minutes elapsed -> 5 left.
    const r = commentEditWindow(POSTED, at(10 * 60 * 1000));
    expect(r.canEdit).toBe(true);
    expect(r.minutesLeft).toBe(5);
  });
});

describe("isWithinCommentEditWindow", () => {
  it("matches the detailed result", () => {
    expect(isWithinCommentEditWindow(POSTED, at(0))).toBe(true);
    expect(
      isWithinCommentEditWindow(POSTED, at(COMMENT_EDIT_WINDOW_MS + 1))
    ).toBe(false);
  });

  it("uses a 15-minute constant", () => {
    expect(PROGRESS.COMMENT_EDIT_WINDOW_MINUTES).toBe(15);
    expect(COMMENT_EDIT_WINDOW_MS).toBe(15 * 60 * 1000);
  });
});
