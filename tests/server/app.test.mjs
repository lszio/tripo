import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createApp } from "../../server/app.mjs";

const ownerTravel = {
  id: "travel-owner",
  title: "杭州周末",
  destination: "杭州",
  dates: "2026-10-01 至 2026-10-03",
  status: "draft",
  roadbook: { version: 1, days: [] },
  editablePlan: { days: [] },
  recordingPlanSnapshot: undefined,
  records: []
};

const otherTravel = { ...ownerTravel, id: "travel-other", title: "上海周末" };

function createFakePrisma({ travels = [], unavailable = false } = {}) {
  const users = new Map();
  const storedTravels = travels.map((travel) => ({
    ...serializeTravel(travel),
    userId: travel.id === "travel-other" ? "user-other" : "user-owner"
  }));

  const client = {
    user: {
      upsert: async ({ where: { email }, create }) => {
        if (unavailable) throw prismaUnavailableError();
        const existing = [...users.values()].find((user) => user.email === email);
        if (existing) return existing;
        const user = {
          id: email === "other@example.com" ? "user-other" : "user-owner",
          email: create.email,
          displayName: null,
          importedAt: null
        };
        users.set(user.id, user);
        return user;
      },
      findUnique: async ({ where: { id } }) => users.get(id) ?? null,
      update: async ({ where: { id }, data }) => {
        const user = users.get(id);
        if (!user) throw new Error("User not found");
        const updated = { ...user, ...data };
        users.set(id, updated);
        return updated;
      }
    },
    travel: {
      findMany: async ({ where: { userId } }) => {
        if (unavailable) throw prismaUnavailableError();
        return storedTravels.filter((travel) => travel.userId === userId);
      },
      findUnique: async ({ where: { id_userId } }) =>
        storedTravels.find((travel) => travel.id === id_userId.id && travel.userId === id_userId.userId) ?? null,
      upsert: async ({ where: { id_userId }, create, update }) => {
        const index = storedTravels.findIndex((travel) => travel.id === id_userId.id && travel.userId === id_userId.userId);
        if (index === -1) {
          storedTravels.push(create);
          return create;
        }
        const saved = { ...storedTravels[index], ...update };
        storedTravels[index] = saved;
        return saved;
      },
      delete: async ({ where: { id_userId } }) => {
        const index = storedTravels.findIndex((travel) => travel.id === id_userId.id && travel.userId === id_userId.userId);
        if (index === -1) {
          const error = new Error("Travel not found");
          error.code = "P2025";
          throw error;
        }
        return storedTravels.splice(index, 1)[0];
      },
      create: async ({ data }) => {
        storedTravels.push(data);
        return data;
      }
    }
  };

  return { ...client, $transaction: async (operation) => operation(client) };
}

function serializeTravel(travel) {
  return {
    id: travel.id,
    title: travel.title,
    destination: travel.destination ?? null,
    dates: travel.dates ?? null,
    status: travel.status,
    roadbookJson: JSON.stringify(travel.roadbook),
    editablePlanJson: travel.editablePlan === undefined ? null : JSON.stringify(travel.editablePlan),
    recordingPlanJson: travel.recordingPlanSnapshot === undefined ? null : JSON.stringify(travel.recordingPlanSnapshot),
    recordsJson: JSON.stringify(travel.records)
  };
}

function prismaUnavailableError() {
  const error = new Error("Database unavailable");
  error.code = "P1001";
  return error;
}

async function inject(app, request) {
  try {
    return await app.inject(request);
  } finally {
    await app.close();
  }
}

async function createStaticDist() {
  const distDir = await mkdtemp(join(tmpdir(), "go-travel-static-"));
  await writeFile(join(distDir, "index.html"), "<main>travel app</main>");
  return distDir;
}

