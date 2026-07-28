import test from "node:test";
import assert from "node:assert/strict";
import {
  createSeedTrip,
  comparisonSummary,
  getPlanItem,
  loadState,
  saveState,
  setVisibility
} from "../src/state.js";
import { applyEntry, renderMap, renderReview } from "../src/app.js";

test("记录表单会关联计划状态，并更新地图与复盘", () => {
  const state = createSeedTrip();
  const formData = new FormData();
  formData.set("dayId", "day-1");
  formData.set("planItemId", "plan-1");
  formData.set("title", "调整抵达时间");
  formData.set("note", "虚构：列车晚点后改乘接驳。 ");
  formData.set("status", "adjusted");

  applyEntry(formData, state);

  assert.equal(getPlanItem(state, "plan-1").status, "adjusted");
  assert.equal(comparisonSummary(state).adjusted, 2);
  assert.match(renderMap(state), /实际路线/);
  assert.match(renderReview(state), /调整抵达时间/);
});

test("可见范围使用内部值并能保存到本地存储", () => {
  const state = createSeedTrip();
  const storage = {
    value: "",
    getItem() { return this.value; },
    setItem(key, value) { this.key = key; this.value = value; }
  };

  setVisibility(state, "link");

  saveState(state, storage);
  assert.equal(loadState(storage).travels[0].privacy.visibility, "link");
});
