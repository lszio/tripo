import { describe, expect, it, vi } from "vitest";
import { createApiArchiveStorage } from "../../src/data/api-archive-storage";
import { createDemoArchive } from "../../src/domain/migration";

const localArchive = createDemoArchive();
const serverArchive = {
  ...createDemoArchive(),
  travels: [{ ...createDemoArchive().travels[0], title: "云端旅行" }]
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("API archive storage", () => {
  it("loads server travels as an archive with a selected travel", async () => {
    const storage = createApiArchiveStorage(async () => jsonResponse({ travels: serverArchive.travels }));

    await expect(storage.loadArchive()).resolves.toEqual({
      schemaVersion: 2,
      travels: serverArchive.travels,
      selectedTravelId: serverArchive.travels[0].id
    });
  });

  it("saves the changed travel through its API endpoint", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ travel: serverArchive.travels[0] }));
    const storage = createApiArchiveStorage(fetcher);

    await expect(storage.saveTravel(serverArchive.travels[0])).resolves.toEqual(serverArchive.travels[0]);
    expect(fetcher).toHaveBeenCalledWith(`/api/travels/${serverArchive.travels[0].id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ travel: serverArchive.travels[0] })
    });
  });

  it("imports a local archive only when the server reports it has not been imported", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ imported: true, archive: serverArchive }))
      .mockResolvedValueOnce(jsonResponse({ imported: false, archive: serverArchive }));
    const storage = createApiArchiveStorage(fetcher);

    await storage.importLocalArchiveOnce(localArchive);
    await storage.importLocalArchiveOnce(localArchive);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps a failed import retryable", async () => {
    const storage = createApiArchiveStorage(async () => jsonResponse({ message: "数据服务暂不可用，请稍后重试" }, 503));

    await expect(storage.importLocalArchiveOnce(localArchive)).rejects.toThrow("数据服务暂不可用");
    await expect(storage.importLocalArchiveOnce(localArchive)).rejects.toThrow("数据服务暂不可用");
  });
});
