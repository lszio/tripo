import { useEffect, useMemo, useState } from "react";
import { calculateDayBudget, calculateTripBudget, SUPPORTED_BUDGET_CURRENCIES } from "../../domain/budget";
import type { Trip } from "../../domain/roadbook";

type BudgetPanelProps = {
  trip: Trip;
  dayId: string;
};

function money(amount: number, currency: string) {
  const prefix = currency === "CNY" ? "¥" : currency === "EUR" ? "€" : `${currency} `;
  return `${prefix}${amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

export function BudgetPanel({ trip, dayId }: BudgetPanelProps) {
  const [currency, setCurrency] = useState(trip.currency);
  const currencies = useMemo(() => Array.from(new Set([trip.currency, "CNY", "EUR", ...trip.activities.map(activity => activity.defaultPrice?.currency ?? ""), ...trip.schedule.map(node => node.type === "activity" ? node.priceOverride?.currency ?? "" : node.type === "route" ? node.price?.currency ?? "" : ""), ...trip.days.flatMap(day => day.stays ?? []).map(stay => stay.price?.currency ?? "")])).filter(value => SUPPORTED_BUDGET_CURRENCIES.includes(value.toUpperCase())), [trip]);
  useEffect(() => setCurrency(trip.currency), [trip.currency]);
  const day = calculateDayBudget(trip, dayId, currency);
  const total = calculateTripBudget(trip, currency);
  return (
    <section aria-label="预算" className="budget-panel">
      <header><h2>预算</h2><label>预算币种<select aria-label="预算币种" onChange={event => setCurrency(event.target.value)} value={currency}>{currencies.map(value => <option key={value} value={value}>{value}</option>)}</select></label></header>
      <span className="budget-total-label">总预算 {money(total.total, total.currency)}</span>
      <strong>{money(day.total, day.currency)}</strong>
      <dl>
        <div><dt>活动</dt><dd>{money(day.activity, day.currency)}</dd></div>
        <div><dt>交通</dt><dd>{money(day.route, day.currency)}</dd></div>
        <div><dt>住宿</dt><dd>{money(day.stay, day.currency)}</dd></div>
      </dl>
      <p className="budget-rate-note">按本地参考汇率估算</p>
    </section>
  );
}
