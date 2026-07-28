import { describe, expect, it } from "vitest";
import { getCalendarDates, getActiveDays, reconcileTripDateRange } from "../../src/domain/calendar-days";
import { createDemoArchive } from "../../src/domain/migration";

describe("calendar days", () => {
  it("derives one active day for every date in the inclusive trip range", () => {
    const trip = { ...createDemoArchive().travels[0].roadbook, startDate: "2026-10-01", endDate: "2026-10-03" };

    expect(getCalendarDates(trip.startDate, trip.endDate)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(getActiveDays(trip)).toHaveLength(3);
  });

  it("keeps removed dates muted with their schedules when requested", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    const next = reconcileTripDateRange(trip, "2026-10-02", "2026-10-03", "keep");

    expect(next.days.find(day => day.id === "day-1")).toMatchObject({ date: "2026-10-01", isActive: false });
    expect(next.schedule).toHaveLength(1);
    expect(getActiveDays(next).map(day => day.date)).toEqual(["2026-10-02", "2026-10-03"]);
  });

  it("deletes removed dates and their schedules when requested", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    const next = reconcileTripDateRange(trip, "2026-10-02", "2026-10-03", "delete");

    expect(next.days.some(day => day.id === "day-1")).toBe(false);
    expect(next.schedule).toHaveLength(0);
  });
});
