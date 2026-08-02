import type { Archive, ArchiveTravel } from "../domain/roadbook";

export type ApiFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type ApiArchiveStorage = {
  loadArchive(): Promise<Archive>;
  saveTravel(travel: ArchiveTravel): Promise<ArchiveTravel>;
  importLocalArchiveOnce(localArchive: Archive): Promise<{ imported: boolean; archive: Archive }>;
};

const fallbackMessages: Record<number, string> = {
  400: "请求数据无效",
  401: "需要先登录",
  404: "旅行不存在",
  503: "数据服务暂不可用，请稍后重试"
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readResponse(response: Response) {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    if (!response.ok) throw new Error(fallbackMessages[response.status] ?? "数据服务请求失败，请稍后重试");
    throw new Error("数据服务返回了无效响应");
  }

  if (!response.ok) {
    const message = isObject(payload) && typeof payload.message === "string"
      ? payload.message
      : fallbackMessages[response.status] ?? "数据服务请求失败，请稍后重试";
    throw new Error(message);
  }

  return payload;
}

function requireTravels(payload: unknown): ArchiveTravel[] {
  if (!isObject(payload) || !Array.isArray(payload.travels)) {
    throw new Error("数据服务返回了无效响应");
  }
  return payload.travels as ArchiveTravel[];
}

function requireTravel(payload: unknown): ArchiveTravel {
  if (!isObject(payload) || !isObject(payload.travel)) {
    throw new Error("数据服务返回了无效响应");
  }
  return payload.travel as ArchiveTravel;
}

function requireImportResult(payload: unknown): { imported: boolean; archive: Archive } {
  if (!isObject(payload) || typeof payload.imported !== "boolean" || !isObject(payload.archive)) {
    throw new Error("数据服务返回了无效响应");
  }
  return payload as { imported: boolean; archive: Archive };
}

export function createApiArchiveStorage(fetcher: ApiFetcher): ApiArchiveStorage {
  let selectedTravelId: string | undefined;

  return {
    async loadArchive() {
      let response: Response;
      try {
        response = await fetcher("/api/travels");
      } catch {
        throw new Error("无法连接数据服务，请稍后重试");
      }

      const travels = requireTravels(await readResponse(response));
      const nextSelectedTravelId = travels.some(travel => travel.id === selectedTravelId)
        ? selectedTravelId
        : travels[0]?.id;
      selectedTravelId = nextSelectedTravelId;
      return { schemaVersion: 2, travels, selectedTravelId: nextSelectedTravelId };
    },

    async saveTravel(travel) {
      let response: Response;
      try {
        response = await fetcher(`/api/travels/${encodeURIComponent(travel.id)}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ travel })
        });
      } catch {
        throw new Error("无法连接数据服务，请稍后重试");
      }
      return requireTravel(await readResponse(response));
    },

    async importLocalArchiveOnce(localArchive) {
      let response: Response;
      try {
        response = await fetcher("/api/import/local-archive", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ archive: localArchive })
        });
      } catch {
        throw new Error("无法连接数据服务，请稍后重试");
      }
      return requireImportResult(await readResponse(response));
    }
  };
}
