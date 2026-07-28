# Roadbook Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing trip-plan card grid with a React roadbook editor while keeping the travel library, trip records, and browser-local persistence usable.

**Architecture:** Move the page shell to React and TypeScript, while keeping archived travel and record data behind a local archive adapter. Keep reusable `Activity` content separate from `ActivitySchedule` instances; put all slot arithmetic and conflict resolution in pure `TimelineEngine` functions. React components render and dispatch store actions only; the Zustand store commits finished detail drafts to the archive adapter.

**Tech Stack:** React, TypeScript, Vite, Zustand, dnd-kit, Vitest, React Testing Library, CSS custom properties, `localStorage`.

## Global Constraints

- Preserve the existing travel library and record workspace; do not remove their user-visible entry points.
- Do not add a server, authentication, cloud sync, map SDK, route search, navigation, AI import, or automatic route generation.
- Use only `startSlot` for `ActivitySchedule` ordering; do not add an activity-schedule `order` property.
- A day has 48 slots, one slot is 30 minutes, and a new schedule defaults to `durationSlots: 1`.
- Treat `isTimeLocked: true` schedules as immutable time boundaries during automatic reflow.
- The desktop editor is one workbench; the detail UI is a right-side drawer and becomes full-screen on mobile.
- Use a sans-serif UI with a warm-white surface, dark ink, one low-saturation accent, fine borders, clear focus styles, and 44px mobile targets.
- Preserve existing `localStorage` data through migration; never overwrite unreadable stored JSON.
- Do not create commits unless the user explicitly requests them.

---

## Planned File Structure

- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/styles/tokens.css`, `src/styles/app.css` — Vite entry point, React shell, and unified visual tokens.
- Create: `src/domain/roadbook.ts` — `Trip`, node, price, and archive TypeScript types.
- Create: `src/domain/timeline-engine.ts` — slot conversion, insert/reflow, resizing, and cross-Day movement.
- Create: `src/domain/budget.ts` — price normalization and category/day/trip budget summaries.
- Create: `src/domain/migration.ts` — conversion from `editablePlan.days[].cards[]` to V1 roadbook data.
- Create: `src/data/archive-storage.ts` — guarded `localStorage` loading/saving and migration handoff.
- Create: `src/store/roadbook-store.ts` — selected trip/day, drawer draft, and editor mutations.
- Create: `src/components/library/TravelLibrary.tsx`, `src/components/records/RecordWorkspace.tsx` — preserved archive routes.
- Create: `src/components/roadbook/*` — workbench, header, day navigation, material library, timeline, node cards, detail drawer, map preview, stay card, and budget panel.
- Create: `tests/domain/*.test.ts`, `tests/components/*.test.tsx` — domain and rendered-interaction coverage.
- Remove after the React equivalents pass: `src/app.js`, `src/state.js`, `styles.css`, and legacy `.mjs` tests.

## Task 1: Establish the React application shell

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`
- Create: `src/styles/tokens.css`, `src/styles/app.css`
- Modify: `index.html`
- Test: `tests/components/app-shell.test.tsx`

**Interfaces:**
- Consumes: no new application interfaces.
- Produces: `App`, `AppRoute`, and the `pnpm test` / `pnpm build` scripts used by all later tasks.

- [ ] **Step 1: Add the failing React shell test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../src/App";

it("renders the preserved travel and records entry points", () => {
  render(<App />);
  expect(screen.getByRole("link", { name: "我的旅行" })).toBeVisible();
  expect(screen.getByRole("link", { name: "旅行记录" })).toBeVisible();
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because `src/App.tsx` does not exist**

Run: `pnpm vitest run tests/components/app-shell.test.tsx`

- [ ] **Step 3: Add the Vite, TypeScript, and Vitest configuration**

Create `package.json` with the exact runtime dependencies `react`, `react-dom`, `zustand`, `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`; add development dependencies `vite`, `typescript`, `@vitejs/plugin-react`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@types/react`, and `@types/react-dom`.

Define scripts:

```json
{
  "dev": "vite",
  "build": "tsc --noEmit && vite build",
  "test": "vitest run"
}
```

Configure Vitest with `environment: "jsdom"`, `globals: false`, and test discovery under `tests/**/*.test.{ts,tsx}`. Configure `src/main.tsx` to mount `<App />` in `#app`.

