import { describe, expect, it } from "vitest";
import { loadLocalGuest, saveLocalGuest } from "../../src/data/local-guest";

const createMemoryStorage = (value = "") => ({
  value,
  getItem() { return this.value || null; },
  setItem(_key: string, nextValue: string) { this.value = nextValue; }
});

describe("local guest storage", () => {
  it("creates a default guest and persists a renamed profile", () => {
    const storage = createMemoryStorage();

    expect(loadLocalGuest(storage)).toMatchObject({ name: "旅行者" });

    saveLocalGuest({ id: "guest-1", name: "小林", createdAt: "2026-07-29T00:00:00.000Z" }, storage);

    expect(loadLocalGuest(storage)).toEqual({ id: "guest-1", name: "小林", createdAt: "2026-07-29T00:00:00.000Z" });
  });
});
