import { getActiveDays } from "./calendar-days";
import type { ActivitySchedule, Location, StaySchedule, Trip } from "./roadbook";

export type MapDay = {
  id: string;
  date: string;
  color: string;
};

export type MapNode = {
  id: string;
  dayId: string;
  name: string;
  location?: Location;
  startSlot: number;
  color: string;
  index: number;
};

export type LocatedMapNode = MapNode & { location: Location & { latitude: number; longitude: number } };

export type MapRouteSegment = {
  id: string;
  from: LocatedMapNode;
  to: LocatedMapNode;
  fromDayId: string;
  toDayId: string;
  color: string;
};

const dayColors = ["#bf756c", "#c69a58", "#7f9f68", "#669fa2", "#708fc0", "#9278b0", "#b67896"];

function hasCoordinates(node: MapNode): node is LocatedMapNode {
  return node.location?.latitude !== undefined && node.location.longitude !== undefined;
}

function isMapSchedule(node: Trip["schedule"][number]): node is ActivitySchedule | StaySchedule {
  return node.type === "activity" || node.type === "stay";
}

export function getMapDays(trip: Trip): MapDay[] {
  return getActiveDays(trip).map((day, index) => ({ id: day.id, date: day.date, color: dayColors[index % dayColors.length] }));
}

export function getDayMapNodes(trip: Trip, dayId: string): MapNode[] {
  const activityById = new Map(trip.activities.map(activity => [activity.id, activity]));
  const stayById = new Map(trip.days.find(day => day.id === dayId)?.stays?.map(stay => [stay.id, stay]) ?? []);
  const color = getMapDays(trip).find(day => day.id === dayId)?.color ?? dayColors[0];

  return trip.schedule
    .filter(isMapSchedule)
    .filter(node => node.dayId === dayId)
    .sort((left, right) => left.startSlot - right.startSlot || left.id.localeCompare(right.id))
    .map((schedule, index): MapNode => {
      if (schedule.type === "activity") {
        const activity = activityById.get(schedule.activityId);
        return { id: schedule.id, dayId, name: activity?.location?.name ?? activity?.name ?? "已删除活动", location: activity?.location, startSlot: schedule.startSlot, color, index: index + 1 };
      }
      const stay = stayById.get(schedule.stayId);
      return { id: schedule.id, dayId, name: stay?.location?.name ?? stay?.name ?? "已删除住宿", location: stay?.location, startSlot: schedule.startSlot, color, index: index + 1 };
    });
}

export function getMapSegments(nodes: MapNode[]): MapRouteSegment[] {
  const locatedNodes = nodes.filter(hasCoordinates);
  return locatedNodes.slice(1).map((to, index): MapRouteSegment => {
    const from = locatedNodes[index];
    return { id: `${from.id}-${to.id}`, from, to, fromDayId: from.dayId, toDayId: to.dayId, color: from.color };
  });
}

export function getTripMapRoute(trip: Trip) {
  const days = getMapDays(trip);
  const nodes = days.flatMap(day => getDayMapNodes(trip, day.id));
  const locatedNodes = nodes.filter(hasCoordinates);
  const segments = getMapSegments(nodes);
  return { days, nodes, locatedNodes, segments };
}
