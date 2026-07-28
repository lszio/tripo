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

export function DayNavigator({ days, selectedDayId, onSelect, onCopyDay, onPasteDay, canPaste = false, copiedDayId }: DayNavigatorProps) {
  const orderedDays = days.slice().sort((left, right) => left.order - right.order);

  return (
    <nav className="day-navigator" aria-label="行程天数">
      <div className="day-list">
      {orderedDays.map(day => {
        const label = labelForDate(day.date);
        return <div className="day-tab" key={day.id}>
          <button aria-pressed={day.id === selectedDayId} onClick={() => onSelect(day.id)} type="button">{label}</button>
          {(onCopyDay || onPasteDay) && <span className="day-plan-actions">
            {onCopyDay && <button aria-label={`复制 ${label}`} onClick={() => onCopyDay(day.id)} title="复制当天行程" type="button">⧉</button>}
            {onPasteDay && <button aria-label={`粘贴到 ${label}`} disabled={!canPaste || copiedDayId === day.id} onClick={() => onPasteDay(day.id)} title="粘贴行程到这一天" type="button">⎘</button>}
          </span>}
        </div>;
      })}
      </div>
    </nav>
  );
}
