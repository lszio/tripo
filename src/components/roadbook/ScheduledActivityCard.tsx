import { useDraggable } from "@dnd-kit/core";
import { useRef } from "react";
import type { Activity, ActivitySchedule } from "../../domain/roadbook";
import { timeFromSlot } from "../../domain/timeline-engine";
import { durationFromPointerDelta } from "../../domain/timeline-resize";

type ScheduledActivityCardProps = {
  activity?: Activity;
  schedule: ActivitySchedule;
  timelineStartSlot?: number;
  onResize: (scheduleId: string, durationSlots: number) => void;
  onOpen: (scheduleId: string) => void;
  onDelete: (scheduleId: string) => void;
};

export function ScheduledActivityCard({ activity, schedule, timelineStartSlot = 0, onResize, onOpen, onDelete }: ScheduledActivityCardProps) {
  const resizeStart = useRef<{ y: number; duration: number } | undefined>(undefined);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `schedule-${schedule.id}`,
    data: { kind: "schedule", scheduleId: schedule.id }
  });
  const location = activity?.location?.name;
  const price = schedule.priceOverride ?? activity?.defaultPrice;
  const note = schedule.noteOverride ?? activity?.note;
  const showsDetails = schedule.durationSlots >= 4;
  const style = {
    top: `${(schedule.startSlot - timelineStartSlot) * 36}px`,
    height: `${schedule.durationSlots * 36}px`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    ...(activity?.image ? { backgroundImage: `linear-gradient(115deg, rgba(37, 27, 31, .96), rgba(58, 31, 30, .76)), url("${activity.image}")` } : {})
  };

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    resizeStart.current = { y: event.clientY, duration: schedule.durationSlots };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function resize(event: React.PointerEvent<HTMLButtonElement>) {
    const start = resizeStart.current;
    if (!start) return;
    onResize(schedule.id, durationFromPointerDelta(start.duration, event.clientY - start.y));
  }

  return (
    <article className="scheduled-activity-card" data-compact={schedule.durationSlots < 2} data-expanded={showsDetails} data-schedule-id={schedule.id} data-testid="scheduled-activity" onDoubleClick={() => onOpen(schedule.id)} ref={setNodeRef} style={style} {...attributes}>
      <div className="timeline-card-content">
        <div className="timeline-card-heading">
          <div className="timeline-card-title-group">
            <strong>{activity?.name ?? "已删除活动"}</strong>
            {location && <span className="timeline-card-subtitle">{location}</span>}
          </div>
          <time className="timeline-card-time">{timeFromSlot(schedule.startSlot)}</time>
        </div>
        <div className="timeline-card-summary">
          <span><b>时长</b>{schedule.durationSlots * 30} 分钟</span>
          {price && <span><b>费用</b>{price.currency} {price.amount}</span>}
        </div>
        {showsDetails && <div className="timeline-card-details">{activity?.tags?.length ? <span>{activity.tags.join(" · ")}</span> : null}{note && <p>{note}</p>}</div>}
      </div>
      <div className="card-duration-actions">
        <button aria-label="缩短30分钟" onClick={event => { event.stopPropagation(); onResize(schedule.id, schedule.durationSlots - 1); }} type="button">−</button>
        <button aria-label="延长30分钟" onClick={event => { event.stopPropagation(); onResize(schedule.id, schedule.durationSlots + 1); }} type="button">＋</button>
        <button aria-label="删除本次排期" onClick={event => { event.stopPropagation(); onDelete(schedule.id); }} type="button">×</button>
      </div>
      <button aria-label={`拖动 ${activity?.name ?? "已删除活动"}`} className="card-drag-handle" onClick={event => event.stopPropagation()} type="button" {...listeners}>⠿</button>
      <button aria-label="拖拽调整时长" className="card-resize-handle" onClick={event => event.stopPropagation()} onPointerDown={startResize} onPointerMove={resize} onPointerUp={() => { resizeStart.current = undefined; }} type="button" />
    </article>
  );
}
