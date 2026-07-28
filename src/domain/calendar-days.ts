import type { Day, Trip } from "./roadbook";

export type DateRangeDecision = "keep" | "delete";

function asUtcDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function createDay(date: string, order: number): Day {
  return { id: `day-${date}`, date, order, stays: [], isActive: true };
}

export function getCalendarDates(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate || startDate > endDate) return [];
  const dates: string[] = [];
  const cursor = asUtcDate(startDate);
  const end = asUtcDate(endDate);
  while (cursor <= end) {
    dates.push(formatUtcDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function getActiveDays(trip: Trip): Day[] {
  const existingDays = new Map(trip.days.map(day => [day.date, day]));
  return getCalendarDates(trip.startDate, trip.endDate).map((date, order) => {
    const existing = existingDays.get(date);
    return existing ? { ...existing, order, isActive: true } : createDay(date, order);
  });
}

export function reconcileTripDateRange(trip: Trip, startDate: string, endDate: string, decision: DateRangeDecision): Trip {
  const activeDates = new Set(getCalendarDates(startDate, endDate));
  const activeTrip = { ...trip, startDate, endDate };
  const activeDays = getActiveDays(activeTrip);
  const affectedDays = trip.days.filter(day => !activeDates.has(day.date));
  const inactiveDays = decision === "keep"
    ? affectedDays.map((day, index) => ({ ...day, order: activeDays.length + index, isActive: false }))
    : [];
  const removedDayIds = new Set(decision === "delete" ? affectedDays.map(day => day.id) : []);

  return {
    ...trip,
    startDate,
    endDate,
    days: [...activeDays, ...inactiveDays],
    schedule: trip.schedule.filter(node => !removedDayIds.has(node.dayId))
  };
}
