import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearLocationSearchCache, searchLocations } from "../../src/domain/location-search";

describe("location search", () => {
  beforeEach(() => clearLocationSearchCache());

  it("returns coordinates from an explicit place query", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ display_name: "Hallstatt, Austria", lat: "47.56", lon: "13.64" }]
    });

    await expect(searchLocations("Hallstatt", fetcher)).resolves.toEqual([
      { name: "Hallstatt, Austria", latitude: 47.56, longitude: 13.64 }
    ]);
    expect(fetcher.mock.calls[0]?.[0]).toContain("q=Hallstatt");
  });

  it("returns a cached result without a second network request", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });

    await searchLocations("Hallstatt", fetcher);
    await searchLocations(" Hallstatt ", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not request a blank query", async () => {
    const fetcher = vi.fn();

    await expect(searchLocations("   ", fetcher)).resolves.toEqual([]);

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("throws a clear error when the place service rejects a request", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false });

    await expect(searchLocations("Hallstatt", fetcher)).rejects.toThrow("地点搜索暂时不可用");
  });
});
