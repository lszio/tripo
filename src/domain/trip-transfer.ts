import type { ArchiveTravel, ScheduledNode } from "./roadbook";

export type TravelExport = {
  format: "go-travel-trip";
  version: 1;
  exportedAt: string;
  travel: ArchiveTravel;
};

function cloneTravel(travel: ArchiveTravel) {
  return JSON.parse(JSON.stringify(travel)) as ArchiveTravel;
}

function createId(prefix: string, usedIds: Set<string>) {
  let id = "";
  do {
    const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    id = `${prefix}-${suffix}`;
  } while (usedIds.has(id));
  usedIds.add(id);
  return id;
}

function isTravelExport(value: unknown): value is TravelExport {
  const candidate = value as Partial<TravelExport>;
  const travel = candidate.travel as Partial<ArchiveTravel> | undefined;
  return candidate?.format === "go-travel-trip" && candidate.version === 1 && typeof candidate.exportedAt === "string" && typeof travel?.id === "string" && typeof travel.title === "string" && typeof travel.roadbook?.id === "string" && Array.isArray(travel.roadbook.days) && Array.isArray(travel.roadbook.activities) && Array.isArray(travel.roadbook.schedule);
}

function remapSchedule(node: ScheduledNode, dayIds: Map<string, string>, activityIds: Map<string, string>, stayIds: Map<string, string>, scheduleIds: Map<string, string>, usedIds: Set<string>): ScheduledNode {
  const id = createId("schedule", usedIds);
  scheduleIds.set(node.id, id);

  if (node.type === "activity") return { ...node, id, dayId: dayIds.get(node.dayId) ?? node.dayId, activityId: activityIds.get(node.activityId) ?? node.activityId };
  if (node.type === "stay") return { ...node, id, dayId: dayIds.get(node.dayId) ?? node.dayId, stayId: stayIds.get(node.stayId) ?? node.stayId };
  return { ...node, id, dayId: dayIds.get(node.dayId) ?? node.dayId };
}

function remapTravel(travel: ArchiveTravel, existingTravelIds: Set<string>): ArchiveTravel {
  const next = cloneTravel(travel);
  const usedIds = new Set(existingTravelIds);
  next.id = createId("travel", usedIds);
  next.roadbook.id = createId("roadbook", usedIds);

  const dayIds = new Map<string, string>();
  const activityIds = new Map<string, string>();
  const stayIds = new Map<string, string>();
  const scheduleIds = new Map<string, string>();

  next.roadbook.days = next.roadbook.days.map(day => {
    const id = createId("day", usedIds);
    dayIds.set(day.id, id);
    return {
      ...day,
      id,
      stays: day.stays?.map(stay => {
        const stayId = createId("stay", usedIds);
        stayIds.set(stay.id, stayId);
        return { ...stay, id: stayId };
      })
    };
  });

  next.roadbook.activities = next.roadbook.activities.map(activity => {
    const id = createId("activity", usedIds);
    activityIds.set(activity.id, id);
    return { ...activity, id };
  });

  next.roadbook.schedule = next.roadbook.schedule.map(node => remapSchedule(node, dayIds, activityIds, stayIds, scheduleIds, usedIds));
  next.roadbook.schedule = next.roadbook.schedule.map(node => node.type === "route" ? {
    ...node,
    fromScheduleId: node.fromScheduleId ? scheduleIds.get(node.fromScheduleId) : undefined,
    toScheduleId: node.toScheduleId ? scheduleIds.get(node.toScheduleId) : undefined
  } : node);
  next.records = next.records.map(record => ({ ...record, id: createId("record", usedIds), actualDayId: dayIds.get(record.actualDayId) ?? record.actualDayId }));

  return next;
}

export function serializeTravel(travel: ArchiveTravel) {
  const payload: TravelExport = { format: "go-travel-trip", version: 1, exportedAt: new Date().toISOString(), travel };
  return JSON.stringify(payload, null, 2);
}

export function parseImportedTravel(raw: string, existingTravelIds: Set<string>) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("不支持的旅行方案文件");
  }

  if (!isTravelExport(parsed)) throw new Error("不支持的旅行方案文件");
  return remapTravel(parsed.travel, existingTravelIds);
}
