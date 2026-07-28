import type { Archive } from "../domain/roadbook";
import { createDemoArchive, migrateArchive } from "../domain/migration";

export const STORAGE_KEY = "go-travel-state-v1";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type ArchiveLoadResult = {
  archive: Archive;
  recoveryError?: string;
};

function defaultStorage() {
  return globalThis.localStorage;
}

export function saveArchive(archive: Archive, storage: StorageLike = defaultStorage()) {
  storage.setItem(STORAGE_KEY, JSON.stringify(archive));
}

export function loadArchive(storage: StorageLike = defaultStorage()): ArchiveLoadResult {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return { archive: createDemoArchive() };

  try {
    const parsed = JSON.parse(raw) as unknown;
    const archive = migrateArchive(parsed);
    if ((parsed as { schemaVersion?: number }).schemaVersion !== 2) saveArchive(archive, storage);
    return { archive };
  } catch {
    return { archive: createDemoArchive(), recoveryError: "无法读取本地旅行数据" };
  }
}
