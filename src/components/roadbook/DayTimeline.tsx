import { useDndMonitor } from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import type { ActivitySchedule, RouteSchedule, ScheduledNode, StaySchedule, Trip } from "../../domain/roadbook";
import { DEFAULT_TIMELINE_RANGE, expandTimelineRange, rangeForScheduledSlots, type TimelineRange } from "../../domain/timeline-range";
import { timeFromSlot } from "../../domain/timeline-engine";
import { ScheduledActivityCard } from "./ScheduledActivityCard";
import { ScheduledStayCard } from "./ScheduledStayCard";
import { RouteCard } from "./RouteCard";
import { TimeGrid } from "./TimeGrid";

type DayTimelineProps = {
  trip: Trip;
  dayId: string;
  onSchedule: (activityId: string, dayId: string, startSlot: number) => void;
  onMove: (scheduleId: string, dayId: string, startSlot: number) => void;
  onResize: (scheduleId: string, durationSlots: number) => void;
  onOpenSchedule?: (scheduleId: string) => void;
  onDeleteSchedule?: (scheduleId: string) => void;
  onOpenStaySchedule?: (scheduleId: string) => void;
  onDeleteStaySchedule?: (scheduleId: string) => void;
  onCreateRoute?: () => void;
  onOpenRoute?: (routeId: string) => void;
  onDeleteRoute?: (routeId: string) => void;
};

function nodeStartSlot(node: ScheduledNode) {
  return node.type === "route" ? node.startSlot ?? 16 : node.startSlot;
}

function nodeDuration(node: ScheduledNode) {
  return node.type === "route" ? node.durationSlots ?? 1 : node.durationSlots;
}

export function DayTimeline({ trip, dayId, onSchedule: _onSchedule, onMove: _onMove, onResize, onOpenSchedule = () => undefined, onDeleteSchedule = () => undefined, onOpenStaySchedule = () => undefined, onDeleteStaySchedule = () => undefined, onCreateRoute = () => undefined, onOpenRoute = () => undefined, onDeleteRoute = () => undefined }: DayTimelineProps) {
  const [timelineRange, setTimelineRange] = useState<TimelineRange>(DEFAULT_TIMELINE_RANGE);
  const [isFullDayVisible, setIsFullDayVisible] = useState(false);
  const schedules = useMemo(() => trip.schedule
    .filter((node): node is ActivitySchedule => node.type === "activity" && node.dayId === dayId)
    .sort((left, right) => left.startSlot - right.startSlot), [dayId, trip.schedule]);
  const nodes = useMemo(() => trip.schedule.filter(node => node.dayId === dayId).sort((left, right) => nodeStartSlot(left) - nodeStartSlot(right)), [dayId, trip.schedule]);
  const inactiveDayIds = new Set(trip.days.filter(day => day.isActive === false).map(day => day.id));
  const inactiveSchedules = trip.schedule.filter((node): node is ActivitySchedule => node.type === "activity" && inactiveDayIds.has(node.dayId));
  const activities = useMemo(() => new Map(trip.activities.map(activity => [activity.id, activity])), [trip.activities]);
  const stays = useMemo(() => new Map(trip.days.find(day => day.id === dayId)?.stays?.map(stay => [stay.id, stay]) ?? []), [dayId, trip.days]);

  useDndMonitor({
    onDragOver: event => {
      const target = event.over?.data.current;
      if (target?.dayId !== dayId || typeof target.slot !== "number" || isFullDayVisible) return;
      setTimelineRange(range => expandTimelineRange(range, target.slot));
    }
  });

  useEffect(() => {
    setIsFullDayVisible(false);
    setTimelineRange(rangeForScheduledSlots(nodes.flatMap(node => [nodeStartSlot(node), nodeStartSlot(node) + nodeDuration(node) - 1])));
  }, [dayId, nodes]);

  const visibleRange = isFullDayVisible ? { startSlot: 0, endSlot: 48 } : timelineRange;

  return (
    <section aria-label="时间轴" className="day-timeline">
      <header>
        <div><h2>时间轴</h2><span className="timeline-window-label">{timeFromSlot(visibleRange.startSlot)} – {timeFromSlot(visibleRange.endSlot % 48)}</span></div>
        <div className="timeline-tools"><span>30 分钟吸附</span><button onClick={onCreateRoute} type="button">添加交通</button><button aria-pressed={isFullDayVisible} onClick={() => setIsFullDayVisible(value => !value)} type="button">{isFullDayVisible ? "收起至常用时段" : "显示全天"}</button></div>
      </header>
        <div className="timeline-canvas" data-testid="timeline-canvas" style={{ minHeight: `${(visibleRange.endSlot - visibleRange.startSlot) * 36}px` }}>
          <TimeGrid dayId={dayId} endSlot={visibleRange.endSlot} startSlot={visibleRange.startSlot} />
          {nodes.map(node => node.type === "activity" ? (
            <ScheduledActivityCard activity={activities.get(node.activityId)} key={node.id} onDelete={onDeleteSchedule} onOpen={onOpenSchedule} onResize={onResize} schedule={node} timelineStartSlot={visibleRange.startSlot} />
          ) : node.type === "stay" ? (
            <ScheduledStayCard key={node.id} onDelete={onDeleteStaySchedule} onOpen={onOpenStaySchedule} onResize={onResize} schedule={node} stay={stays.get(node.stayId)} timelineStartSlot={visibleRange.startSlot} />
          ) : node.type === "route" ? (
            <RouteCard fromLabel={activities.get(schedules.find(schedule => schedule.id === node.fromScheduleId)?.activityId ?? "")?.name} key={node.id} onDelete={onDeleteRoute} onOpen={onOpenRoute} route={node as RouteSchedule} timelineStartSlot={visibleRange.startSlot} toLabel={activities.get(schedules.find(schedule => schedule.id === node.toScheduleId)?.activityId ?? "")?.name} />
          ) : null)}
        </div>
        {inactiveSchedules.length > 0 && (
          <section aria-label="未纳入当前行程" className="inactive-schedules">
            <h3>未纳入当前行程</h3>
            {inactiveSchedules.map(schedule => <p key={schedule.id}>{activities.get(schedule.activityId)?.name ?? "已删除活动"}</p>)}
          </section>
        )}
      </section>
  );
}
