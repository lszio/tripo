import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Day, StayNode } from "../../domain/roadbook";

type StayCardProps = {
  day: Day;
  onCreate: () => void;
  onOpen: (stayId: string) => void;
  onSetPrimary?: (dayId: string, stayId: string) => void;
  onDelete?: (dayId: string, stayId: string, name: string) => void;
};

function StayOption({ dayId, stay, onDelete, onOpen, onSetPrimary }: {
  dayId: string;
  stay: StayNode;
  onDelete: (dayId: string, stayId: string, name: string) => void;
  onOpen: (stayId: string) => void;
  onSetPrimary: (dayId: string, stayId: string) => void;
}) {
  const isPrimary = Boolean(stay.isPrimary);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `stay-${dayId}-${stay.id}`, data: { kind: "stay", stayId: stay.id }, disabled: !isPrimary });
  return (
    <li className={isPrimary ? "stay-option is-primary" : "stay-option"} ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }} {...attributes}>
      <button aria-label={`编辑住宿 ${stay.name}`} className="stay-overview" onClick={() => onOpen(stay.id)} type="button"><strong>{stay.name}</strong><span>{stay.location?.name ?? "未设置位置"}</span>{stay.price && <small>{stay.price.currency} {stay.price.amount}{stay.price.unit === "night" ? " / 晚" : ""}</small>}</button>
      <label className="stay-primary-choice"><input aria-label={`当前住宿 ${stay.name}`} checked={isPrimary} name={`primary-stay-${dayId}`} onChange={() => onSetPrimary(dayId, stay.id)} type="radio" />当前住宿</label>
      <button aria-label={`删除住宿 ${stay.name}`} className="stay-delete-button" onClick={() => onDelete(dayId, stay.id, stay.name)} type="button">×</button>
      <button aria-label={`拖动住宿 ${stay.name}`} className="stay-drag-handle" disabled={!isPrimary} onClick={event => event.stopPropagation()} type="button" {...listeners}>⠿</button>
    </li>
  );
}

export function StayCard({ day, onCreate, onOpen, onSetPrimary = () => undefined, onDelete = () => undefined }: StayCardProps) {
  const stays = day.stays ?? [];
  return (
    <section aria-label="今日住宿" className="stay-card">
      <header><h2>今日住宿</h2><button onClick={onCreate} type="button">添加住宿</button></header>
      {stays.length ? <ul className="stay-option-list">{stays.map(stay => <StayOption dayId={day.id} key={stay.id} onDelete={onDelete} onOpen={onOpen} onSetPrimary={onSetPrimary} stay={stay} />)}</ul> : <button className="stay-empty-action" onClick={onCreate} type="button">添加今日住宿</button>}
    </section>
  );
}
