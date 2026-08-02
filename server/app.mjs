import { fileURLToPath } from "node:url";

import fastifyStatic from "@fastify/static";
import Fastify from "fastify";

import { resolveCurrentUser } from "./auth.mjs";
import { NotFoundError, ValidationError, sendApiError } from "./errors.mjs";
import { createTravelRepository } from "./travel-repository.mjs";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireTravel(value) {
  if (!isObject(value) || typeof value.id !== "string" || !value.id.trim() || typeof value.title !== "string" || typeof value.status !== "string" || !isObject(value.roadbook) || !Array.isArray(value.records)) {
    throw new ValidationError("旅行格式无效");
  }

  if (value.destination !== undefined && typeof value.destination !== "string") {
    throw new ValidationError("旅行格式无效");
  }
  if (value.dates !== undefined && typeof value.dates !== "string") {
    throw new ValidationError("旅行格式无效");
  }
  if (value.editablePlan !== undefined && !isObject(value.editablePlan)) {
    throw new ValidationError("旅行格式无效");
  }
  if (value.recordingPlanSnapshot !== undefined && !isObject(value.recordingPlanSnapshot)) {
    throw new ValidationError("旅行格式无效");
  }

  return value;
}

function requireArchive(body) {
  const archive = body?.archive;
  if (!isObject(archive) || !Array.isArray(archive.travels)) {
    throw new ValidationError("旅行档案格式无效");
  }

  try {
    archive.travels.forEach(requireTravel);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new ValidationError("旅行档案格式无效");
    }
    throw error;
  }

  return archive;
}

function requireTravelPayload(body) {
  return requireTravel(body?.travel);
}

function requireTravelId(params) {
  const travelId = typeof params?.id === "string" ? params.id.trim() : "";
  if (!travelId) {
    throw new ValidationError("旅行 ID 无效");
  }
  return travelId;
}

export function createApp({ prisma, distDir = false }) {
  const app = Fastify();
  const repository = createTravelRepository(prisma);

  app.setErrorHandler(sendApiError);

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/api/me", async (request) => ({ user: await resolveCurrentUser(request, prisma) }));

  app.get("/api/travels", async (request) => {
    const user = await resolveCurrentUser(request, prisma);
    return { travels: await repository.listForUser(user.id) };
  });

  app.get("/api/travels/:id", async (request) => {
    const user = await resolveCurrentUser(request, prisma);
    const travel = await repository.findForUser(user.id, requireTravelId(request.params));
    if (!travel) throw new NotFoundError();
    return { travel };
  });

  app.post("/api/travels", async (request, reply) => {
    const user = await resolveCurrentUser(request, prisma);
    const travel = await repository.replaceForUser(user.id, requireTravelPayload(request.body));
    return reply.code(201).send({ travel });
  });

  app.put("/api/travels/:id", async (request) => {
    const user = await resolveCurrentUser(request, prisma);
    const travelId = requireTravelId(request.params);
    const travel = requireTravelPayload(request.body);
    if (travel.id !== travelId) throw new ValidationError("旅行 ID 不匹配");
    return { travel: await repository.replaceForUser(user.id, travel) };
  });

  app.delete("/api/travels/:id", async (request, reply) => {
    const user = await resolveCurrentUser(request, prisma);
    const deleted = await repository.deleteForUser(user.id, requireTravelId(request.params));
    if (!deleted) throw new NotFoundError();
    return reply.code(204).send();
  });

  app.post("/api/import/local-archive", async (request) => {
    const user = await resolveCurrentUser(request, prisma);
    return repository.importArchiveOnce(user.id, requireArchive(request.body));
  });

  if (distDir) {
    const root = distDir instanceof URL ? fileURLToPath(distDir) : distDir;
    app.register(fastifyStatic, { root });
  }

  app.setNotFoundHandler((request, reply) => {
    const pathname = new URL(request.raw.url ?? request.url, "http://localhost").pathname;
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "旅行不存在" });
    }
    if (distDir && request.method === "GET") {
      return reply.sendFile("index.html");
    }
    return reply.code(404).send({ error: "NOT_FOUND", message: "旅行不存在" });
  });

  return app;
}
