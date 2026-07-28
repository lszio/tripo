# Calendar Day and Card Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manually managed Days with date-derived Days and complete trip, activity, schedule, and timeline-card editing.

**Architecture:** Add pure calendar range helpers that reconcile a trip's stored Days and schedules without coupling UI concerns to state updates. Expand the Zustand store with atomic trip-date decisions and drawer draft state; components consume those actions and keep pointer resizing isolated in the timeline card.

**Tech Stack:** React 19, TypeScript, Zustand, dnd-kit, Vitest, Testing Library, Vite.

## Global Constraints

- Active Days are one per inclusive date in `Trip.startDate` through `Trip.endDate`.
- Out-of-range Days are either retained as inactive muted data or deleted with their schedules after user confirmation.
- All timeline calculations use 48 half-hour slots.
- Activity mother cards remain reusable and are never removed by scheduling.
- No map SDK, AI, cloud persistence, or image upload is added.

---

### Task 1: Calendar Day Reconciliation

**Files:**
- Create: `src/domain/calendar-days.ts`
- Modify: `src/domain/roadbook.ts`
- Test: `tests/domain/calendar-days.test.ts`

- [ ] Write failing tests for inclusive date generation, inactive retained Days, and deleting their schedules.
- [ ] Implement `getCalendarDates`, `getActiveDays`, and `reconcileTripDateRange` with a `keep` or `delete` decision.
- [ ] Add `isActive?: boolean` to `Day` and preserve existing Day IDs when dates remain in range.
- [ ] Run `pnpm exec vitest run tests/domain/calendar-days.test.ts`.

### Task 2: Trip Settings and Day Navigation

**Files:**
- Modify: `src/store/roadbook-store.ts`
- Modify: `src/components/roadbook/TripHeader.tsx`
- Modify: `src/components/roadbook/DayNavigator.tsx`
- Modify: `src/components/roadbook/RoadbookWorkspace.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/components/trip-settings.test.tsx`

- [ ] Write failing component tests for opening settings, validation, and date-change keep/delete confirmation.
- [ ] Add store actions that preview affected Days then commit rename/date reconciliation.
- [ ] Replace title editing and manual Day controls with formatted date navigation and a settings drawer.
- [ ] Show retained inactive Days as muted, non-interactive items.
- [ ] Run focused component tests.

### Task 3: Full Activity and Schedule Details

**Files:**
- Modify: `src/components/roadbook/NodeDetailDrawer.tsx`
- Modify: `src/store/roadbook-store.ts`
- Modify: `src/components/roadbook/MaterialLibrary.tsx`
- Modify: `src/components/roadbook/DayTimeline.tsx`
- Test: `tests/components/node-detail-drawer.test.tsx`

- [ ] Write failing tests for image URL, coordinates, tags, price, URL, and schedule-card detail entry.
- [ ] Expand activity drafts and normalize optional values on save.
- [ ] Add a schedule detail draft for start time, duration, time lock, price override, and note override.
- [ ] Keep material card clicks opening activity editing and scheduled card clicks opening schedule details.
- [ ] Run focused drawer tests.

### Task 4: Pointer Duration Resizing

**Files:**
- Modify: `src/components/roadbook/ScheduledActivityCard.tsx`
- Modify: `src/components/roadbook/DayTimeline.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/components/day-timeline.test.tsx`

- [ ] Write a failing pointer test that maps a resize drag to a snapped slot duration.
- [ ] Add a bottom resize handle that captures pointer movement and reports a rounded slot count.
- [ ] Reuse existing store and `TimelineEngine.resizeSchedule` reflow/overflow handling.
- [ ] Verify card click and drag-handle interactions remain separate.

### Task 5: Regression Validation

**Files:**
- Test: `tests/**/*.test.{ts,tsx,mjs}`

- [ ] Run React component/domain tests.
- [ ] Run existing Node compatibility tests.
- [ ] Run `pnpm build` and verify the Vite development server still starts.
