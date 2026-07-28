# Go Travel MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained Chinese Go Travel web app for planning, recording, mapping, and reviewing an Austria–Hungary trip.

**Architecture:** A dependency-free single-page application keeps demo travel data and UI state in browser local storage. `src/state.js` owns seed data and persistence; `src/app.js` renders views and interactions; `styles.css` supplies the responsive visual system; the map is an SVG coordinate projection so the MVP works without a map API key.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript ES modules, localStorage, inline SVG, Node.js built-in test runner.

## Global Constraints

- Interface copy is Simplified Chinese and responsive from 320px wide.
- No external APIs, map keys, framework packages, or external image assets.
- Store user-created records and plan status overrides under `go-travel-state-v1` in localStorage.
- Model the fixed demonstration user as `林沐`; do not implement real authentication.
- Include Austria–Hungary as an editable 9-day, 8-night demonstration trip; do not claim missing source text is original imported content.

---

### Task 1: Establish travel state and seed itinerary

**Files:**
- Create: `index.html`
- Create: `src/state.js`
- Create: `tests/state.test.mjs`

**Interfaces:**
- Produces `createSeedTrip()`, `loadState(storage?)`, `saveState(state, storage?)`, `addEntry(state, entry)`, and `comparisonSummary(state)`.
- `createSeedTrip` returns `{ trip, selectedDayId, selectedView }`; every plan item exposes `id`, `time`, `title`, `type`, `description`, `status`, and `place: { name, x, y }`.

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createSeedTrip, addEntry, comparisonSummary } from "../src/state.js";

test("new actual entry becomes an added comparison item", () => {
  const state = createSeedTrip();
  addEntry(state, { dayId: "day-1", title: "多瑙河夜航", status: "added" });
  assert.equal(comparisonSummary(state).added, 1);
});
```

- [ ] **Step 2: Verify it fails**

Run: `/Users/ruhua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/state.test.mjs`

Expected: FAIL because `src/state.js` does not exist.

- [ ] **Step 3: Implement minimal state operations**

```js
export function addEntry(state, entry) {
  state.trip.entries.push({ id: crypto.randomUUID?.() ?? String(Date.now()), note: "", ...entry });
}
export function comparisonSummary(state) {
  return state.trip.entries.reduce(
    (summary, entry) => ({ ...summary, [entry.status]: (summary[entry.status] ?? 0) + 1 }),
    { completed: 0, adjusted: 0, skipped: 0, added: 0 }
  );
}
```

Create nine day objects across Budapest, Bratislava, Vienna, Hallstatt, and Salzburg. Include planned activities, two sample actual entries, trip members, and privacy state. Implement storage helpers with the fixed key.

- [ ] **Step 4: Run the test**

Run: `/Users/ruhua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/state.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html src/state.js tests/state.test.mjs
git commit -m "feat: add Go Travel trip state"
```

### Task 2: Build responsive dashboard and travel views

**Files:**
- Modify: `index.html`
- Create: `styles.css`
- Create: `src/app.js`
- Create: `tests/app.test.mjs`

**Interfaces:**
- Consumes state functions from Task 1.
- Produces `navigationItems`, `renderApp(state)`, and `bindEvents()`.

- [ ] **Step 1: Write the failing navigation test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { navigationItems } from "../src/app.js";

test("the five travel views are available", () => {
  assert.deepEqual(navigationItems.map(item => item.id), ["overview", "plan", "journal", "map", "review"]);
});
```

- [ ] **Step 2: Verify it fails**

Run: `/Users/ruhua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/app.test.mjs`

Expected: FAIL because `src/app.js` does not exist.

- [ ] **Step 3: Implement navigation and page shell**

```html
<main id="app" aria-live="polite"></main>
<script type="module" src="./src/app.js"></script>
```

```js
export const navigationItems = [
  { id: "overview", label: "概览" }, { id: "plan", label: "攻略" },
  { id: "journal", label: "实录" }, { id: "map", label: "地图" },
  { id: "review", label: "复盘" }
];
```

Render a forest-green sidebar, warm paper workspace, trip header, day filter, overview statistics, plan timeline, journal card list, SVG map, and review panel. Add CSS custom properties, focus styles, cards, and a single-column mobile view below 800px.

- [ ] **Step 4: Run the test**

Run: `/Users/ruhua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/app.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css src/app.js tests/app.test.mjs
git commit -m "feat: add Go Travel interface"
```

### Task 3: Add record, map, review, and privacy interactions

**Files:**
- Modify: `src/state.js`
- Modify: `src/app.js`
- Modify: `styles.css`
- Create: `tests/interactions.test.mjs`
- Create: `README.md`

**Interfaces:**
- Consumes plan item IDs and valid statuses: `completed`, `adjusted`, `skipped`, and `added`.
- Produces `renderPlan`, `renderJournal`, `renderMap`, `renderReview`, and `applyEntry(formData)`.

- [ ] **Step 1: Write the failing interaction test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createSeedTrip, addEntry, comparisonSummary } from "../src/state.js";

test("adjusted linked record is included in review", () => {
  const state = createSeedTrip();
  addEntry(state, { dayId: "day-1", planItemId: "d1-1", title: "调整抵达时间", status: "adjusted" });
  assert.equal(comparisonSummary(state).adjusted, 1);
});
```

- [ ] **Step 2: Verify it fails**

Run: `/Users/ruhua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/interactions.test.mjs`

Expected: FAIL until the day-one plan item and adjusted record are represented.

- [ ] **Step 3: Implement interactions**

```js
function applyEntry(formData) {
  addEntry(state, {
    dayId: formData.get("dayId"),
    planItemId: formData.get("planItemId") || undefined,
    title: formData.get("title"),
    note: formData.get("note"),
    status: formData.get("status")
  });
  saveState(state); renderApp(state);
}
```

Add an accessible native dialog for an actual record. It must capture title, note, selected day, optional linked plan item, and status. Map view must draw planned route polylines in green and actual markers/routes in amber, filtered by day. Review view must display the four status totals and related records. Add visibility select values `private`, `members`, `link`, and `public`; persist every selection. Document browser-local storage, local launch, the five views, and sample-data limits.

- [ ] **Step 4: Run focused tests**

Run: `/Users/ruhua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/interactions.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state.js src/app.js styles.css README.md tests/interactions.test.mjs
git commit -m "feat: complete travel planning flows"
```

### Task 4: Verify the deliverable

**Files:**
- Verify: `index.html`
- Verify: `styles.css`
- Verify: `src/state.js`
- Verify: `src/app.js`
- Verify: `tests/*.test.mjs`

**Interfaces:**
- All tests use only Node built-ins and should pass without dependency installation.

- [ ] **Step 1: Run full test suite**

Run: `/Users/ruhua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/*.test.mjs`

Expected: all tests PASS.

- [ ] **Step 2: Start locally**

Run: `/Users/ruhua/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m http.server 4173`

Expected: Go Travel loads at `http://localhost:4173`.

- [ ] **Step 3: Manually verify**

Verify the five view tabs, day filtering, adding an actual record, map changes, review totals, privacy control, mobile layout, and persistence after refresh.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css src state.js README.md tests
git commit -m "chore: verify Go Travel MVP"
```