- [ ] **Step 4: Implement the minimal persistent shell**

Export this route shape from `src/App.tsx`:

```ts
export type AppRoute = "travels" | "records" | "workspace";
export function App(): JSX.Element;
```

Render a sans-serif header with `我的旅行` and `旅行记录` links, a single `<main>`, and a temporary selected-route heading. Import `tokens.css` and `app.css` in `src/main.tsx`. Change `index.html` to load `src/main.tsx` rather than `src/app.js` and set its title to `自由行路书设计器`.

- [ ] **Step 5: Run focused and build checks**

Run: `pnpm vitest run tests/components/app-shell.test.tsx`

Run: `pnpm build`

Expected: the test passes and Vite produces a static production build.

## Task 2: Define roadbook types and implement TimelineEngine

**Files:**
- Create: `src/domain/roadbook.ts`, `src/domain/timeline-engine.ts`
- Test: `tests/domain/timeline-engine.test.ts`

**Interfaces:**
- Consumes: TypeScript runtime from Task 1.
- Produces: shared domain types and `slotFromTime`, `timeFromSlot`, `insertSchedule`, `moveSchedule`, and `resizeSchedule` for Tasks 3, 5, and 6.

- [ ] **Step 1: Write failing slot and reflow tests**

```ts
import { describe, expect, it } from "vitest";
import type { ActivitySchedule } from "../../src/domain/roadbook";
import { insertSchedule, slotFromTime } from "../../src/domain/timeline-engine";

const schedule = (id: string, startSlot: number, durationSlots: number, isTimeLocked = false): ActivitySchedule => ({
  id, type: "activity", activityId: `${id}-activity`, dayId: "day-1", startSlot, durationSlots, isTimeLocked
});

it("snaps 09:17 to slot 19 and uses one slot by default", () => {
  expect(slotFromTime("09:17")).toBe(19);
});

it("pushes later unlocked schedules without adding an order field", () => {
  const result = insertSchedule([schedule("breakfast", 16, 2)], schedule("museum", 18, 2));
  expect(result?.map(item => [item.id, item.startSlot])).toEqual([["breakfast", 16], ["museum", 18]]);
});

it("never moves a locked schedule", () => {
  const result = insertSchedule([schedule("locked", 18, 2, true)], schedule("coffee", 18, 1));
  expect(result?.find(item => item.id === "locked")?.startSlot).toBe(18);
});
```

- [ ] **Step 2: Run the test and confirm the engine module is missing**

Run: `pnpm vitest run tests/domain/timeline-engine.test.ts`

- [ ] **Step 3: Define the complete V1 roadbook type surface**

In `src/domain/roadbook.ts`, export these exact types: `Price`, `Location`, `Activity`, `ActivitySchedule`, `RouteSchedule`, `StayNode`, `Day`, `Trip`, `ScheduledNode`, `ActivityPriceOverride`, and `BudgetCategory`.

Ensure the important fields are exact:

```ts
export type Price = { amount: number; currency: string; unit: "total" | "person" | "night" };
export type ActivitySchedule = {
  id: string; type: "activity"; activityId: string; dayId: string;
  startSlot: number; durationSlots: number; isTimeLocked: boolean;
  priceOverride?: Price; noteOverride?: string;
};
export type Day = { id: string; date: string; title?: string; order: number; stays?: StayNode[] };
```

- [ ] **Step 4: Implement pure timeline operations**

Implement these signatures in `src/domain/timeline-engine.ts`:

```ts
export function slotFromTime(value: string): number;
export function timeFromSlot(slot: number): string;
export function clampSchedule(schedule: ActivitySchedule): ActivitySchedule;
export function insertSchedule(existing: ActivitySchedule[], candidate: ActivitySchedule): ActivitySchedule[] | null;
export function moveSchedule(existing: ActivitySchedule[], scheduleId: string, dayId: string, startSlot: number): ActivitySchedule[] | null;
export function resizeSchedule(existing: ActivitySchedule[], scheduleId: string, durationSlots: number): ActivitySchedule[] | null;
```

