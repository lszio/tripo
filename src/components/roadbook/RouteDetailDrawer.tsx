import { useMemo, useState } from "react";
import type { ActivitySchedule, Price, RouteSchedule, Trip, Transport } from "../../domain/roadbook";
import { timeFromSlot } from "../../domain/timeline-engine";
import { ModalLayer } from "./ModalLayer";

type RouteDraft = {
  fromScheduleId: string;
  toScheduleId: string;
  transport: Transport;
  startSlot: string;
  durationSlots: string;
  priceAmount: string;
  priceCurrency: string;
  priceUnit: Price["unit"];
};

function toDraft(route: RouteSchedule): RouteDraft {
  return { fromScheduleId: route.fromScheduleId ?? "", toScheduleId: route.toScheduleId ?? "", transport: route.transport ?? "other", startSlot: String(route.startSlot ?? 16), durationSlots: String(route.durationSlots ?? 1), priceAmount: route.price?.amount.toString() ?? "", priceCurrency: route.price?.currency ?? "CNY", priceUnit: route.price?.unit ?? "total" };
}

export function RouteDetailDrawer({ trip, route, onClose, onSave }: { trip: Trip; route: RouteSchedule; onClose: () => void; onSave: (route: RouteSchedule) => void }) {
  const [draft, setDraft] = useState(() => toDraft(route));
  const activities = useMemo(() => trip.schedule.filter((node): node is ActivitySchedule => node.type === "activity" && node.dayId === route.dayId).sort((left, right) => left.startSlot - right.startSlot), [route.dayId, trip.schedule]);
  const activityById = useMemo(() => new Map(trip.activities.map(activity => [activity.id, activity])), [trip.activities]);
  const update = (key: keyof RouteDraft, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const priceAmount = Number(draft.priceAmount);
  const price = draft.priceAmount.trim() && Number.isFinite(priceAmount) ? { amount: priceAmount, currency: draft.priceCurrency.trim() || "CNY", unit: draft.priceUnit } : undefined;
  const startSlot = Math.max(0, Math.min(47, Number(draft.startSlot) || 0));
  const durationSlots = Math.max(1, Math.min(48 - startSlot, Number(draft.durationSlots) || 1));

  return (
    <ModalLayer variant="drawer"><aside aria-label="交通详情" className="detail-drawer" role="dialog">
      <header><h2>交通详情</h2><button aria-label="关闭交通详情" onClick={onClose} type="button">×</button></header>
      <label>出发活动<select aria-label="出发活动" onChange={event => update("fromScheduleId", event.target.value)} value={draft.fromScheduleId}><option value="">未关联活动</option>{activities.map(schedule => <option key={schedule.id} value={schedule.id}>{timeFromSlot(schedule.startSlot)} · {activityById.get(schedule.activityId)?.name ?? "已删除活动"}</option>)}</select></label>
      <label>到达活动<select aria-label="到达活动" onChange={event => update("toScheduleId", event.target.value)} value={draft.toScheduleId}><option value="">未关联活动</option>{activities.map(schedule => <option key={schedule.id} value={schedule.id}>{timeFromSlot(schedule.startSlot)} · {activityById.get(schedule.activityId)?.name ?? "已删除活动"}</option>)}</select></label>
      <div className="drawer-field-row"><label>交通方式<select aria-label="交通方式" onChange={event => update("transport", event.target.value)} value={draft.transport}><option value="walk">步行</option><option value="train">火车</option><option value="car">驾车</option><option value="flight">航班</option><option value="other">其他</option></select></label><label>开始时间<select aria-label="交通开始时间" onChange={event => update("startSlot", event.target.value)} value={draft.startSlot}>{Array.from({ length: 48 }, (_, slot) => <option key={slot} value={slot}>{timeFromSlot(slot)}</option>)}</select></label></div>
      <label>持续时间（30分钟为一格）<input aria-label="交通持续时间" inputMode="numeric" min="1" onChange={event => update("durationSlots", event.target.value)} type="number" value={draft.durationSlots} /></label>
      <div className="drawer-field-row"><label>价格<input aria-label="交通价格" inputMode="decimal" onChange={event => update("priceAmount", event.target.value)} value={draft.priceAmount} /></label><label>价格币种<input aria-label="交通价格币种" onChange={event => update("priceCurrency", event.target.value)} value={draft.priceCurrency} /></label></div>
      <label>计价方式<select aria-label="交通计价方式" onChange={event => update("priceUnit", event.target.value)} value={draft.priceUnit}><option value="total">总价</option><option value="person">每人</option></select></label>
      <footer><button onClick={onClose} type="button">取消</button><button onClick={() => onSave({ ...route, fromScheduleId: draft.fromScheduleId || undefined, toScheduleId: draft.toScheduleId || undefined, transport: draft.transport, startSlot, durationSlots, price, routeType: "manual", status: "valid" })} type="button">保存</button></footer>
    </aside></ModalLayer>
  );
}
