import { describe, expect, it } from "vitest";
import { durationFromPointerDelta } from "../../src/domain/timeline-resize";

describe("timeline pointer resizing", () => {
  it("snaps a card height drag to whole 30-minute slots", () => {
    expect(durationFromPointerDelta(1, 20)).toBe(2);
    expect(durationFromPointerDelta(2, -80)).toBe(1);
    expect(durationFromPointerDelta(2, 72)).toBe(4);
  });
});
