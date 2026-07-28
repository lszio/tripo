import test from "node:test";
import assert from "node:assert/strict";
import { createArchive } from "../src/state.js";
import {
  getRecordedTravels,
  renderRecordsLibrary,
  renderTravelLibrary,
  renderApp,
  selectTravel,
  readTravelDeepLink
} from "../src/app.js";

test("records library omits trips without record cards", () => {
  const archive = createArchive();
  assert.equal(getRecordedTravels(archive).every(travel => travel.records.length > 0), true);
});

test("travel libraries render archive cards and record-mode workspace links", () => {
  const archive = createArchive();
  const travelLibrary = renderTravelLibrary(archive);
  const recordsLibrary = renderRecordsLibrary(archive);

  assert.match(travelLibrary, /我的旅行/);
  assert.match(travelLibrary, /日本城市漫游/);
  assert.match(recordsLibrary, /奥匈九日漫游/);
  assert.doesNotMatch(recordsLibrary, /日本城市漫游/);
  assert.match(recordsLibrary, /data-workspace-mode="records"/);
});

test("selecting a travel opens its workspace", () => {
  const archive = createArchive();
  renderApp(archive);
  const selected = selectTravel("travel-japan-demo");

  assert.equal(selected.selectedTravelId, "travel-japan-demo");
  assert.equal(selected.activeRoute, "workspace");
});

test("record-mode travel deep links are read from the URL hash", () => {
  assert.deepEqual(
    readTravelDeepLink("#travel=travel-austria-demo&mode=record"),
    { travelId: "travel-austria-demo", workspaceMode: "records" }
  );
});
