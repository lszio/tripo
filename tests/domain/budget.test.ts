import { describe, expect, it } from "vitest";
import { calculateDayBudget, calculateTripBudget, normalizePrice } from "../../src/domain/budget";
import type { Trip } from "../../src/domain/roadbook";

const trip: Trip = {
  id: "trip-1",
  name: "奥地利湖区",
  startDate: "2026-10-01",
  endDate: "2026-10-02",
  currency: "CNY",
  people: 2,
  days: [{ id: "day-1", date: "2026-10-01", order: 0, stays: [{ id: "stay-1", type: "stay", name: "湖景酒店", price: { amount: 300, currency: "CNY", unit: "night" } }] }],
  activities: [{ id: "activity-1", type: "activity", name: "哈尔施塔特", defaultPrice: { amount: 100, currency: "CNY", unit: "person" } }],
  schedule: [
    { id: "schedule-1", type: "activity", activityId: "activity-1", dayId: "day-1", startSlot: 18, durationSlots: 1, isTimeLocked: false },
    { id: "route-1", type: "route", dayId: "day-1", routeType: "manual", status: "valid", price: { amount: 80, currency: "CNY", unit: "total" } }
  ]
};

describe("budget", () => {
  it("multiplies person prices by the trip traveller count", () => {
    expect(normalizePrice({ amount: 200, currency: "CNY", unit: "person" }, 2, 1)).toBe(400);
  });

  it("counts activity, route, and stay prices by category", () => {
    expect(calculateDayBudget(trip, "day-1")).toEqual({ activity: 200, route: 80, stay: 300, total: 580, currency: "CNY" });
    expect(calculateTripBudget(trip)).toEqual({ activity: 200, route: 80, stay: 300, total: 580, currency: "CNY" });
  });

  it("converts individual card currencies into the selected budget currency", () => {
    const mixedCurrencyTrip: Trip = {
      ...structuredClone(trip),
      people: 1,
      days: [{ id: "day-1", date: "2026-10-01", order: 0, stays: [] }],
      activities: [
        { id: "activity-cny", type: "activity", name: "门票", defaultPrice: { amount: 100, currency: "CNY", unit: "total" } },
        { id: "activity-eur", type: "activity", name: "咖啡", defaultPrice: { amount: 10, currency: "EUR", unit: "total" } }
      ],
      schedule: [
        { id: "schedule-cny", type: "activity", activityId: "activity-cny", dayId: "day-1", startSlot: 18, durationSlots: 1, isTimeLocked: false },
        { id: "schedule-eur", type: "activity", activityId: "activity-eur", dayId: "day-1", startSlot: 20, durationSlots: 1, isTimeLocked: false }
      ]
    };

    expect(calculateDayBudget(mixedCurrencyTrip, "day-1", "CNY").activity).toBeCloseTo(178);
    expect(calculateTripBudget(mixedCurrencyTrip, "EUR").total).toBeCloseTo(22.8205, 3);
  });
});
