import test from "node:test";
import assert from "node:assert/strict";
import { createSeedTrip, addEntry, comparisonSummary } from "../src/state.js";

test("new actual entry becomes an added comparison item", () => {
  const state = createSeedTrip();
  addEntry(state, { dayId: "day-1", title: "多瑙河夜航", status: "added" });
  assert.equal(comparisonSummary(state).added, 1);
});
