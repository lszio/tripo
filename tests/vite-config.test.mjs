// @vitest-environment node

import { describe, expect, it } from "vitest";

import config from "../vite.config.ts";

describe("Vite development configuration", () => {
  it("proxies API requests without forging an authentication header", () => {
    expect(config.server.proxy["/api"]).toMatchObject({
      target: "http://127.0.0.1:3000"
    });
    expect(config.server.proxy["/api"].headers).toBeUndefined();
  });
});
