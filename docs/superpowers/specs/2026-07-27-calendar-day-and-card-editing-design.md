# Calendar Day and Card Editing Design

## Goal

Make the roadbook calendar-driven: a Day represents exactly one date inside the trip range. Complete activity fields, timeline card detail access, pointer-based duration resizing, and trip name/date editing.

## Day Model and Date Changes

- `Trip.startDate` and `Trip.endDate` are the only inputs for active Days.
- The UI derives one active Day per inclusive calendar date, ordered chronologically and displayed as a formatted date such as `10月1日 周四`.
- Day titles, manual Day creation, and manual Day sorting are removed.
- Existing `Day` records retain their IDs while their dates remain in the selected range.
- When a trip date range changes, show the number of affected Days and schedules before applying the change.
- **Keep:** retain out-of-range Days and their schedules as inactive data. Show their schedules in a muted `未纳入当前行程` area; they cannot be dragged or edited. Returning the date to the range restores them.
- **Delete:** remove out-of-range Days and all schedules belonging to them.
- A valid range requires both dates and `startDate <= endDate`.

## Trip Settings

- Clicking the trip title opens a settings drawer.
- The drawer edits `Trip.name`, `startDate`, and `endDate` as a draft.
- Saving a changed date range opens the affected-Day confirmation before committing.
- Cancelling retains the persisted trip unchanged.

## Activity Content

The activity drawer owns a draft of the full mother-card data:

- Required: `name`.
- Optional: location name, latitude, longitude, image URL, default price, tags, note, and external URL.
- Price includes amount, currency, and `total`, `person`, or `night` unit.
- Tags are entered as comma-separated text and persisted as trimmed, non-empty values.
- Image is a URL in V1; local upload is out of scope.

## Timeline Cards

- A scheduled activity card is clickable outside its drag and resize controls.
- Clicking opens a detail drawer containing read-only activity content and editable schedule fields: start slot, duration slots, time lock, optional price override, and optional note override.
- Cards retain the drag handle for moving and gain a bottom resize handle.
- Pointer movement on the resize handle snaps duration to 30-minute slots, never below one slot, and uses `TimelineEngine.resizeSchedule` to reflow unlocked cards or reject overflow.
- Card drag, resize, and click must not accidentally trigger one another.

## Verification

- Unit tests cover deriving calendar Days, date-range keep/delete behavior, full activity normalization, and resize slot snapping.
- Component tests cover trip settings, date-change confirmation, muted inactive schedules, activity field editing, card-detail opening, and pointer resizing.
- Existing persistence, timeline, and record-mode tests remain green.