Clamp slots to `0..47` and duration to `1..48`. Sort solely by `startSlot`. Insert an instance after a card containing the candidate slot, otherwise before the first card starting at or after the candidate. Reflow only unlocked cards; treat a locked schedule as a barrier and place the candidate after it. Return `null` if every valid reflow would exceed slot 48. Do not mutate inputs.

- [ ] **Step 5: Expand tests for cross-Day and day-end boundaries, then run them**

Add tests proving an operation returns `null` when it would overflow 24:00, resizing never produces a duration below one, and `moveSchedule` returns a new array without changing the input array. Run: `pnpm vitest run tests/domain/timeline-engine.test.ts`

Expected: all TimelineEngine tests pass.

## Task 3: Add budgets, archive migration, and guarded persistence

**Files:**
- Create: `src/domain/budget.ts`, `src/domain/migration.ts`, `src/data/archive-storage.ts`
- Test: `tests/domain/budget.test.ts`, `tests/domain/migration.test.ts`, `tests/domain/archive-storage.test.ts`

**Interfaces:**
- Consumes: `Trip`, node types, and `TimelineEngine` from Task 2.
- Produces: `calculateTripBudget`, `calculateDayBudget`, `migrateArchive`, `loadArchive`, and `saveArchive` for Tasks 4–7.

- [ ] **Step 1: Write the failing price and migration tests**

```ts
it("multiplies person prices by the trip traveller count", () => {
  expect(normalizePrice({ amount: 200, currency: "CNY", unit: "person" }, 2, 1)).toBe(400);
});

it("migrates a legacy card without plannedTime to slot 14", () => {
  const result = migrateArchive(legacyArchive);
  expect(result.travels[0].roadbook.schedule[0]).toMatchObject({ startSlot: 14, durationSlots: 1, isTimeLocked: false });
});
```

- [ ] **Step 2: Run the domain tests and confirm the modules fail to resolve**

Run: `pnpm vitest run tests/domain/budget.test.ts tests/domain/migration.test.ts tests/domain/archive-storage.test.ts`

- [ ] **Step 3: Implement budget calculations with explicit units and categories**

Export:

```ts
export function normalizePrice(price: Price | undefined, people: number, nights: number): number;
export function calculateDayBudget(trip: Trip, dayId: string): BudgetSummary;
export function calculateTripBudget(trip: Trip): BudgetSummary;
```

`total` adds `amount`, `person` adds `amount * people`, and `night` adds `amount * nights`; a stay missing check-in/check-out counts as one night. For an activity, use `priceOverride` before `defaultPrice`. Include separate `activity`, `route`, `stay`, and `total` values in `BudgetSummary`.

- [ ] **Step 4: Implement migration and storage safety**

Use an archive-level `schemaVersion: 2`. `migrateArchive` must leave record data unchanged, convert each legacy plan card into one `Activity` plus one `ActivitySchedule`, assign the legacy day’s `order`, normalize schedules with `insertSchedule`, and preserve source fields that records rely on.

`loadArchive(storage)` must parse first and only call `saveArchive` after a successful migration. On invalid JSON, return `{ archive: createDemoArchive(), recoveryError: "无法读取本地旅行数据" }` without calling `storage.setItem`.

- [ ] **Step 5: Run the focused domain suite**

Run: `pnpm vitest run tests/domain/budget.test.ts tests/domain/migration.test.ts tests/domain/archive-storage.test.ts`

Expected: price units, repeated schedules, multiple stays, migration defaults, and failed storage parsing all pass.

## Task 4: Preserve travel-library and record-workspace routes in React

**Files:**
- Create: `src/components/library/TravelLibrary.tsx`, `src/components/records/RecordWorkspace.tsx`, `src/components/records/record-actions.ts`
- Modify: `src/App.tsx`, `src/data/archive-storage.ts`
- Test: `tests/components/travel-library.test.tsx`, `tests/components/record-workspace.test.tsx`

**Interfaces:**
- Consumes: archive loading/saving from Task 3.
- Produces: `TravelLibrary`, `RecordWorkspace`, and selected-trip route callbacks used by the roadbook workspace.

- [ ] **Step 1: Write failing preservation tests**

