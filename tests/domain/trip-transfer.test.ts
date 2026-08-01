import { describe, expect, it } from "vitest";
import { parseImportedTravel, serializeTravel } from "../../src/domain/trip-transfer";
import { createDemoArchive } from "../../src/domain/migration";

describe("trip transfer", () => {
  it("exports one trip and imports it with fresh internal identifiers", () => {
    const travel = createDemoArchive().travels[0];
    const restored = parseImportedTravel(serializeTravel(travel), new Set([travel.id]));

    expect(restored.id).not.toBe(travel.id);
    expect(restored.roadbook.id).not.toBe(travel.roadbook.id);
    expect(restored.roadbook.days[0].id).not.toBe(travel.roadbook.days[0].id);
    expect(restored.roadbook.activities[0].id).not.toBe(travel.roadbook.activities[0].id);
    expect(restored.roadbook.schedule[0]).toMatchObject({
      activityId: restored.roadbook.activities[0].id,
      dayId: restored.roadbook.days[0].id
    });
    expect(restored.title).toBe(travel.title);
  });

  it("rejects an unsupported travel file without returning partial data", () => {
    expect(() => parseImportedTravel("{}", new Set())).toThrow("不支持的旅行方案文件");
  });
});
