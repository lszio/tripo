# Go Travel Personal Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Go Travel from a single-trip planner into a personal archive of themed travel plans and immutable record snapshots.

**Architecture:** Split state into a travel collection, editable plan versions, frozen recording snapshots, and actual record cards. Replace the current one-trip rendering surface with routes for the travel library, global records library, and one travel workspace; themes only alter plan presentation, not record semantics.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript ES modules, localStorage, Node.js built-in test runner.

## Global Constraints

- Interface copy is Simplified Chinese and follows a light Behance-like editorial visual direction.
- Support an unrestricted number of locally stored trips for one local account.
- Do not require external API, map key, framework package, or hosted asset.
- Plan-card content is free-form; only its planned date aligns it with travel records.
- Starting record mode freezes a read-only plan snapshot; copying a plan makes an editable version without changing existing records.
- Keep data under browser local storage and preserve it after a refresh.

---

### Task 1: Migrate state to a multi-trip archive

**Files:**
- Modify: `src/state.js`
- Create: `tests/archive-state.test.mjs`

**Interfaces:**
- Produces `createArchive()`, `getTravel(archive, travelId)`, `createPlanCopy(travel)`, and `startRecording(travel)`.
- A travel has `editablePlan`, optional `recordingPlanSnapshot`, and `records`.

- [ ] **Step 1: Write the failing snapshot test**

```js
test("starting records freezes the current plan", () => {
  const travel = createArchive().travels[0];
  const snapshot = startRecording(travel).recordingPlanSnapshot;
  travel.editablePlan.days[0].cards[0].plannedDayId = "day-2";
  assert.equal(snapshot.days[0].cards[0].plannedDayId, "day-1");
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `node --test tests/archive-state.test.mjs`

Expected: FAIL because archive and snapshot helpers do not exist.

- [ ] **Step 3: Implement archive, copy, and snapshot helpers**

```js
export function startRecording(travel) {
  travel.recordingPlanSnapshot = structuredClone(travel.editablePlan);
  travel.status = "active";
  return travel;
}
export function createPlanCopy(travel) {
  return { ...structuredClone(travel.editablePlan), id: crypto.randomUUID(), copiedFromId: travel.editablePlan.id };
}
```

Seed Austria–Hungary, Japan, and Perth as clearly labelled demo travel cards, each with an independent theme.

- [ ] **Step 4: Run the focused test**

Run: `node --test tests/archive-state.test.mjs`

Expected: PASS.

### Task 2: Build the personal travel and records libraries

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `styles.css`
- Create: `tests/library.test.mjs`

**Interfaces:**
- Consumes `archive.travels` from Task 1.
- Produces `renderTravelLibrary(archive)`, `renderRecordsLibrary(archive)`, and `selectTravel(travelId)`.

- [ ] **Step 1: Write the failing library test**

```js
test("records library omits trips without record cards", () => {
  const archive = createArchive();
  assert.equal(getRecordedTravels(archive).every(travel => travel.records.length > 0), true);
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `node --test tests/library.test.mjs`

Expected: FAIL because `getRecordedTravels` is not exported.

- [ ] **Step 3: Implement both library routes**

```js
export function getRecordedTravels(archive) {
  return archive.travels.filter(travel => travel.records.length > 0);
}
```

Render a spacious cover-card grid for “我的旅行” and a record-only card grid for “旅行记录”. Each card shows cover theme, title, date, status, plan progress, and record count; the record-card action links to the same travel workspace in record mode.

- [ ] **Step 4: Run the focused test**

Run: `node --test tests/library.test.mjs`

Expected: PASS.

### Task 3: Implement themed plan mode and frozen record mode

**Files:**
- Modify: `src/app.js`
- Modify: `styles.css`
- Create: `tests/plan-record-mode.test.mjs`

**Interfaces:**
- Consumes `travel.editablePlan`, `travel.recordingPlanSnapshot`, and `travel.records`.
- Produces `renderPlanMode(travel)`, `renderRecordMode(travel)`, and `moveRecordCard(recordId, actualDayId)`.

- [ ] **Step 1: Write the failing cross-day record test**

```js
test("moving a record does not move its frozen plan card", () => {
  const travel = startRecording(createArchive().travels[0]);
  const planDay = travel.recordingPlanSnapshot.days[0].cards[0].plannedDayId;
  moveRecordCard(travel, travel.records[0].id, "day-2");
  assert.equal(travel.recordingPlanSnapshot.days[0].cards[0].plannedDayId, planDay);
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `node --test tests/plan-record-mode.test.mjs`

Expected: FAIL because `moveRecordCard` does not exist.

- [ ] **Step 3: Implement modes and visual themes**

```js
export function moveRecordCard(travel, recordId, actualDayId) {
  travel.records.find(record => record.id === recordId).actualDayId = actualDayId;
}
```

Render plan mode with editable free-form cards and drag/drop date movement. Render record mode as a read-only themed plan column beside an editable record column. Add three presentation themes: `editorial`, `routebook`, and `archive`; theme switching is allowed only before `startRecording`.

- [ ] **Step 4: Run the focused test**

Run: `node --test tests/plan-record-mode.test.mjs`

Expected: PASS.

### Task 4: Verify persistence, copying, and interface integrity

**Files:**
- Modify: `README.md`
- Modify: `tests/interactions.test.mjs`
- Verify: `tests/*.test.mjs`

**Interfaces:**
- Verifies all Task 1–3 functions persist and retain source-plan separation.

- [ ] **Step 1: Write the failing copy-isolation test**

```js
test("a copied plan can change theme without changing snapshot", () => {
  const travel = startRecording(createArchive().travels[0]);
  const copy = createPlanCopy(travel);
  copy.theme = "archive";
  assert.notEqual(copy.theme, travel.recordingPlanSnapshot.theme);
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `node --test tests/interactions.test.mjs`

Expected: FAIL until copied plans retain an independent theme.

- [ ] **Step 3: Document local behavior**

Document the three themes, the immutable-recording rule, local-only storage, and launch instructions in `README.md`.

- [ ] **Step 4: Run all validation**

Run: `node --test tests/*.test.mjs && node --check src/app.js && node --check src/state.js`

Expected: all tests pass with zero failures.

- [ ] **Step 5: Commit**

Do not create a commit unless the user explicitly asks for one.

