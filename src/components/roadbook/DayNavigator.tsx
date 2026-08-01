import type { Day } from "../../domain/roadbook";

type DayNavigatorProps = {
  days: Day[];
  selectedDayId: string;
  onSelect: (dayId: string) => void;
  onCopyDay?: (dayId: string) => void;
  onPasteDay?: (dayId: string) => void;
  canPaste?: boolean;
  copiedDayId?: string;
};

function labelForDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function CopyIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 16 16"><rect height="8" rx="1.4" stroke="currentColor" strokeWidth="1.35" width="7" x="6" y="5" /><path d="M10 4.25V3.7c0-.94-.76-1.7-1.7-1.7H3.7C2.76 2 2 2.76 2 3.7v4.6c0 .94.76 1.7 1.7 1.7h.55" stroke="currentColor" strokeWidth="1.35" /></svg>;
}

function PasteIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 16 16"><path d="M5 3.5h6.3c.94 0 1.7.76 1.7 1.7v6.1c0 .94-.76 1.7-1.7 1.7H5.2c-.94 0-1.7-.76-1.7-1.7V5.2c0-.94.76-1.7 1.7-1.7Z" stroke="currentColor" strokeWidth="1.35" /><path d="M6.5 2.2h3v2h-3zM5.9 8h4.2M8 5.9V10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.35" /></svg>;
}

export function DayNavigator({ days, selectedDayId, onSelect, onCopyDay, onPasteDay, canPaste = false, copiedDayId }: DayNavigatorProps) {
  const orderedDays = days.slice().sort((left, right) => left.order - right.order);

  return (
    <nav className="day-navigator" aria-label="行程天数">
      <div className="day-list">
      {orderedDays.map(day => {
        const label = labelForDate(day.date);
        const isSelected = day.id === selectedDayId;
        return <div className="day-tab" data-selected={isSelected} key={day.id}>
          <button aria-pressed={isSelected} className="day-tab-date" onClick={() => onSelect(day.id)} type="button">{label}</button>
          {(onCopyDay || onPasteDay) && <span className="day-plan-actions">
            {onCopyDay && <button aria-label={`复制 ${label}`} className="day-plan-icon" onClick={() => onCopyDay(day.id)} title="复制当天行程" type="button"><CopyIcon /></button>}
            {onPasteDay && <button aria-label={`粘贴到 ${label}`} className="day-plan-icon" disabled={!canPaste || copiedDayId === day.id} onClick={() => onPasteDay(day.id)} title="粘贴行程到这一天" type="button"><PasteIcon /></button>}
          </span>}
        </div>;
      })}
      </div>
    </nav>
  );
}
