import { useDraggable } from "@dnd-kit/core";
import { useRef } from "react";
import type { StayNode, StaySchedule } from "../../domain/roadbook";
import { timeFromSlot } from "../../domain/timeline-engine";
import { durationFromPointerDelta } from "../../domain/timeline-resize";

type ScheduledStayCardProps = {
  stay?: StayNode;
  schedule: StaySchedule;
  timelineStartSlot?: number;
  onResize: (scheduleId: string, durationSlots: number) => void;
  onOpen: (scheduleId: string) => void;
  onDelete: (scheduleId: string) => void;
};

export function ScheduledStayCard({ stay, schedule, timelineStartSlot = 0, onResize, onOpen, onDelete }: ScheduledStayCardProps) {
  const resizeStart = useRef<{ y: number; duration: number } | undefined>(undefined);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `stay-schedule-${schedule.id}`, data: { kind: "stay-schedule", scheduleId: schedule.id } });
  const style = {
    top: `${(schedule.startSlot - timelineStartSlot) * 36}px`,
    height: `${schedule.durationSlots * 36}px`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined
  };

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    resizeStart.current = { y: event.clientY, duration: schedule.durationSlots };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function resize(event: React.PointerEvent<HTMLButtonElement>) {
    const start = resizeStart.current;
    if (start) onResize(schedule.id, durationFromPointerDelta(start.duration, event.clientY - start.y));
  }

  return (
    <article className="scheduled-stay-card" data-testid="scheduled-stay" onDoubleClick={() => onOpen(schedule.id)} ref={setNodeRef} style={style} {...attributes}>
      <div className="timeline-card-content">
        <div className="timeline-card-heading"><div className="timeline-card-title-group"><strong>入住 · {stay?.name ?? "已删除住宿"}</strong>{stay?.location?.name && <span className="timeline-card-subtitle">{stay.location.name}</span>}</div><time className="timeline-card-time">{timeFromSlot(schedule.startSlot)}</time></div>
        <div className="timeline-card-summary"><span><b>时长</b>{schedule.durationSlots * 30} 分钟</span>{stay?.price && <span><b>费用</b>{stay.price.currency} {stay.price.amount}</span>}</div>
      </div>
      <div className="card-duration-actions"><button aria-label="缩短入住时长" onClick={event => { event.stopPropagation(); onResize(schedule.id, schedule.durationSlots - 1); }} type="button">−</button><button aria-label="延长入住时长" onClick={event => { event.stopPropagation(); onResize(schedule.id, schedule.durationSlots + 1); }} type="button">＋</button><button aria-label="删除入住排期" onClick={event => { event.stopPropagation(); onDelete(schedule.id); }} type="button">×</button></div>
      <button aria-label={`拖动入住 ${stay?.name ?? "已删除住宿"}`} className="card-drag-handle" onClick={event => event.stopPropagation()} type="button" {...listeners}>⠿</button>
      <button aria-label="拖拽调整入住时长" className="card-resize-handle" onClick={event => event.stopPropagation()} onPointerDown={startResize} onPointerMove={resize} onPointerUp={() => { resizeStart.current = undefined; }} type="button" />
    </article>
  );
}
