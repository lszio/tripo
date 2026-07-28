const SLOT_HEIGHT = 36;

export function durationFromPointerDelta(initialDuration: number, deltaY: number) {
  return Math.max(1, initialDuration + Math.round(deltaY / SLOT_HEIGHT));
}