```tsx
it("opens a selected trip in the roadbook workspace", async () => {
  render(<App initialArchive={createDemoArchive()} />);
  await userEvent.click(screen.getByRole("button", { name: /查看旅行/ }));
  expect(screen.getByRole("heading", { name: "奥匈九日漫游" })).toBeVisible();
});

it("moves a record without changing its frozen plan snapshot", () => {
  const next = moveRecordToDay(activeTravel, "record-1", "day-2");
  expect(next.recordingPlanSnapshot).toEqual(activeTravel.recordingPlanSnapshot);
});
```

- [ ] **Step 2: Run the component tests and confirm the components do not exist**

Run: `pnpm vitest run tests/components/travel-library.test.tsx tests/components/record-workspace.test.tsx`

- [ ] **Step 3: Port only the retained archive behavior**

Implement `TravelLibrary` with travel cards, status, travel dates, route into the selected trip, and the existing records-only filter. Implement `RecordWorkspace` with the frozen-plan display, editable actual records, and a `moveRecordToDay(travel, recordId, dayId)` pure action that leaves `recordingPlanSnapshot` unchanged.

Replace the temporary shell route in `App` with routes `travels`, `records`, and `workspace`; persist only changed archive data via `saveArchive`.

- [ ] **Step 4: Run focused tests and the build**

Run: `pnpm vitest run tests/components/travel-library.test.tsx tests/components/record-workspace.test.tsx`

Run: `pnpm build`

Expected: legacy entry points remain visible and record mode preserves snapshots.

## Task 5: Build Day management, material library, and draft detail drawer

**Files:**
- Create: `src/store/roadbook-store.ts`
- Create: `src/components/roadbook/RoadbookWorkspace.tsx`, `TripHeader.tsx`, `DayNavigator.tsx`, `MaterialLibrary.tsx`, `NodeDetailDrawer.tsx`, `ActivityForm.tsx`, `ScheduleForm.tsx`, `RouteForm.tsx`, `StayForm.tsx`
- Test: `tests/components/roadbook-workspace.test.tsx`, `tests/components/node-detail-drawer.test.tsx`

**Interfaces:**
- Consumes: domain types, storage adapter, and app selection route from Tasks 2–4.
- Produces: `useRoadbookStore`, `RoadbookWorkspace`, `openActivityDraft`, `openScheduleDraft`, and `commitDraft` for Tasks 6–7.

- [ ] **Step 1: Write failing workbench and draft tests**

```tsx
it("keeps an activity in the material library after it is scheduled", async () => {
  render(<RoadbookWorkspace trip={trip} />);
  expect(screen.getByRole("button", { name: "哈尔施塔特" })).toBeVisible();
});

it("does not persist an edited draft until Save is clicked", async () => {
  render(<NodeDetailDrawer trip={trip} selectedNodeId="activity-1" />);
  await userEvent.clear(screen.getByLabelText("活动名称"));
  await userEvent.type(screen.getByLabelText("活动名称"), "新名称");
  await userEvent.click(screen.getByRole("button", { name: "取消" }));
  expect(trip.activities[0].name).not.toBe("新名称");
});
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `pnpm vitest run tests/components/roadbook-workspace.test.tsx tests/components/node-detail-drawer.test.tsx`

- [ ] **Step 3: Implement the Zustand editor state and Day actions**

Export a store factory:

```ts
export function createRoadbookStore(initialTrip: Trip, onCommit: (trip: Trip) => void): RoadbookStore;
```

The state must contain `trip`, `selectedDayId`, `drawer`, and `draft`. Implement `createDay`, `renameDay`, `deleteDay`, `reorderDays`, `selectDay`, `createActivity`, `updateActivity`, `deleteActivity`, `openDraft`, `discardDraft`, and `commitDraft`. Renumber `Day.order` after every Day mutation. `deleteActivity` must require `confirmDelete: true` if schedules reference its `activityId`, then remove its schedules only after that confirmation.

- [ ] **Step 4: Implement workbench panels and forms**

Render the header, day navigation, permanent material library, empty timeline mount point, and drawer shell in one `RoadbookWorkspace` page. Material library cards open `ActivityForm`; any scheduled-node card will open the matching schedule/route form. Forms must use controlled draft values and expose `保存`, `取消`, and an unsaved-change confirmation before closing.

- [ ] **Step 5: Run focused tests**

Run: `pnpm vitest run tests/components/roadbook-workspace.test.tsx tests/components/node-detail-drawer.test.tsx`

Expected: Day actions update the selected trip, materials are never removed by scheduling, and cancelling a draft never writes storage.

## Task 6: Implement DayTimeline, dnd-kit drag/drop, and duration editing

**Files:**
- Create: `src/components/roadbook/DayTimeline.tsx`, `TimeGrid.tsx`, `ScheduledActivityCard.tsx`, `RouteCard.tsx`, `timeline-dnd.ts`
- Modify: `src/store/roadbook-store.ts`, `src/components/roadbook/RoadbookWorkspace.tsx`
- Test: `tests/components/day-timeline.test.tsx`, `tests/components/timeline-dnd.test.tsx`

**Interfaces:**
- Consumes: `TimelineEngine` from Task 2 and store actions from Task 5.
- Produces: `scheduleActivity`, `moveActivitySchedule`, `resizeActivitySchedule`, and an accessible `DayTimeline` UI.

- [ ] **Step 1: Write failing timeline behavior tests**

```tsx
it("creates a 30-minute schedule from a material drop", () => {
  const next = scheduleActivity(trip, "activity-1", "day-1", 19);
  expect(next.schedule.at(-1)).toMatchObject({ dayId: "day-1", startSlot: 19, durationSlots: 1 });
});

