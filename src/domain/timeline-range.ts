export type TimelineRange = {
  startSlot: number;
  endSlot: number;
};

export const DEFAULT_TIMELINE_RANGE: TimelineRange = { startSlot: 16, endSlot: 46 };

const EXTEND_BY_SLOTS = 4;

export function expandTimelineRange(range: TimelineRange, slot: number): TimelineRange {
  if (slot <= range.startSlot + 1 && range.startSlot > 0) {
    return { ...range, startSlot: Math.max(0, range.startSlot - EXTEND_BY_SLOTS) };
  }
  if (slot >= range.endSlot - 2 && range.endSlot < 48) {
    return { ...range, endSlot: Math.min(48, range.endSlot + EXTEND_BY_SLOTS) };
  }
  return range;
}

export function rangeForScheduledSlots(slots: number[]): TimelineRange {
  if (!slots.length) return DEFAULT_TIMELINE_RANGE;
  const earliestSlot = Math.min(...slots);
  const latestSlot = Math.max(...slots);
  return {
    startSlot: Math.max(0, Math.min(DEFAULT_TIMELINE_RANGE.startSlot, Math.floor(earliestSlot / EXTEND_BY_SLOTS) * EXTEND_BY_SLOTS)),
    endSlot: Math.min(48, Math.max(DEFAULT_TIMELINE_RANGE.endSlot, Math.ceil((latestSlot + 1) / EXTEND_BY_SLOTS) * EXTEND_BY_SLOTS))
  };
}
