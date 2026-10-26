import { PROGRESS } from "./constants";

/**
 * Progress-comment edit window (blueprint §5.6.2).
 *
 * Kept as a pure function in `lib/` — NOT inside the `"use server"` action file
 * — so the server guard and the UI cannot drift apart, and so the rule can be
 * unit tested without a database.
 *
 * Rule: you may edit your own comment only within
 * `PROGRESS.COMMENT_EDIT_WINDOW_MINUTES` of the moment you posted it. Editing
 * does not "reset" the clock: the window is measured from `created_at`, never
 * from `updated_at`, so repeated edits cannot extend it indefinitely.
 *
 * This is a *deadline for changing your own words*. It is independent of the
 * separate guarantee that every edit preserves the previous version as
 * immutable revision history — that happens regardless of how fast you edit.
 */
export const COMMENT_EDIT_WINDOW_MS =
  PROGRESS.COMMENT_EDIT_WINDOW_MINUTES * 60 * 1000;

export type CommentEditWindowResult = {
  /** True when the comment is still editable by its author. */
  canEdit: boolean;
  /** Whole minutes left in the window (0 once it has closed). */
  minutesLeft: number;
  /** Milliseconds left in the window (0 once it has closed). */
  msLeft: number;
  /** Human-readable reason when `canEdit` is false. */
  reason?: string;
};

/**
 * How long is left to edit a comment created at `createdAt`?
 *
 * @param createdAt ISO timestamp of the comment's original post time.
 * @param now       Injectable clock for deterministic tests (default: real now).
 *
 * Fails closed: an unparseable `createdAt` is treated as "closed" rather than
 * granting an unlimited edit window.
 */
export function commentEditWindow(
  createdAt: string,
  now: Date = new Date()
): CommentEditWindowResult {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) {
    return {
      canEdit: false,
      minutesLeft: 0,
      msLeft: 0,
      reason: "This comment can no longer be edited.",
    };
  }

  const expiresAt = created + COMMENT_EDIT_WINDOW_MS;
  const msLeft = expiresAt - now.getTime();

  if (msLeft <= 0) {
    return {
      canEdit: false,
      minutesLeft: 0,
      msLeft: 0,
      reason: `Comments can only be edited within ${PROGRESS.COMMENT_EDIT_WINDOW_MINUTES} minutes of posting.`,
    };
  }

  return {
    canEdit: true,
    // Round up so "10 seconds left" still reads as "1 minute left".
    minutesLeft: Math.ceil(msLeft / 60000),
    msLeft,
  };
}

/** Convenience boolean form used by the server action. */
export function isWithinCommentEditWindow(
  createdAt: string,
  now: Date = new Date()
): boolean {
  return commentEditWindow(createdAt, now).canEdit;
}
