import { createStore } from "zustand/vanilla";
import type { Activity, ActivitySchedule, RouteSchedule, ScheduledNode, StayNode, StaySchedule, TimelineSchedule, Trip } from "../domain/roadbook";
import { moveActivitySchedule, moveStaySchedule, resizeActivitySchedule, resizeTimelineSchedule, scheduleActivity, scheduleStay } from "../components/roadbook/timeline-actions";
import { getActiveDays, reconcileTripDateRange, type DateRangeDecision } from "../domain/calendar-days";
import { insertSchedule } from "../domain/timeline-engine";

type DayPlanClipboard = {
  sourceDayId: string;
  stays: StayNode[];
  schedule: ScheduledNode[];
};

function isTimelineSchedule(node: ScheduledNode): node is TimelineSchedule {
  return node.type === "activity" || node.type === "stay";
}

function createCopyId(prefix: string, index: number) {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${index}`;
}

export type RoadbookState = {
  trip: Trip;
  selectedDayId: string;
  dayPlanClipboard?: DayPlanClipboard;
  draftActivity?: Activity;
  draftStay?: { dayId: string; stay: StayNode };
  draftRoute?: RouteSchedule;
  selectDay: (dayId: string) => void;
  copyDayPlan: (dayId: string) => void;
  pasteDayPlan: (dayId: string) => void;
  commitTripSettings: (name: string, startDate: string, endDate: string, decision: DateRangeDecision) => void;
  createActivityDraft: () => void;
  reorderActivities: (activeId: string, overId: string) => void;
  openActivityDraft: (activityId: string) => void;
  closeDraft: () => void;
  commitActivity: (activity: Activity) => void;
  deleteActivity: (activityId: string) => void;
  createStayDraft: (dayId: string) => void;
  openStayDraft: (dayId: string, stayId: string) => void;
  closeStayDraft: () => void;
  commitStay: (dayId: string, stay: StayNode) => void;
  setPrimaryStay: (dayId: string, stayId: string) => void;
  deleteStay: (dayId: string, stayId: string) => void;
  createRouteDraft: (dayId: string) => void;
  openRouteDraft: (routeId: string) => void;
  closeRouteDraft: () => void;
  commitRoute: (route: RouteSchedule) => void;
  deleteRouteSchedule: (routeId: string) => void;
  timelineError?: string;
  scheduleActivity: (activityId: string, dayId: string, startSlot: number) => void;
  scheduleStay: (stayId: string, dayId: string, startSlot: number) => void;
  deleteActivitySchedule: (scheduleId: string) => void;
  deleteStaySchedule: (scheduleId: string) => void;
  moveActivitySchedule: (scheduleId: string, dayId: string, startSlot: number) => void;
  moveStaySchedule: (scheduleId: string, dayId: string, startSlot: number) => void;
  moveRouteSchedule: (routeId: string, dayId: string, startSlot: number) => void;
  resizeActivitySchedule: (scheduleId: string, durationSlots: number) => void;
  resizeTimelineSchedule: (scheduleId: string, durationSlots: number) => void;
};

function setPrimaryStayInTrip(trip: Trip, dayId: string, stayId: string, previousPrimaryId?: string) {
  const day = trip.days.find(item => item.id === dayId);
  const stays = day?.stays ?? [];
  if (!day || !stays.some(stay => stay.id === stayId)) return trip;
  const currentPrimaryId = previousPrimaryId ?? stays.find(stay => stay.isPrimary)?.id ?? stays[0]?.id;
  return {
    ...trip,
    days: trip.days.map(item => item.id === dayId ? { ...item, stays: stays.map(stay => ({ ...stay, isPrimary: stay.id === stayId })) } : item),
    schedule: trip.schedule.map(node => node.type === "stay" && node.dayId === dayId && node.stayId === currentPrimaryId ? { ...node, stayId } : node)
  };
}

export function createRoadbookStore(initialTrip: Trip, onCommit: (trip: Trip) => void) {
  return createStore<RoadbookState>((set, get) => ({
    trip: initialTrip,
    selectedDayId: getActiveDays(initialTrip)[0]?.id ?? "",
    selectDay: selectedDayId => set({ selectedDayId }),
    copyDayPlan: dayId => {
      const sourceDay = get().trip.days.find(day => day.id === dayId) ?? getActiveDays(get().trip).find(day => day.id === dayId);
      if (!sourceDay) return;
      set({ dayPlanClipboard: { sourceDayId: dayId, stays: (sourceDay.stays ?? []).map(stay => ({ ...stay })), schedule: get().trip.schedule.filter(node => node.dayId === dayId).map(node => ({ ...node })) } });
    },
    pasteDayPlan: dayId => {
      const clipboard = get().dayPlanClipboard;
      const currentTrip = get().trip;
      const targetDay = currentTrip.days.find(day => day.id === dayId) ?? getActiveDays(currentTrip).find(day => day.id === dayId);
      if (!clipboard || clipboard.sourceDayId === dayId || !targetDay) return;

      const stayIdMap = new Map<string, string>();
      const copiedStays = clipboard.stays.map((stay, index) => {
        const id = createCopyId("stay", index);
        stayIdMap.set(stay.id, id);
        return { ...stay, id, isPrimary: false };
      });
      const targetStays = targetDay.stays ?? [];
      if (!targetStays.some(stay => stay.isPrimary) && copiedStays.length) {
        const sourcePrimaryId = clipboard.stays.find(stay => stay.isPrimary)?.id ?? clipboard.stays[0]?.id;
        copiedStays.forEach(stay => { stay.isPrimary = stay.id === stayIdMap.get(sourcePrimaryId ?? ""); });
      }

      const scheduleIdMap = new Map(clipboard.schedule.map((schedule, index) => [schedule.id, createCopyId("schedule", index)]));
      const copiedTimeline = clipboard.schedule
        .filter(isTimelineSchedule)
        .sort((left, right) => left.startSlot - right.startSlot || left.id.localeCompare(right.id))
        .map(schedule => schedule.type === "activity"
          ? { ...schedule, id: scheduleIdMap.get(schedule.id)!, dayId }
          : { ...schedule, id: scheduleIdMap.get(schedule.id)!, dayId, stayId: stayIdMap.get(schedule.stayId) ?? schedule.stayId });

      let timeline = currentTrip.schedule.filter(isTimelineSchedule);
      for (const schedule of copiedTimeline) {
        const nextTimeline = insertSchedule(timeline, schedule);
        if (!nextTimeline) return set({ timelineError: "目标日期没有足够空间粘贴当天行程" });
        timeline = nextTimeline;
      }
      const copiedRoutes = clipboard.schedule.filter((schedule): schedule is RouteSchedule => schedule.type === "route").map(schedule => {
        const fromScheduleId = schedule.fromScheduleId ? scheduleIdMap.get(schedule.fromScheduleId) : undefined;
        const toScheduleId = schedule.toScheduleId ? scheduleIdMap.get(schedule.toScheduleId) : undefined;
        return { ...schedule, id: scheduleIdMap.get(schedule.id)!, dayId, fromScheduleId, toScheduleId, status: (schedule.fromScheduleId && !fromScheduleId) || (schedule.toScheduleId && !toScheduleId) ? "invalid" as const : schedule.status };
      });
      const nextTrip = {
        ...currentTrip,
        days: currentTrip.days.some(day => day.id === dayId)
          ? currentTrip.days.map(day => day.id === dayId ? { ...day, stays: [...targetStays, ...copiedStays] } : day)
          : [...currentTrip.days, { ...targetDay, stays: [...targetStays, ...copiedStays] }],
        schedule: [...currentTrip.schedule.filter(node => !isTimelineSchedule(node)), ...timeline, ...copiedRoutes]
      };
      set({ trip: nextTrip, selectedDayId: dayId, timelineError: undefined });
      onCommit(nextTrip);
    },
    commitTripSettings: (name, startDate, endDate, decision) => {
      const nextTrip = { ...reconcileTripDateRange(get().trip, startDate, endDate, decision), name: name.trim() };
      set({ trip: nextTrip, selectedDayId: getActiveDays(nextTrip)[0]?.id ?? "" });
      onCommit(nextTrip);
    },
    createActivityDraft: () => set({
      draftActivity: {
        id: globalThis.crypto?.randomUUID?.() ?? `activity-${Date.now()}`,
        type: "activity",
        name: ""
      }
    }),
    reorderActivities: (activeId, overId) => {
      const activities = get().trip.activities;
      const fromIndex = activities.findIndex(activity => activity.id === activeId);
      const toIndex = activities.findIndex(activity => activity.id === overId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
      const reordered = [...activities];
      const [activity] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, activity);
      const nextTrip = { ...get().trip, activities: reordered };
      set({ trip: nextTrip });
      onCommit(nextTrip);
    },
    openActivityDraft: activityId => {
      const activity = get().trip.activities.find(item => item.id === activityId);
      if (activity) set({ draftActivity: { ...activity } });
    },
    closeDraft: () => set({ draftActivity: undefined }),
    commitActivity: activity => {
      const nextTrip = {
        ...get().trip,
        activities: get().trip.activities.some(item => item.id === activity.id)
          ? get().trip.activities.map(item => item.id === activity.id ? activity : item)
          : [...get().trip.activities, activity]
      };
      set({ trip: nextTrip, draftActivity: undefined });
      onCommit(nextTrip);
    },
    deleteActivity: activityId => {
      const removedScheduleIds = new Set(get().trip.schedule.filter(node => node.type === "activity" && node.activityId === activityId).map(node => node.id));
      const nextTrip = {
        ...get().trip,
        activities: get().trip.activities.filter(activity => activity.id !== activityId),
        schedule: get().trip.schedule
          .filter(node => node.type !== "activity" || node.activityId !== activityId)
          .map(node => node.type === "route" && (removedScheduleIds.has(node.fromScheduleId ?? "") || removedScheduleIds.has(node.toScheduleId ?? "")) ? { ...node, status: "invalid" as const } : node)
      };
      set({ trip: nextTrip, draftActivity: undefined });
      onCommit(nextTrip);
    },
    createStayDraft: dayId => {
      const day = get().trip.days.find(item => item.id === dayId);
      if (!day) return;
      set({ draftStay: { dayId, stay: { id: globalThis.crypto?.randomUUID?.() ?? `stay-${Date.now()}`, type: "stay", name: "", isPrimary: !(day.stays?.length) } } });
    },
    openStayDraft: (dayId, stayId) => {
      const stay = get().trip.days.find(day => day.id === dayId)?.stays?.find(item => item.id === stayId);
      if (stay) set({ draftStay: { dayId, stay: { ...stay } } });
    },
    closeStayDraft: () => set({ draftStay: undefined }),
    commitStay: (dayId, stay) => {
      const currentTrip = get().trip;
      const nextTrip = {
        ...currentTrip,
        days: currentTrip.days.map(day => {
          if (day.id !== dayId) return day;
          const existingStays = day.stays ?? [];
          const stays = existingStays.some(item => item.id === stay.id) ? existingStays.map(item => item.id === stay.id ? stay : item) : [...existingStays, stay];
          const primaryId = stay.isPrimary ? stay.id : existingStays.find(item => item.isPrimary)?.id ?? stays[0]?.id;
          return { ...day, stays: stays.map(item => ({ ...item, isPrimary: item.id === primaryId })) };
        })
      };
      const primaryId = nextTrip.days.find(day => day.id === dayId)?.stays?.find(item => item.isPrimary)?.id;
      const previousPrimaryId = currentTrip.days.find(day => day.id === dayId)?.stays?.find(item => item.isPrimary)?.id;
      const normalizedTrip = primaryId ? setPrimaryStayInTrip(nextTrip, dayId, primaryId, previousPrimaryId) : nextTrip;
      set({ trip: normalizedTrip, draftStay: undefined });
      onCommit(normalizedTrip);
    },
    setPrimaryStay: (dayId, stayId) => {
      const nextTrip = setPrimaryStayInTrip(get().trip, dayId, stayId);
      if (nextTrip === get().trip) return;
      set({ trip: nextTrip, draftStay: undefined });
      onCommit(nextTrip);
    },
    deleteStay: (dayId, stayId) => {
      const nextTrip = {
        ...get().trip,
        days: get().trip.days.map(day => {
          if (day.id !== dayId) return day;
          const stays = (day.stays ?? []).filter(stay => stay.id !== stayId);
          const primaryId = stays.find(stay => stay.isPrimary)?.id ?? stays[0]?.id;
          return { ...day, stays: stays.map(stay => ({ ...stay, isPrimary: stay.id === primaryId })) };
        }),
        schedule: get().trip.schedule.filter(node => node.type !== "stay" || node.stayId !== stayId)
      };
      set({ trip: nextTrip, draftStay: undefined });
      onCommit(nextTrip);
    },
    createRouteDraft: dayId => {
      const daySchedules = get().trip.schedule.filter((node): node is ActivitySchedule => node.type === "activity" && node.dayId === dayId);
      const startSlot = Math.min(47, daySchedules.reduce((latest, schedule) => Math.max(latest, schedule.startSlot + schedule.durationSlots), 16));
      set({ draftRoute: { id: globalThis.crypto?.randomUUID?.() ?? `route-${Date.now()}`, type: "route", dayId, startSlot, durationSlots: 1, routeType: "manual", status: "valid" } });
    },
    openRouteDraft: routeId => {
      const route = get().trip.schedule.find((node): node is RouteSchedule => node.type === "route" && node.id === routeId);
      if (route) set({ draftRoute: { ...route } });
    },
    closeRouteDraft: () => set({ draftRoute: undefined }),
    commitRoute: route => {
      const nextTrip = {
        ...get().trip,
        schedule: get().trip.schedule.some(node => node.id === route.id)
          ? get().trip.schedule.map(node => node.id === route.id ? route : node)
          : [...get().trip.schedule, route]
      };
      set({ trip: nextTrip, draftRoute: undefined, selectedDayId: route.dayId });
      onCommit(nextTrip);
    },
    deleteRouteSchedule: routeId => {
      const nextTrip = { ...get().trip, schedule: get().trip.schedule.filter(node => node.id !== routeId) };
      set({ trip: nextTrip, draftRoute: undefined });
      onCommit(nextTrip);
    },
    scheduleActivity: (activityId, dayId, startSlot) => {
      const nextTrip = scheduleActivity(get().trip, activityId, dayId, startSlot);
      if (!nextTrip) return set({ timelineError: "当天没有可用时间" });
      set({ trip: nextTrip, selectedDayId: dayId, timelineError: undefined });
      onCommit(nextTrip);
    },
    scheduleStay: (stayId, dayId, startSlot) => {
      const nextTrip = scheduleStay(get().trip, stayId, dayId, startSlot);
      if (!nextTrip) return set({ timelineError: "请先设为当前住宿，或当天没有可用时间" });
      set({ trip: nextTrip, selectedDayId: dayId, timelineError: undefined });
      onCommit(nextTrip);
    },
    deleteActivitySchedule: scheduleId => {
      const nextTrip = {
        ...get().trip,
        schedule: get().trip.schedule
          .filter(node => node.id !== scheduleId)
          .map(node => node.type === "route" && (node.fromScheduleId === scheduleId || node.toScheduleId === scheduleId) ? { ...node, status: "invalid" as const } : node)
      };
      set({ trip: nextTrip });
      onCommit(nextTrip);
    },
    deleteStaySchedule: scheduleId => {
      const nextTrip = { ...get().trip, schedule: get().trip.schedule.filter(node => node.id !== scheduleId) };
      set({ trip: nextTrip });
      onCommit(nextTrip);
    },
    moveActivitySchedule: (scheduleId, dayId, startSlot) => {
      const nextTrip = moveActivitySchedule(get().trip, scheduleId, dayId, startSlot);
      if (!nextTrip) return set({ timelineError: "当天没有可用时间" });
      set({ trip: nextTrip, selectedDayId: dayId, timelineError: undefined });
      onCommit(nextTrip);
    },
    moveStaySchedule: (scheduleId, dayId, startSlot) => {
      const nextTrip = moveStaySchedule(get().trip, scheduleId, dayId, startSlot);
      if (!nextTrip) return set({ timelineError: "当天没有可用时间" });
      set({ trip: nextTrip, selectedDayId: dayId, timelineError: undefined });
      onCommit(nextTrip);
    },
    moveRouteSchedule: (routeId, dayId, startSlot) => {
      const nextTrip = { ...get().trip, schedule: get().trip.schedule.map(node => node.type === "route" && node.id === routeId ? { ...node, dayId, startSlot: Math.max(0, Math.min(47, startSlot)) } : node) };
      set({ trip: nextTrip, selectedDayId: dayId });
      onCommit(nextTrip);
    },
    resizeActivitySchedule: (scheduleId, durationSlots) => {
      const nextTrip = resizeActivitySchedule(get().trip, scheduleId, durationSlots);
      if (!nextTrip) return set({ timelineError: "当天没有可用时间" });
      set({ trip: nextTrip, timelineError: undefined });
      onCommit(nextTrip);
    },
    resizeTimelineSchedule: (scheduleId, durationSlots) => {
      const nextTrip = resizeTimelineSchedule(get().trip, scheduleId, durationSlots);
      if (!nextTrip) return set({ timelineError: "当天没有可用时间" });
      set({ trip: nextTrip, timelineError: undefined });
      onCommit(nextTrip);
    }
  }));
}
