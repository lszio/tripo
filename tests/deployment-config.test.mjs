import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

async function readProjectFile(path) {
  return readFile(resolve(process.cwd(), path), "utf8");
}

describe("Dokploy deployment configuration", () => {
  it("persists separate application and TinyAuth SQLite volumes", async () => {
    const compose = await readProjectFile("docker-compose.yml");

    expect(compose).toContain("travel-data:/data");
    expect(compose).toContain("tinyauth-data:/data");
  });

  it("does not publish the application container port", async () => {
    const compose = await readProjectFile("docker-compose.yml");
    const appService = compose.match(/^  app:\n([\s\S]*?)(?=^  \w|^volumes:)/m)?.[1] ?? "";

    expect(appService).not.toMatch(/^\s*ports:/m);
    expect(compose).toContain('traefik.http.middlewares.tinyauth.forwardauth.authResponseHeaders: "Remote-Email,Remote-Name"');
  });

  it("builds and starts the app with Bun and migrations before the Fastify server", async () => {
    const dockerfile = await readProjectFile("Dockerfile");

    expect(dockerfile).toMatch(/FROM oven\/bun:\d+(?:\.\d+\.\d+)?-alpine AS build/);
    expect(dockerfile).toContain("bun install --frozen-lockfile");
    expect(dockerfile).toContain("bunx prisma generate");
    expect(dockerfile).toContain("bun run build");
    expect(dockerfile).toContain('CMD ["sh", "-c", "bunx prisma migrate deploy && bun run start"]');
  });

  it("uses environment interpolation for domains and Google OAuth secrets", async () => {
    const compose = await readProjectFile("docker-compose.yml");
    const envExample = await readProjectFile(".env.example");

    expect(compose).toContain("Host(`${APP_DOMAIN}`)");
    expect(compose).toContain("TINYAUTH_APPURL: https://${AUTH_DOMAIN}");
    expect(compose).toContain("TINYAUTH_OAUTH_PROVIDERS_GOOGLE_CLIENTID: ${GOOGLE_CLIENT_ID}");
    expect(compose).toContain("TINYAUTH_OAUTH_PROVIDERS_GOOGLE_CLIENTSECRET: ${GOOGLE_CLIENT_SECRET}");
    expect(compose).toContain("TINYAUTH_OAUTH_WHITELIST: ${TINYAUTH_OAUTH_WHITELIST}");
    expect(envExample).toBe("APP_DOMAIN=\nAUTH_DOMAIN=\nGOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\nTINYAUTH_OAUTH_WHITELIST=\n");
  });

  it("locks Prisma dependencies for non-interactive Bun installs", async () => {
    const lockfile = await readProjectFile("bun.lock");

    expect(lockfile).toContain('"@prisma/client"');
    expect(lockfile).toContain('"prisma"');
  });

  it("provides a one-command local stack with ignored bind-mounted data", async () => {
    const localCompose = await readProjectFile("docker-compose.local.yml");
    const localEnv = await readProjectFile(".env.local.example");
    const ignore = await readProjectFile(".gitignore");
    const packageJson = JSON.parse(await readProjectFile("package.json"));

    expect(localCompose).toContain("./data/app:/data");
    expect(localCompose).toContain("./data/tinyauth:/data");
    expect(localCompose).toContain("TINYAUTH_AUTH_USERSFILE: /data/users");
    expect(localCompose).toContain("traefik.http.routers.go-travel.entrypoints: web");
    expect(localEnv).toContain("APP_DOMAIN=travel.localhost");
    expect(localEnv).toContain("AUTH_DOMAIN=auth.travel.localhost");
    expect(packageJson.scripts["local:up"]).toBe("mkdir -p data/app data/tinyauth && touch data/tinyauth/users && docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up --build");
    expect(packageJson.scripts["auth:user"]).toContain("touch data/tinyauth/users");
    expect(packageJson.scripts["auth:user"]).toContain("tinyauth user create --interactive");
    expect(ignore).toContain("data/");
  });

  it("bootstraps the local development environment before starting Bun", async () => {
    const packageJson = JSON.parse(await readProjectFile("package.json"));

    expect(packageJson.scripts.dev).toContain("test -f .env.local || cp .env.local.example .env.local");
    expect(packageJson.scripts["dev:api"]).toContain('DATABASE_URL="file:$PWD/data/app/travel.db" bunx prisma migrate deploy');
    expect(packageJson.scripts["dev:api"]).toContain('DATABASE_URL="file:$PWD/data/app/travel.db" NODE_ENV=development bun --env-file=.env.local');
  });
});
