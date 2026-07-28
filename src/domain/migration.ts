import type {
  Activity,
  ActivitySchedule,
  Archive,
  ArchiveTravel,
  LegacyPlan,
  LegacyPlanCard,
  LegacyPlanDay,
  Trip
} from "./roadbook";
import { insertSchedule, slotFromTime } from "./timeline-engine";

type LegacyTravel = Omit<ArchiveTravel, "roadbook"> & { editablePlan?: LegacyPlan };
type LegacyArchive = { travels?: LegacyTravel[]; selectedTravelId?: string };

function titleFromCard(card: LegacyPlanCard) {
  const text = card.blocks?.find(block => block.kind === "text")?.value;
  return typeof text === "string" && text.trim() ? text.trim() : "未命名活动";
}

function datesFromPlan(days: LegacyPlanDay[]) {
  const dates = days.map(day => day.date).filter(Boolean);
  return {
    startDate: dates[0] ?? "2026-01-01",
    endDate: dates.at(-1) ?? dates[0] ?? "2026-01-01"
  };
}

function migrateTravel(travel: LegacyTravel): ArchiveTravel {
  const legacyDays = travel.editablePlan?.days ?? [];
  const activities: Activity[] = [];
  const schedules: ActivitySchedule[] = [];
  const { startDate, endDate } = datesFromPlan(legacyDays);

  for (const day of legacyDays) {
    for (const card of day.cards ?? []) {
      const activityId = `activity-${card.id}`;
      activities.push({ id: activityId, type: "activity", name: titleFromCard(card) });
      schedules.push({
        id: `schedule-${card.id}`,
        type: "activity",
        activityId,
        dayId: card.plannedDayId ?? day.id,
        startSlot: card.plannedTime ? slotFromTime(card.plannedTime) : 14,
        durationSlots: 1,
        isTimeLocked: false
      });
    }
  }

  const normalizedSchedule = legacyDays.flatMap(day => {
    const daySchedules = schedules.filter(schedule => schedule.dayId === day.id);
    return daySchedules.reduce<ActivitySchedule[]>((result, schedule) => insertSchedule(result, schedule) ?? result, []);
  });

  const roadbook: Trip = {
    id: travel.id,
    name: travel.title,
    startDate,
    endDate,
    currency: "CNY",
    people: 2,
    days: legacyDays.map((day, index) => ({ id: day.id, date: day.date, title: day.title, order: index, stays: [] })),
    activities,
    schedule: normalizedSchedule
  };

  return {
    id: travel.id,
    title: travel.title,
    destination: travel.destination,
    dates: travel.dates,
    status: travel.status ?? "planned",
    records: travel.records ?? [],
    roadbook,
    editablePlan: travel.editablePlan,
    recordingPlanSnapshot: travel.recordingPlanSnapshot
  };
}

export function migrateArchive(value: unknown): Archive {
  const candidate = value as Partial<Archive>;
  if (candidate.schemaVersion === 2 && Array.isArray(candidate.travels)) return candidate as Archive;

  const legacy = value as LegacyArchive;
  const travels = (legacy.travels ?? []).map(migrateTravel);
  return { schemaVersion: 2, travels, selectedTravelId: legacy.selectedTravelId ?? travels[0]?.id };
}

export function createDemoArchive(): Archive {
  return migrateArchive({
    selectedTravelId: "demo-trip",
    travels: [{
      id: "demo-trip",
      title: "奥地利湖区 10 日游",
      destination: "奥地利",
      dates: "2026-10-01 至 2026-10-10",
      status: "planned",
      records: [],
      editablePlan: {
        days: [{
          id: "day-1",
          date: "2026-10-01",
          title: "哈尔施塔特",
          cards: [{ id: "hallstatt", plannedDayId: "day-1", plannedTime: "09:00", blocks: [{ id: "hallstatt-text", kind: "text", value: "哈尔施塔特" }] }]
        }]
      }
    }]
  });
}
