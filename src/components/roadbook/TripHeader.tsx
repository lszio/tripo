import { useState } from "react";
import { calculateTripBudget } from "../../domain/budget";
import { getCalendarDates } from "../../domain/calendar-days";
import type { Trip } from "../../domain/roadbook";
import { ModalLayer } from "./ModalLayer";

type TripHeaderProps = {
  trip: Trip;
  onSave: (name: string, startDate: string, endDate: string, decision: "keep" | "delete") => void;
};

function money(amount: number, currency: string) {
  const prefix = currency === "CNY" ? "¥" : currency === "EUR" ? "€" : `${currency} `;
  return `${prefix}${amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

export function TripHeader({ trip, onSave }: TripHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(() => ({ name: trip.name, startDate: trip.startDate, endDate: trip.endDate }));
  const [isConfirming, setIsConfirming] = useState(false);
  const isValid = draft.name.trim() && draft.startDate && draft.endDate && draft.startDate <= draft.endDate;
  const isDateChange = draft.startDate !== trip.startDate || draft.endDate !== trip.endDate;
  const affectedDays = trip.days.filter(day => !getCalendarDates(draft.startDate, draft.endDate).includes(day.date));
  const totalBudget = calculateTripBudget(trip, trip.currency);
  const tripDays = getCalendarDates(trip.startDate, trip.endDate).length;

  function open() {
    setDraft({ name: trip.name, startDate: trip.startDate, endDate: trip.endDate });
    setIsConfirming(false);
    setIsOpen(true);
  }

  function submit() {
    if (!isValid) return;
    if (isDateChange) return setIsConfirming(true);
    onSave(draft.name, draft.startDate, draft.endDate, "keep");
    setIsOpen(false);
  }

  function resolve(decision: "keep" | "delete") {
    onSave(draft.name, draft.startDate, draft.endDate, decision);
    setIsConfirming(false);
    setIsOpen(false);
  }

  return (
    <header className="trip-header">
      <div className="trip-header-intro">
        <p className="eyebrow">自由行路书</p>
        <h1><button aria-label="编辑旅行" onClick={open} type="button">{trip.name}</button></h1>
        <p className="trip-header-meta">{trip.startDate} 至 {trip.endDate}<span>·</span>{trip.people} 人<span>·</span>{trip.currency}</p>
      </div>
      <section aria-label="行程概览" className="trip-overview">
        <div className="trip-overview-card is-budget"><span>预算统计</span><strong>{money(totalBudget.total, totalBudget.currency)}</strong><small>按本地参考汇率估算</small></div>
        <div className="trip-overview-card"><span>行程天数</span><strong>{tripDays}</strong><small>天</small></div>
        <div className="trip-overview-card"><span>已排期</span><strong>{trip.schedule.length}</strong><small>个节点</small></div>
      </section>
      <div className="trip-header-actions"><button onClick={open} type="button">旅行设置</button></div>
      {isOpen && (
        <ModalLayer variant="drawer">
          <aside aria-label="旅行设置" className="detail-drawer" role="dialog">
            <header><h2>旅行设置</h2><button aria-label="关闭旅行设置" onClick={() => setIsOpen(false)} type="button">×</button></header>
            <label>旅行名称<input aria-label="旅行名称" onChange={event => setDraft({ ...draft, name: event.target.value })} value={draft.name} /></label>
            <label>开始日期<input aria-label="开始日期" onChange={event => setDraft({ ...draft, startDate: event.target.value })} type="date" value={draft.startDate} /></label>
            <label>结束日期<input aria-label="结束日期" onChange={event => setDraft({ ...draft, endDate: event.target.value })} type="date" value={draft.endDate} /></label>
            <footer><button onClick={() => setIsOpen(false)} type="button">取消</button><button disabled={!isValid} onClick={submit} type="button">保存旅行设置</button></footer>
          </aside>
        </ModalLayer>
      )}
      {isConfirming && (
        <ModalLayer>
          <aside aria-label="日期范围变更" className="confirmation-dialog" role="dialog">
            <h2>日期范围变更</h2>
            <p>有 {affectedDays.length} 个日期和关联排期将离开当前行程。</p>
            <button onClick={() => resolve("keep")} type="button">保留排期</button>
            <button onClick={() => resolve("delete")} type="button">删除排期</button>
          </aside>
        </ModalLayer>
      )}
    </header>
  );
}
