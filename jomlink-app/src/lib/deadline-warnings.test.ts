import { describe, it, expect } from "vitest";
import {
  daysUntil,
  deadlineProximity,
  WARN_WINDOW_DAYS,
  URGENT_WINDOW_DAYS,
} from "./deadline-warnings";

const NOW = new Date("2026-10-12T12:00:00.000Z");

function inDays(d: number): string {
  return new Date(NOW.getTime() + d * 24 * 60 * 60 * 1000).toISOString();
}

describe("daysUntil", () => {
  it("counts whole days to a future date", () => {
    expect(daysUntil(inDays(3), NOW)).toBe(3);
    expect(daysUntil(inDays(1), NOW)).toBe(1);
  });

  it("goes negative once the date has passed", () => {
    expect(daysUntil(inDays(-2), NOW)).toBeLessThan(0);
  });
});

describe("deadlineProximity", () => {
  it("ignores deadlines that are not ACCEPTED or have no accepted date", () => {
    expect(deadlineProximity(null, NOW)).toBe("NONE");
    expect(
      deadlineProximity({ status: "REQUESTED", accepted_date: inDays(1) }, NOW)
    ).toBe("NONE");
    expect(
      deadlineProximity({ status: "ACCEPTED", accepted_date: null }, NOW)
    ).toBe("NONE");
  });

  it("flags URGENT inside the urgent window", () => {
    expect(
      deadlineProximity(
        { status: "ACCEPTED", accepted_date: inDays(URGENT_WINDOW_DAYS) },
        NOW
      )
    ).toBe("URGENT");
  });

  it("flags SOON inside the warn window but outside urgent", () => {
    expect(
      deadlineProximity(
        { status: "ACCEPTED", accepted_date: inDays(WARN_WINDOW_DAYS) },
        NOW
      )
    ).toBe("SOON");
  });

  it("returns NONE when the deadline is comfortably far off", () => {
    expect(
      deadlineProximity(
        { status: "ACCEPTED", accepted_date: inDays(WARN_WINDOW_DAYS + 5) },
        NOW
      )
    ).toBe("NONE");
  });

  it("marks a passed deadline as OVERDUE", () => {
    expect(
      deadlineProximity(
        { status: "ACCEPTED", accepted_date: inDays(-1) },
        NOW
      )
    ).toBe("OVERDUE");
  });
});
