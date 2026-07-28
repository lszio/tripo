import { describe, expect, it } from "vitest";
import type { ActivitySchedule } from "../../src/domain/roadbook";
import {
  createActivitySchedule,
  insertSchedule,
  moveSchedule,
  resizeSchedule,
  slotFromTime,
  timeFromSlot
} from "../../src/domain/timeline-engine";

const schedule = (
  id: string,
  startSlot: number,
  durationSlots: number,
  isTimeLocked = false
): ActivitySchedule => ({
  id,
  type: "activity",
  activityId: `${id}-activity`,
  dayId: "day-1",
  startSlot,
  durationSlots,
  isTimeLocked
});

describe("TimelineEngine", () => {
  it("snaps times to the nearest 30-minute slot", () => {
    expect(slotFromTime("09:17")).toBe(19);
    expect(timeFromSlot(19)).toBe("09:30");
  });

  it("creates schedules with a 30-minute default duration", () => {
    expect(createActivitySchedule("activity-1", "day-1", 19)).toMatchObject({
      activityId: "activity-1",
      dayId: "day-1",
      startSlot: 19,
      durationSlots: 1,
      isTimeLocked: false
    });
  });

  it("inserts within an activity and pushes following unlocked activities", () => {
    const result = insertSchedule(
      [schedule("breakfast", 16, 2), schedule("museum", 18, 2)],
      schedule("coffee", 17, 1)
    );

    expect(result?.map(item => [item.id, item.startSlot])).toEqual([
      ["breakfast", 16],
      ["coffee", 18],
      ["museum", 19]
    ]);
  });

  it("keeps locked activities fixed and moves the inserted activity after them", () => {
    const result = insertSchedule([schedule("museum", 18, 2, true)], schedule("coffee", 18, 1));

    expect(result?.map(item => [item.id, item.startSlot])).toEqual([
      ["museum", 18],
      ["coffee", 20]
    ]);
  });

  it("rejects an insertion that would overflow the day", () => {
    expect(insertSchedule([schedule("late", 47, 1, true)], schedule("coffee", 47, 1))).toBeNull();
  });

  it("moves schedules across days without mutating the source array", () => {
    const initial = [schedule("coffee", 18, 1)];
    const result = moveSchedule(initial, "coffee", "day-2", 20);

    expect(result).toMatchObject([{ dayId: "day-2", startSlot: 20 }]);
    expect(initial[0]).toMatchObject({ dayId: "day-1", startSlot: 18 });
  });

  it("never resizes an activity below one slot", () => {
    const result = resizeSchedule([schedule("coffee", 18, 2)], "coffee", 0);

    expect(result).toMatchObject([{ durationSlots: 1 }]);
  });
});
