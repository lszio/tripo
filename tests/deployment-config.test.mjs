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

  it("builds and starts the app with migrations before the Fastify server", async () => {
    const dockerfile = await readProjectFile("Dockerfile");

    expect(dockerfile).toMatch(/FROM node:\d+-alpine AS build/);
    expect(dockerfile).toContain("pnpm prisma:generate");
    expect(dockerfile).toContain("pnpm build");
    expect(dockerfile).toContain('CMD ["sh", "-c", "pnpm prisma:migrate && pnpm start"]');
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
});
