import type { ActivitySchedule, StaySchedule, TimelineSchedule } from "./roadbook";

const SLOT_COUNT = 48;
const MINUTES_PER_SLOT = 30;

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `schedule-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function endSlot(schedule: TimelineSchedule) {
  return schedule.startSlot + schedule.durationSlots;
}

function sortByStartSlot<T extends TimelineSchedule>(schedules: T[]) {
  return [...schedules].sort((left, right) => left.startSlot - right.startSlot || left.id.localeCompare(right.id));
}

export function slotFromTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return 0;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return 0;
  }

  return clamp(Math.round((hours * 60 + minutes) / MINUTES_PER_SLOT), 0, SLOT_COUNT - 1);
}

export function timeFromSlot(slot: number) {
  const minutes = clamp(Math.round(slot), 0, SLOT_COUNT - 1) * MINUTES_PER_SLOT;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function clampSchedule<T extends TimelineSchedule>(schedule: T): T {
  const startSlot = clamp(Math.round(schedule.startSlot), 0, SLOT_COUNT - 1);
  const durationSlots = clamp(Math.round(schedule.durationSlots), 1, SLOT_COUNT - startSlot);
  return { ...schedule, startSlot, durationSlots };
}

export function createActivitySchedule(activityId: string, dayId: string, startSlot: number): ActivitySchedule {
  return clampSchedule({
    id: createId(),
    type: "activity",
    activityId,
    dayId,
    startSlot,
    durationSlots: 1,
    isTimeLocked: false
  });
}

export function createStaySchedule(stayId: string, dayId: string, startSlot: number): StaySchedule {
  return clampSchedule({
    id: createId(),
    type: "stay",
    stayId,
    dayId,
    startSlot,
    durationSlots: 1,
    isTimeLocked: false
  });
}

function moveCandidateAfterLockedBoundary<T extends TimelineSchedule>(candidate: T, schedules: TimelineSchedule[]) {
  let next = candidate;
  let moved = true;

  while (moved) {
    moved = false;
    for (const schedule of schedules) {
      if (!schedule.isTimeLocked) continue;
      const overlaps = next.startSlot < endSlot(schedule) && endSlot(next) > schedule.startSlot;
      if (overlaps) {
        next = { ...next, startSlot: endSlot(schedule) };
        moved = true;
      }
    }
  }

  return clampSchedule(next);
}

export function insertSchedule<T extends TimelineSchedule>(existing: T[], candidate: T): T[] | null {
  const normalizedExisting = existing.map(clampSchedule).filter(schedule => schedule.id !== candidate.id);
  const sameDay = normalizedExisting.filter(schedule => schedule.dayId === candidate.dayId);
  const otherDays = normalizedExisting.filter(schedule => schedule.dayId !== candidate.dayId);
  let nextCandidate = clampSchedule(candidate);
  const containingSchedule = sortByStartSlot(sameDay).find(schedule => (
    schedule.startSlot <= nextCandidate.startSlot && nextCandidate.startSlot < endSlot(schedule)
  ));

  if (containingSchedule) {
    nextCandidate = { ...nextCandidate, startSlot: endSlot(containingSchedule) };
  }

  nextCandidate = moveCandidateAfterLockedBoundary(nextCandidate, sameDay);
  if (endSlot(nextCandidate) > SLOT_COUNT) return null;

  const combined = sortByStartSlot([...sameDay, nextCandidate]);
  const reflowed: T[] = [];
  let cursor = 0;

  for (const schedule of combined) {
    if (schedule.isTimeLocked) {
      if (schedule.startSlot < cursor) return null;
      reflowed.push(schedule);
      cursor = endSlot(schedule);
      continue;
    }

    let startSlot = Math.max(schedule.startSlot, cursor);
    const lockedBoundary = combined.find(item => (
      item.isTimeLocked && item.startSlot >= startSlot && item.id !== schedule.id
    ));

    if (lockedBoundary && startSlot + schedule.durationSlots > lockedBoundary.startSlot) {
      startSlot = endSlot(lockedBoundary);
    }

    const nextSchedule = clampSchedule({ ...schedule, startSlot });
    if (endSlot(nextSchedule) > SLOT_COUNT) return null;
    reflowed.push(nextSchedule);
    cursor = endSlot(nextSchedule);
  }

  const output = sortByStartSlot([...otherDays, ...reflowed]);
  return output.some(schedule => endSlot(schedule) > SLOT_COUNT) ? null : output;
}

export function moveSchedule(
  existing: TimelineSchedule[],
  scheduleId: string,
  dayId: string,
  startSlot: number
) {
  const schedule = existing.find(item => item.id === scheduleId);
  if (!schedule) return null;

  return insertSchedule(
    existing.filter(item => item.id !== scheduleId),
    { ...schedule, dayId, startSlot }
  );
}

export function resizeSchedule(existing: TimelineSchedule[], scheduleId: string, durationSlots: number) {
  const schedule = existing.find(item => item.id === scheduleId);
  if (!schedule) return null;

  return insertSchedule(
    existing.filter(item => item.id !== scheduleId),
    { ...schedule, durationSlots }
  );
}
