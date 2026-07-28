import { describe, expect, it } from "vitest";
import { loadArchive, saveArchive } from "../../src/data/archive-storage";
import { createDemoArchive } from "../../src/domain/migration";

const createMemoryStorage = (value = "") => ({
  value,
  writes: 0,
  getItem() { return this.value || null; },
  setItem(_key: string, nextValue: string) { this.value = nextValue; this.writes += 1; }
});

describe("archive storage", () => {
  it("does not overwrite unreadable stored data", () => {
    const storage = createMemoryStorage("not-json");
    const result = loadArchive(storage);

    expect(result.recoveryError).toBe("无法读取本地旅行数据");
    expect(storage.writes).toBe(0);
  });

  it("persists a valid V1 archive", () => {
    const storage = createMemoryStorage();
    const archive = createDemoArchive();

    saveArchive(archive, storage);

    expect(loadArchive(storage).archive).toEqual(archive);
  });
});
