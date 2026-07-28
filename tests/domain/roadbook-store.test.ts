import { describe, expect, it, vi } from "vitest";
import { createDemoArchive } from "../../src/domain/migration";
import { createRoadbookStore } from "../../src/store/roadbook-store";

describe("Roadbook trip settings", () => {
  it("copies a day's schedules into another date with independent stay instances", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.endDate = "2026-10-02";
    trip.days[0].stays = [{ id: "stay-1", type: "stay", name: "湖畔酒店", isPrimary: true }];
    trip.schedule.push(
      { id: "stay-schedule", type: "stay", stayId: "stay-1", dayId: "day-1", startSlot: 20, durationSlots: 1, isTimeLocked: false },
      { id: "route-1", type: "route", dayId: "day-1", fromScheduleId: "schedule-hallstatt", toScheduleId: "stay-schedule", startSlot: 19, durationSlots: 1, routeType: "manual", status: "valid" }
    );
    const store = createRoadbookStore(trip, () => undefined);

    store.getState().copyDayPlan("day-1");
    store.getState().pasteDayPlan("day-2026-10-02");

    const copied = store.getState().trip;
    const copiedStay = copied.days.find(day => day.id === "day-2026-10-02")?.stays?.[0];
    const copiedActivity = copied.schedule.find(node => node.type === "activity" && node.dayId === "day-2026-10-02");
    const copiedStaySchedule = copied.schedule.find(node => node.type === "stay" && node.dayId === "day-2026-10-02");
    const copiedRoute = copied.schedule.find(node => node.type === "route" && node.dayId === "day-2026-10-02");

    expect(copiedStay?.id).not.toBe("stay-1");
    expect(copiedActivity).toMatchObject({ activityId: "activity-hallstatt", startSlot: 18 });
    expect(copiedStaySchedule).toMatchObject({ stayId: copiedStay?.id, startSlot: 20 });
    expect(copiedRoute).toMatchObject({ fromScheduleId: copiedActivity?.id, toScheduleId: copiedStaySchedule?.id });
  });

  it("commits a renamed trip and keeps out-of-range schedules when requested", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    const onCommit = vi.fn();
    const store = createRoadbookStore(trip, onCommit);

    store.getState().commitTripSettings("维也纳周末", "2026-10-02", "2026-10-03", "keep");

    expect(store.getState().trip.name).toBe("维也纳周末");
    expect(store.getState().trip.days.find(day => day.id === "day-1")?.isActive).toBe(false);
    expect(onCommit).toHaveBeenCalledOnce();
  });

  it("persists a reordered material library without touching schedules", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.activities.push({ id: "coffee", type: "activity", name: "咖啡馆" });
    const store = createRoadbookStore(trip, vi.fn());

    store.getState().reorderActivities("coffee", "activity-hallstatt");

    expect(store.getState().trip.activities.map(activity => activity.id)).toEqual(["coffee", "activity-hallstatt"]);
    expect(store.getState().trip.schedule).toHaveLength(1);
  });

  it("creates and persists a stay on the selected day", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    const onCommit = vi.fn();
    const store = createRoadbookStore(trip, onCommit);

    store.getState().createStayDraft("day-1");
    const draft = store.getState().draftStay;
    expect(draft?.dayId).toBe("day-1");

    store.getState().commitStay("day-1", { ...draft!.stay, name: "湖景酒店", price: { amount: 120, currency: "EUR", unit: "night" } });

    expect(store.getState().trip.days[0].stays?.[0]).toMatchObject({ name: "湖景酒店", isPrimary: true });
    expect(onCommit).toHaveBeenCalledOnce();
  });

  it("replaces the scheduled check-in when the current accommodation changes", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.days[0].stays = [
      { id: "stay-a", type: "stay", name: "酒店 A", isPrimary: true },
      { id: "stay-b", type: "stay", name: "酒店 B", isPrimary: false }
    ];
    trip.schedule.push({ id: "stay-schedule-a", type: "stay", stayId: "stay-a", dayId: "day-1", startSlot: 30, durationSlots: 3, isTimeLocked: true });
    const store = createRoadbookStore(trip, vi.fn());

    store.getState().setPrimaryStay("day-1", "stay-b");

    expect(store.getState().trip.days[0].stays).toMatchObject([
      { id: "stay-a", isPrimary: false },
      { id: "stay-b", isPrimary: true }
    ]);
    expect(store.getState().trip.schedule.find(node => node.type === "stay")).toMatchObject({ stayId: "stay-b", startSlot: 30, durationSlots: 3, isTimeLocked: true });
  });

  it("creates a manual route on the selected day", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    const store = createRoadbookStore(trip, vi.fn());

    store.getState().createRouteDraft("day-1");
    const draft = store.getState().draftRoute;
    store.getState().commitRoute({ ...draft!, transport: "train", durationSlots: 3, price: { amount: 24, currency: "EUR", unit: "total" } });

    expect(store.getState().trip.schedule.find(node => node.type === "route")).toMatchObject({ dayId: "day-1", transport: "train", durationSlots: 3, routeType: "manual", status: "valid" });
  });

  it("marks linked routes invalid after an activity schedule is removed", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.schedule.push({ id: "route-1", type: "route", dayId: "day-1", fromScheduleId: "schedule-hallstatt", startSlot: 20, durationSlots: 1, routeType: "manual", status: "valid" });
    const store = createRoadbookStore(trip, vi.fn());

    store.getState().deleteActivitySchedule("schedule-hallstatt");

    expect(store.getState().trip.schedule.find(node => node.id === "route-1")).toMatchObject({ status: "invalid" });
  });
});
