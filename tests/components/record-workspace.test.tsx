import { describe, expect, it } from "vitest";
import type { ArchiveTravel } from "../../src/domain/roadbook";
import { moveRecordToDay } from "../../src/components/records/record-actions";

const travel: ArchiveTravel = {
  id: "trip-1",
  title: "奥匈九日漫游",
  status: "active",
  roadbook: {
    id: "trip-1",
    name: "奥匈九日漫游",
    startDate: "2026-10-01",
    endDate: "2026-10-02",
    currency: "CNY",
    people: 2,
    days: [
      { id: "day-1", date: "2026-10-01", order: 0 },
      { id: "day-2", date: "2026-10-02", order: 1 }
    ],
    activities: [],
    schedule: []
  },
  editablePlan: { days: [{ id: "day-1", date: "2026-10-01", cards: [] }] },
  recordingPlanSnapshot: { days: [{ id: "day-1", date: "2026-10-01", cards: [{ id: "card-1", plannedDayId: "day-1" }] }] },
  records: [{ id: "record-1", actualDayId: "day-1", planCardId: "card-1", content: "提前抵达" }]
};

describe("record workspace", () => {
  it("moves a record without changing its frozen plan snapshot", () => {
    const moved = moveRecordToDay(travel, "record-1", "day-2");

    expect(moved.records[0].actualDayId).toBe("day-2");
    expect(moved.recordingPlanSnapshot).toEqual(travel.recordingPlanSnapshot);
    expect(travel.records[0].actualDayId).toBe("day-1");
  });
});
