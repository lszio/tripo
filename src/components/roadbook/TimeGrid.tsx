import { useDroppable } from "@dnd-kit/core";
import { timeFromSlot } from "../../domain/timeline-engine";

type TimeGridProps = {
  dayId: string;
  startSlot?: number;
  endSlot?: number;
};

function SlotDropzone({ dayId, slot }: { dayId: string; slot: number }) {
  const { isOver, setNodeRef } = useDroppable({ id: `slot-${dayId}-${slot}`, data: { dayId, slot } });
  return <div aria-label={timeFromSlot(slot)} className={isOver ? "timeline-slot is-over" : "timeline-slot"} ref={setNodeRef} />;
}

export function TimeGrid({ dayId, startSlot = 0, endSlot = 48 }: TimeGridProps) {
  return (
    <div className="time-grid">
      {Array.from({ length: endSlot - startSlot }, (_, index) => {
        const slot = startSlot + index;
        return (
        <div className="time-grid-row" data-half-hour={slot % 2 !== 0} key={slot}>
          {slot % 2 === 0 ? <time data-testid={`time-label-${slot}`}>{timeFromSlot(slot)}</time> : <span aria-hidden="true" className="time-grid-spacer" />}
          <SlotDropzone dayId={dayId} slot={slot} />
        </div>
        );
      })}
    </div>
  );
}