it("renders schedules in start-slot order without an order field", () => {
  render(<DayTimeline trip={trip} dayId="day-1" />);
  expect(screen.getAllByTestId("scheduled-activity").map(card => card.dataset.scheduleId)).toEqual(["breakfast", "museum"]);
});
```

- [ ] **Step 2: Run focused tests and confirm missing timeline components**

Run: `pnpm vitest run tests/components/day-timeline.test.tsx tests/components/timeline-dnd.test.tsx`

- [ ] **Step 3: Render the 48-slot timeline with a 06:00 initial scroll position**

`TimeGrid` must render time labels generated from `timeFromSlot(0..47)` and expose the scrollable timeline region. On mount, set `scrollTop` to the element corresponding to slot 12 (06:00), without hiding slots 0–11. Position cards with `top = startSlot * slotHeight` and `height = durationSlots * slotHeight`.

- [ ] **Step 4: Wire drag/drop and keyboard interaction through TimelineEngine**

Use dnd-kit to make material cards draggable and each Day timeline a droppable surface. Convert the drop pointer Y coordinate to the nearest slot, call `scheduleActivity`, then call `insertSchedule`. For moving existing cards, call `moveSchedule`; for a resize-handle interaction call `resizeSchedule`. If an engine function returns `null`, leave state unchanged and show `当天没有可用时间` in an `aria-live` region. Add keyboard sensor support and buttons for keyboard users to move an instance 30 minutes earlier/later and to change Day.

Add these store action signatures before wiring components:

```ts
scheduleActivity(activityId: string, dayId: string, startSlot: number): void;
moveActivitySchedule(scheduleId: string, dayId: string, startSlot: number): void;
resizeActivitySchedule(scheduleId: string, durationSlots: number): void;
```

- [ ] **Step 5: Run focused tests**

Run: `pnpm vitest run tests/components/day-timeline.test.tsx tests/components/timeline-dnd.test.tsx`

Expected: material drops create independent instances, cross-Day moves retain the material, locked schedules do not move automatically, and duration cannot be less than one slot.

## Task 7: Add routes, stays, MapPreview, and BudgetPanel

**Files:**
- Create: `src/components/roadbook/MapPreview.tsx`, `BudgetPanel.tsx`, `StayCard.tsx`
- Modify: `src/components/roadbook/RoadbookWorkspace.tsx`, `NodeDetailDrawer.tsx`, `src/store/roadbook-store.ts`
- Test: `tests/components/map-preview.test.tsx`, `tests/components/budget-panel.test.tsx`, `tests/components/stay-card.test.tsx`

**Interfaces:**
- Consumes: schedules, `BudgetSummary`, and map locations from Tasks 2–6.
- Produces: an explicitly non-navigational MapPreview, independent BudgetPanel, and multi-stay Day editing.

- [ ] **Step 1: Write failing panel tests**

```tsx
it("shows only nodes with coordinates in MapPreview", () => {
  render(<MapPreview trip={trip} dayId="day-1" />);
  expect(screen.getByText("哈尔施塔特")).toBeVisible();
  expect(screen.getByText("未设置位置")).toBeVisible();
});

