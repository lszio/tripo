import type { StorageLike } from "./archive-storage";

export const LOCAL_GUEST_STORAGE_KEY = "go-travel-local-guest-v1";

export type LocalGuest = {
  id: string;
  name: string;
  createdAt: string;
};

function defaultStorage() {
  return globalThis.localStorage;
}

function createDefaultGuest(): LocalGuest {
  return { id: "local-guest", name: "旅行者", createdAt: new Date().toISOString() };
}

function isLocalGuest(value: unknown): value is LocalGuest {
  const guest = value as Partial<LocalGuest>;
  return typeof guest?.id === "string" && typeof guest.name === "string" && typeof guest.createdAt === "string";
}

export function loadLocalGuest(storage: StorageLike = defaultStorage()): LocalGuest {
  const raw = storage.getItem(LOCAL_GUEST_STORAGE_KEY);
  if (!raw) return createDefaultGuest();

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isLocalGuest(parsed) ? parsed : createDefaultGuest();
  } catch {
    return createDefaultGuest();
  }
}

export function saveLocalGuest(guest: LocalGuest, storage: StorageLike = defaultStorage()) {
  storage.setItem(LOCAL_GUEST_STORAGE_KEY, JSON.stringify(guest));
}
