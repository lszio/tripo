import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("网页入口由 Vite 开发服务器加载 TypeScript 模块", () => {
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(index, /<script type="module" src="\/src\/main\.tsx"><\/script>/);
});
