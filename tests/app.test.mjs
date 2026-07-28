import test from "node:test";
import assert from "node:assert/strict";
import { navigationItems } from "../src/app.js";

test("the five travel views are available", () => {
  assert.deepEqual(navigationItems.map(item => item.id), ["overview", "plan", "journal", "map", "review"]);
});
