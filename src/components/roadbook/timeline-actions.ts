import type { ActivitySchedule, StaySchedule, TimelineSchedule, Trip } from "../../domain/roadbook";
import { createActivitySchedule, createStaySchedule, insertSchedule, moveSchedule, resizeSchedule } from "../../domain/timeline-engine";

function isTimelineSchedule(node: Trip["schedule"][number]): node is TimelineSchedule {
  return node.type === "activity" || node.type === "stay";
}

function updateTimelineSchedules(trip: Trip, schedules: TimelineSchedule[]) {
  return {
    ...trip,
    schedule: [
      ...trip.schedule.filter(node => !isTimelineSchedule(node)),
      ...schedules
    ]
  };
}

function getTimelineSchedules(trip: Trip) {
  return trip.schedule.filter(isTimelineSchedule);
}

export function scheduleActivity(trip: Trip, activityId: string, dayId: string, startSlot: number): Trip | null {
  const result = insertSchedule(getTimelineSchedules(trip), createActivitySchedule(activityId, dayId, startSlot));
  return result ? updateTimelineSchedules(trip, result) : null;
}

export function moveActivitySchedule(trip: Trip, scheduleId: string, dayId: string, startSlot: number): Trip | null {
  const schedule = getTimelineSchedules(trip).find((node): node is ActivitySchedule => node.type === "activity" && node.id === scheduleId);
  if (!schedule) return null;
  const result = moveSchedule(getTimelineSchedules(trip), scheduleId, dayId, startSlot);
  return result ? updateTimelineSchedules(trip, result) : null;
}

export function resizeActivitySchedule(trip: Trip, scheduleId: string, durationSlots: number): Trip | null {
  const schedule = getTimelineSchedules(trip).find((node): node is ActivitySchedule => node.type === "activity" && node.id === scheduleId);
  if (!schedule) return null;
  const result = resizeSchedule(getTimelineSchedules(trip), scheduleId, Math.max(1, durationSlots));
  return result ? updateTimelineSchedules(trip, result) : null;
}

export function scheduleStay(trip: Trip, stayId: string, dayId: string, startSlot: number): Trip | null {
  const stay = trip.days.find(day => day.id === dayId)?.stays?.find(item => item.id === stayId);
  if (!stay?.isPrimary) return null;
  const result = insertSchedule(getTimelineSchedules(trip), createStaySchedule(stayId, dayId, startSlot));
  return result ? updateTimelineSchedules(trip, result) : null;
}

export function moveStaySchedule(trip: Trip, scheduleId: string, dayId: string, startSlot: number): Trip | null {
  const schedule = getTimelineSchedules(trip).find((node): node is StaySchedule => node.type === "stay" && node.id === scheduleId);
  if (!schedule) return null;
  const result = moveSchedule(getTimelineSchedules(trip), scheduleId, dayId, startSlot);
  return result ? updateTimelineSchedules(trip, result) : null;
}

export function resizeTimelineSchedule(trip: Trip, scheduleId: string, durationSlots: number): Trip | null {
  const schedule = getTimelineSchedules(trip).find(node => node.id === scheduleId);
  if (!schedule) return null;
  const result = resizeSchedule(getTimelineSchedules(trip), scheduleId, Math.max(1, durationSlots));
  return result ? updateTimelineSchedules(trip, result) : null;
}
