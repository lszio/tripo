import { describe, expect, it } from "vitest";
import { getDayMapNodes, getTripMapRoute } from "../../src/domain/map-routes";
import { createDemoArchive } from "../../src/domain/migration";

describe("map routes", () => {
  it("uses only scheduled activities and scheduled stays as daily map nodes", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.activities[0].location = { name: "景点", latitude: 47.56, longitude: 13.65 };
    trip.days[0].stays = [
      { id: "stay-a", type: "stay", name: "未排期酒店", isPrimary: true, location: { name: "酒店", latitude: 47.57, longitude: 13.66 } }
    ];

    expect(getDayMapNodes(trip, "day-1").map(node => node.name)).toEqual(["景点"]);

    trip.schedule.push({ id: "stay-schedule", type: "stay", stayId: "stay-a", dayId: "day-1", startSlot: 24, durationSlots: 1, isTimeLocked: false });

    expect(getDayMapNodes(trip, "day-1").map(node => node.name)).toEqual(["景点", "酒店"]);
  });

  it("colors a cross-day connection with the departure day color", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.endDate = "2026-10-02";
    trip.activities[0].location = { name: "第一天", latitude: 47.56, longitude: 13.65 };
    trip.days.push({ id: "day-2", date: "2026-10-02", order: 1, stays: [], isActive: true });
    trip.activities.push({ id: "activity-day-2", type: "activity", name: "第二天", location: { name: "第二天", latitude: 48.2, longitude: 16.37 } });
    trip.schedule.push({ id: "schedule-day-2", type: "activity", activityId: "activity-day-2", dayId: "day-2", startSlot: 16, durationSlots: 1, isTimeLocked: false });

    const route = getTripMapRoute(trip);

    expect(route.segments).toHaveLength(1);
    expect(route.segments[0]).toMatchObject({ fromDayId: "day-1", toDayId: "day-2", color: route.days[0].color });
  });
});
