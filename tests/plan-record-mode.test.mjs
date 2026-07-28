import test from "node:test";
import assert from "node:assert/strict";
import { createArchive, createPlanCopy, startRecording } from "../src/state.js";
import { moveRecordCard } from "../src/app.js";

test("moving a record does not move its frozen plan card", () => {
  const travel = startRecording(createArchive().travels[0]);
  const planDay = travel.recordingPlanSnapshot.days[0].cards[0].plannedDayId;

  moveRecordCard(travel, travel.records[0].id, "day-2");

  assert.equal(travel.recordingPlanSnapshot.days[0].cards[0].plannedDayId, planDay);
});

test("copied plan can change theme without changing frozen snapshot", () => {
  const travel = startRecording(createArchive().travels[0]);
  const copy = createPlanCopy(travel);
  copy.theme = "editorial";

  assert.notEqual(copy.theme, travel.recordingPlanSnapshot.theme);
});