describe("authenticated travel API", () => {
  it("returns health status without an authenticated user", async () => {
    const response = await inject(createApp({ prisma: createFakePrisma(), distDir: false }), {
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("returns the API not-found response without static hosting", async () => {
    const response = await inject(createApp({ prisma: createFakePrisma(), distDir: false }), {
      method: "GET",
      url: "/api/not-a-route"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "NOT_FOUND", message: "旅行不存在" });
  });

  it("reserves API pathnames when static hosting is enabled", async () => {
    const distDir = await createStaticDist();
    const app = createApp({ prisma: createFakePrisma(), distDir });

    try {
      const apiRoot = await app.inject({ method: "GET", url: "/api?source=spa" });
      const unknownApiRoute = await app.inject({ method: "GET", url: "/api/not-a-route?source=spa" });
      const spaRoute = await app.inject({ method: "GET", url: "/roadbooks/new" });

      expect(apiRoot.statusCode).toBe(404);
      expect(apiRoot.json()).toEqual({ error: "NOT_FOUND", message: "旅行不存在" });
      expect(unknownApiRoute.statusCode).toBe(404);
      expect(unknownApiRoute.json()).toEqual({ error: "NOT_FOUND", message: "旅行不存在" });
      expect(spaRoute.statusCode).toBe(200);
      expect(spaRoute.body).toContain("travel app");
    } finally {
      await app.close();
      await rm(distDir, { recursive: true, force: true });
    }
  });

  it("rejects API calls without the proxy identity header", async () => {
    const response = await inject(createApp({ prisma: createFakePrisma(), distDir: false }), {
      method: "GET",
      url: "/api/me"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "UNAUTHENTICATED", message: "需要先登录" });
  });

  it("rejects invalid proxy identity headers", async () => {
    const response = await inject(createApp({ prisma: createFakePrisma(), distDir: false }), {
      method: "GET",
      url: "/api/me",
      headers: { "remote-email": "not-an-email" }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "UNAUTHENTICATED", message: "需要先登录" });
  });

  it("upserts the trimmed proxy identity for the current user", async () => {
    const response = await inject(createApp({ prisma: createFakePrisma(), distDir: false }), {
      method: "GET",
      url: "/api/me",
      headers: { "remote-email": "  owner@example.com  " }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ user: { id: "user-owner", email: "owner@example.com", displayName: null } });
  });

  it("returns only the authenticated user's travels", async () => {
    const response = await inject(createApp({ prisma: createFakePrisma({ travels: [ownerTravel, otherTravel] }), distDir: false }), {
      method: "GET",
      url: "/api/travels",
      headers: { "remote-email": "owner@example.com" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ travels: [ownerTravel] });
  });

  it("returns 404 instead of another user's travel", async () => {
    const response = await inject(createApp({ prisma: createFakePrisma({ travels: [ownerTravel, otherTravel] }), distDir: false }), {
      method: "GET",
      url: "/api/travels/travel-other",
      headers: { "remote-email": "owner@example.com" }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "NOT_FOUND", message: "旅行不存在" });
  });

  it("creates, replaces, and deletes an authenticated user's travel", async () => {
    const prisma = createFakePrisma();
    const headers = { "remote-email": "owner@example.com" };
    const app = createApp({ prisma, distDir: false });

    const created = await app.inject({ method: "POST", url: "/api/travels", headers, payload: { travel: ownerTravel } });
    const replaced = await app.inject({
      method: "PUT",
      url: "/api/travels/travel-owner",
      headers,
      payload: { travel: { ...ownerTravel, title: "杭州三日游" } }
    });
    const deleted = await app.inject({ method: "DELETE", url: "/api/travels/travel-owner", headers });
    await app.close();

    expect(created.statusCode).toBe(201);
    expect(created.json()).toEqual({ travel: ownerTravel });
    expect(replaced.statusCode).toBe(200);
    expect(replaced.json()).toEqual({ travel: { ...ownerTravel, title: "杭州三日游" } });
    expect(deleted.statusCode).toBe(204);
  });

  it("rejects a travel whose body id differs from the route id", async () => {
    const response = await inject(createApp({ prisma: createFakePrisma(), distDir: false }), {
      method: "PUT",
      url: "/api/travels/travel-owner",
      headers: { "remote-email": "owner@example.com" },
      payload: { travel: { ...ownerTravel, id: "different-travel" } }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "INVALID_REQUEST", message: "旅行 ID 不匹配" });
  });

  it("imports a local archive only once", async () => {
    const prisma = createFakePrisma();
    const headers = { "remote-email": "owner@example.com" };
    const app = createApp({ prisma, distDir: false });
    const first = await app.inject({
      method: "POST",
      url: "/api/import/local-archive",
      headers,
      payload: { archive: { version: 1, travels: [ownerTravel] } }
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/import/local-archive",
      headers,
      payload: { archive: { version: 1, travels: [ownerTravel] } }
    });
    await app.close();

    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({
      imported: true,
      archive: { travels: [expect.objectContaining({ id: ownerTravel.id, title: ownerTravel.title })] }
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({
      imported: false,
      archive: { travels: [expect.objectContaining({ id: ownerTravel.id, title: ownerTravel.title })] }
    });
  });

  it("returns a validation error for malformed request bodies", async () => {
    const response = await inject(createApp({ prisma: createFakePrisma(), distDir: false }), {
      method: "POST",
      url: "/api/import/local-archive",
      headers: { "remote-email": "owner@example.com" },
      payload: { archive: { version: 1, travels: "not-an-array" } }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "INVALID_REQUEST", message: "旅行档案格式无效" });
  });

  it("maps unavailable Prisma errors to a retryable response", async () => {
    const response = await inject(createApp({ prisma: createFakePrisma({ unavailable: true }), distDir: false }), {
      method: "GET",
      url: "/api/travels",
      headers: { "remote-email": "owner@example.com" }
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "DATABASE_UNAVAILABLE", message: "数据服务暂不可用，请稍后重试" });
  });
});
