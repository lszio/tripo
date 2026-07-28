import { useDraggable } from "@dnd-kit/core";
import type { RouteSchedule } from "../../domain/roadbook";
import { timeFromSlot } from "../../domain/timeline-engine";

type RouteCardProps = {
  route: RouteSchedule;
  fromLabel?: string;
  toLabel?: string;
  timelineStartSlot: number;
  onOpen: (routeId: string) => void;
  onDelete: (routeId: string) => void;
};

const transportLabel = { walk: "步行", train: "火车", car: "驾车", flight: "航班", other: "其他" };

export function RouteCard({ route, fromLabel, toLabel, timelineStartSlot, onOpen, onDelete }: RouteCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `route-${route.id}`, data: { kind: "route", routeId: route.id } });
  const startSlot = route.startSlot ?? 16;
  const durationSlots = Math.max(1, route.durationSlots ?? 1);
  const style = { top: `${(startSlot - timelineStartSlot) * 36}px`, height: `${durationSlots * 36}px`, transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined };
  const label = `${fromLabel ?? "出发地"} → ${toLabel ?? "目的地"}`;
  return (
    <article className={route.status === "invalid" ? "route-card is-invalid" : "route-card"} data-testid="route-card" onDoubleClick={() => onOpen(route.id)} ref={setNodeRef} style={style} {...attributes}>
      <div><strong>{transportLabel[route.transport ?? "other"]}交通</strong><span>{label}</span></div>
      <time>{timeFromSlot(startSlot)} · {durationSlots * 30} 分钟</time>
      {route.price && <small>{route.price.currency} {route.price.amount}</small>}
      {route.status === "invalid" && <em>待处理</em>}
      <button aria-label="删除交通" onClick={event => { event.stopPropagation(); onDelete(route.id); }} type="button">×</button>
      <button aria-label="拖动交通" className="route-drag-handle" onClick={event => event.stopPropagation()} type="button" {...listeners}>⠿</button>
    </article>
  );
}