it("includes repeated activity schedules in the day budget", () => {
  render(<BudgetPanel trip={trip} dayId="day-1" />);
  expect(screen.getByText("¥560")).toBeVisible();
});
```

- [ ] **Step 2: Run focused tests and confirm the panel modules are missing**

Run: `pnpm vitest run tests/components/map-preview.test.tsx tests/components/budget-panel.test.tsx tests/components/stay-card.test.tsx`

- [ ] **Step 3: Implement manual routes and multiple stays**

Add store actions `createRoute`, `updateRoute`, `deleteRoute`, `addStay`, `updateStay`, `deleteStay`, and `setPrimaryStay`. V1-created routes must set `routeType: "manual"`. When moving or deleting an activity schedule referenced by a route, preserve the route and set `status: "invalid"`. Enforce at most one `isPrimary: true` stay in each Day.

- [ ] **Step 4: Implement the right-side panels**

`MapPreview` must render only current-Day locations with latitude/longitude, ordered by schedule time, with labeled dots and an SVG connecting line. Render `未设置位置` for each current-Day node without coordinates. Do not render a map tile, navigation link, route-distance value, or remote request.

`BudgetPanel` must render total trip budget, current-Day budget, and activity/route/stay categories using the Task 3 functions. `StayCard` renders the primary stay or the first stay; it opens `StayForm` in the existing drawer.

- [ ] **Step 5: Run focused tests**

Run: `pnpm vitest run tests/components/map-preview.test.tsx tests/components/budget-panel.test.tsx tests/components/stay-card.test.tsx`

Expected: the panels use only local trip data, price units are correctly reflected, and invalid routes remain visible as needing attention.

## Task 8: Apply responsive visual design and complete regression coverage

**Files:**
- Modify: `src/styles/tokens.css`, `src/styles/app.css`, `src/App.tsx`, all `src/components/roadbook/*.tsx`
- Delete: `src/app.js`, `src/state.js`, `styles.css`, `tests/*.test.mjs`
- Test: `tests/components/app-routes.test.tsx`, `tests/components/roadbook-mobile.test.tsx`, `tests/integration/persistence.test.tsx`

**Interfaces:**
- Consumes: all prior application components.
- Produces: the complete V1 editor and final regression evidence.

- [ ] **Step 1: Write failing regression tests**

```tsx
it("restores roadbook edits after reloading local storage", () => {
  const storage = createMemoryStorage();
  saveArchive(updatedArchive, storage);
  expect(loadArchive(storage).archive.travels[0].roadbook.activities[0].name).toBe("新名称");
});

it("uses a full-screen detail dialog on a narrow screen", () => {
  window.innerWidth = 390;
  render(<RoadbookWorkspace trip={trip} />);
  expect(screen.getByRole("dialog")).toHaveClass("detail-drawer--mobile");
});
```

- [ ] **Step 2: Run the regression tests and confirm the final responsive and persistence expectations fail**

Run: `pnpm vitest run tests/components/app-routes.test.tsx tests/components/roadbook-mobile.test.tsx tests/integration/persistence.test.tsx`

- [ ] **Step 3: Apply the final visual and accessibility rules**

Define semantic CSS variables for warm white, ink, muted ink, line, accent, focus ring, spacing, and sans-serif typography. Use CSS Grid for the desktop material/timeline/auxiliary workbench, collapse to a single-column mobile execution layout, and make the drawer full-screen at 860px and below. Preserve visible `:focus-visible` styles; make all primary mobile controls at least 44px tall; use `aria-label`, `aria-live`, dialog roles, and labelled form controls.

- [ ] **Step 4: Remove only superseded legacy modules and migrate their coverage**

Delete the old imperative renderer, old state module, old stylesheet, and `.mjs` tests only after the React route, record-workspace, migration, and persistence tests pass. Confirm no imports still reference `src/app.js`, `src/state.js`, or `styles.css` before deletion.

- [ ] **Step 5: Run the full test suite and production build**

Run: `pnpm test`

Run: `pnpm build`

Expected: all domain, component, integration, library, record-mode, migration, accessibility-state, and responsive tests pass; the production build completes without TypeScript errors.
