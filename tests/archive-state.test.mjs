import test from "node:test";
import assert from "node:assert/strict";
import { createArchive, startRecording } from "../src/state.js";

test("starting records freezes the current plan", () => {
  const travel = createArchive().travels[0];
  const snapshot = startRecording(travel).recordingPlanSnapshot;
  travel.editablePlan.days[0].cards[0].plannedDayId = "day-2";
  assert.equal(snapshot.days[0].cards[0].plannedDayId, "day-1");
});
