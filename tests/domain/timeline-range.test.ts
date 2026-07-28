import { describe, expect, it } from "vitest";
import { DEFAULT_TIMELINE_RANGE, expandTimelineRange } from "../../src/domain/timeline-range";

describe("timeline range", () => {
  it("starts with the focused 08:00 to 23:00 planning window", () => {
    expect(DEFAULT_TIMELINE_RANGE).toEqual({ startSlot: 16, endSlot: 46 });
  });

  it("extends two hours as a drag reaches either visible edge", () => {
    expect(expandTimelineRange(DEFAULT_TIMELINE_RANGE, 45)).toEqual({ startSlot: 16, endSlot: 48 });
    expect(expandTimelineRange(DEFAULT_TIMELINE_RANGE, 16)).toEqual({ startSlot: 12, endSlot: 46 });
  });
});
