import { describe, expect, it } from "vitest";
import { migrateArchive } from "../../src/domain/migration";

describe("migrateArchive", () => {
  it("migrates a legacy card without plannedTime to slot 14", () => {
    const result = migrateArchive({
      travels: [{
        id: "travel-1",
        title: "奥匈九日漫游",
        destination: "奥地利 / 匈牙利",
        dates: "2026-10-01 至 2026-10-02",
        status: "planned",
        records: [],
        editablePlan: {
          days: [{ id: "day-1", date: "2026-10-01", title: "维也纳", cards: [{ id: "card-1", plannedDayId: "day-1", blocks: [{ id: "text-1", kind: "text", value: "美泉宫" }] }] }]
        }
      }],
      selectedTravelId: "travel-1"
    });

    expect(result.schemaVersion).toBe(2);
    expect(result.travels[0].roadbook.schedule[0]).toMatchObject({ startSlot: 14, durationSlots: 1, isTimeLocked: false });
    expect(result.travels[0].roadbook.activities[0]).toMatchObject({ name: "美泉宫" });
  });
});
