# Prisma、TinyAuth 与 Dokploy 集成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将路书编辑器迁移到受 TinyAuth Google OAuth 保护、由 Prisma/SQLite 持久化的 Dokploy Docker Compose 部署。

**Architecture:** Fastify 在单一应用容器中提供 `/api` 并托管 Vite 构建产物。TinyAuth 在 Traefik/Dokploy 前置代理中完成 Google 登录；Fastify 只接受代理注入的邮箱头，并按邮箱建立用户记录。为避免重写已成熟的路书编辑逻辑，当前 `ArchiveTravel.roadbook`、计划和记录以 JSON 文本保存在旅行记录中，旅行与用户保持规范化关系。

**Tech Stack:** React 19、Vite 7、TypeScript、Fastify、Prisma、SQLite、Vitest、Docker Compose、TinyAuth v5。

## Global Constraints

- 生产环境仅支持 Dokploy/NAS Docker 部署，不支持 Vercel。
- 仅由 Traefik/TinyAuth 网络访问应用；应用容器不能直接发布宿主机端口。
- 使用 `APP_DOMAIN` 和 `AUTH_DOMAIN` Dokploy 环境变量；Google 回调为 `https://${AUTH_DOMAIN}/api/oauth/callback/google`。
- Google Client ID、Client Secret、OAuth 白名单及数据库路径不得提交到仓库。
- TinyAuth 使用 `TINYAUTH_OAUTH_WHITELIST` 限制可登录邮箱。
- 旅行资源必须以当前认证用户 ID 过滤；跨用户访问返回 `404`。
- 历史 `localStorage` 导入必须幂等，失败时不得设置已导入标记。
- 不提交任何 Git 提交，除非用户明确要求。

---

## File Structure

- `prisma/schema.prisma`：SQLite 数据模型和 Prisma Client 生成配置。
- `server/app.mjs`：Fastify 工厂、身份解析、API 路由和静态文件托管。
- `server/travel-repository.mjs`：Prisma 与 `ArchiveTravel` 的转换、所有权过滤和导入事务。
- `server/auth.mjs`：受信任代理身份头验证与当前用户 upsert。
- `server/errors.mjs`：统一 API 错误格式和 Fastify 错误处理。
- `vite.config.ts`：将 Node 端 `.mjs` 测试纳入 Vitest 发现范围。
- `src/data/api-archive-storage.ts`：浏览器 API 客户端及首次本地档案导入协调器。
- `src/RoadbookApp.tsx`：异步加载服务端档案、提交变更与保存错误提示。
- `tests/server/*.test.mjs`：API、身份、导入和仓储行为测试。
- `tests/domain/api-archive-storage.test.ts`：浏览器存储迁移测试。
- `Dockerfile`：构建前端、生成 Prisma Client 和生产镜像。
- `docker-compose.yml`：应用、TinyAuth、持久卷与 Traefik 标签。
- `.env.example`：无秘密的 Dokploy 配置清单。
- `README.md`：本地运行、Google OAuth 和 Dokploy 部署步骤。

### Task 1: Establish Prisma persistence

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `prisma/schema.prisma`
- Create: `tests/server/travel-repository.test.mjs`
- Create: `server/travel-repository.mjs`

**Interfaces:**
- Produces `createTravelRepository(prisma)` with `listForUser(userId)`, `findForUser(userId, travelId)`, `replaceForUser(userId, travel)`, `deleteForUser(userId, travelId)`, and `importArchiveOnce(userId, archive)`.
- `replaceForUser` accepts `ArchiveTravel` and returns `Promise<ArchiveTravel>`.
- `importArchiveOnce` returns `Promise<{ imported: boolean; archive: Archive }>`.

- [ ] **Step 1: Install runtime and development dependencies**

Run: `pnpm add fastify @fastify/static @prisma/client && pnpm add -D prisma`

Add scripts to `package.json`:

```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy",
    "start": "node server/index.mjs"
  }
}
```

Extend the Vitest `include` value in `vite.config.ts` so it is exactly:

```ts
include: ["tests/**/*.test.{ts,tsx,mjs}"],
```

- [ ] **Step 2: Write repository tests before the repository**

Create `tests/server/travel-repository.test.mjs` with a Prisma-compatible fake that records calls, then assert the following public behavior:

```js
it("returns only travels belonging to the requested user", async () => {
  const repository = createTravelRepository(fakePrismaWithTravels([ownerTravel, otherTravel]));
  await expect(repository.listForUser("user-owner")).resolves.toEqual([ownerTravel]);
});

it("does not import the same local archive twice", async () => {
  const repository = createTravelRepository(fakePrismaWithoutImportMarker());
  await expect(repository.importArchiveOnce("user-owner", localArchive)).resolves.toMatchObject({ imported: true });
  await expect(repository.importArchiveOnce("user-owner", localArchive)).resolves.toMatchObject({ imported: false });
});
```

- [ ] **Step 3: Run the repository test and confirm RED**

Run: `pnpm test tests/server/travel-repository.test.mjs`

Expected: failure because `server/travel-repository.mjs` does not exist.

- [ ] **Step 4: Define the schema and implement the smallest repository**

Create `prisma/schema.prisma` with these database records:

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  displayName String?
  importedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  travels     Travel[]
}

model Travel {
  id             String   @id
  userId         String
  title          String
  destination    String?
  status         String
  roadbookJson   String
  editablePlanJson String?
  recordingPlanJson String?
  recordsJson    String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, updatedAt])
}
```

Configure `datasource db` with `provider = "sqlite"` and `url = env("DATABASE_URL")`. In `server/travel-repository.mjs`, serialize nested roadbook data with `JSON.stringify`; parse malformed JSON as a repository error. `findForUser`, `replaceForUser`, and `deleteForUser` must query with `{ id: travelId, userId }`. `importArchiveOnce` must run the marker update and all travel inserts in one interactive transaction.

- [ ] **Step 5: Create the initial migration, generate Prisma Client, and verify GREEN**

Run: `DATABASE_URL=file:./dev.db pnpm prisma migrate dev --name init && pnpm prisma:generate && pnpm test tests/server/travel-repository.test.mjs`

Expected: Prisma creates `prisma/migrations/*_init/migration.sql`, all repository tests pass. Do not add `prisma/dev.db` to version control.

- [ ] **Step 6: Review only the Task 1 diff**

Run: `git diff -- package.json vite.config.ts prisma/schema.prisma server/travel-repository.mjs tests/server/travel-repository.test.mjs`

Expected: persistence schema and repository match the declared interfaces; do not commit.

### Task 2: Add authenticated Fastify API

**Files:**
- Create: `server/auth.mjs`
- Create: `server/errors.mjs`
- Create: `server/app.mjs`
- Create: `server/index.mjs`
- Create: `tests/server/app.test.mjs`

**Interfaces:**
- `resolveCurrentUser(request, prisma)` returns `Promise<{ id: string; email: string; displayName: string | null }>` or throws `UnauthorizedError`.
- `createApp({ prisma, distDir })` returns a Fastify instance exposing `/api/me`, `/api/travels`, `/api/travels/:id`, `/api/import/local-archive`, and `GET /health`.

- [ ] **Step 1: Write endpoint tests before implementation**

Create `tests/server/app.test.mjs` to inject requests into a yet-to-be-created app:

```js
it("rejects API calls without the proxy identity header", async () => {
  const app = createApp({ prisma: fakePrisma, distDir: false });
  const response = await app.inject({ method: "GET", url: "/api/me" });
  expect(response.statusCode).toBe(401);
  expect(response.json()).toEqual({ error: "UNAUTHENTICATED", message: "需要先登录" });
});

it("returns 404 instead of another user's travel", async () => {
  const app = createApp({ prisma: fakePrismaWithOtherUserTravel, distDir: false });
  const response = await app.inject({ method: "GET", url: "/api/travels/other-travel", headers: { "remote-email": "owner@example.com" } });
  expect(response.statusCode).toBe(404);
});
```

- [ ] **Step 2: Run the endpoint tests and confirm RED**

Run: `pnpm test tests/server/app.test.mjs`

Expected: failure because `server/app.mjs` does not exist.

- [ ] **Step 3: Implement proxy identity, error mapping, and routes**

In `server/auth.mjs`, read the exact TinyAuth forwarded email header configured in Compose as `remote-email`, trim it, validate it with `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, then use `prisma.user.upsert({ where: { email }, update: {}, create: { email } })`. Do not read identity from query parameters, request bodies, or browser-controlled cookies.

In `server/errors.mjs`, define:

```js
export class UnauthorizedError extends Error {}
export class NotFoundError extends Error {}
export class ValidationError extends Error {}
```

Map them to `{ error: "UNAUTHENTICATED", message: "需要先登录" }` with `401`, `{ error: "NOT_FOUND", message: "旅行不存在" }` with `404`, and `{ error: "INVALID_REQUEST", message }` with `400`. Map Prisma availability failures to `503` and `{ error: "DATABASE_UNAVAILABLE", message: "数据服务暂不可用，请稍后重试" }`.

Register API routes in `server/app.mjs`. Parse `POST /api/import/local-archive` body as `{ archive: Archive }`; parse `PUT /api/travels/:id` body as `{ travel: ArchiveTravel }`; reject missing IDs and invalid nested JSON with `ValidationError`.

- [ ] **Step 4: Run endpoint and repository tests to verify GREEN**

Run: `pnpm test tests/server/app.test.mjs tests/server/travel-repository.test.mjs`

Expected: all tests pass, including authentication and ownership cases.

- [ ] **Step 5: Add a production server entry point**

Create `server/index.mjs`:

```js
import { PrismaClient } from "@prisma/client";
import { createApp } from "./app.mjs";

const app = createApp({ prisma: new PrismaClient(), distDir: new URL("../dist", import.meta.url) });
await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3000) });
```

Ensure `GET /health` returns `{ status: "ok" }` without an authenticated user.

- [ ] **Step 6: Review only the Task 2 diff**

Run: `git diff -- server tests/server`

Expected: every protected route resolves the user once and uses repository methods that filter by user ID; do not commit.

### Task 3: Migrate the browser storage layer

**Files:**
- Create: `src/data/api-archive-storage.ts`
- Modify: `src/RoadbookApp.tsx`
- Modify: `src/main.tsx`
- Create: `tests/domain/api-archive-storage.test.ts`
- Modify: `tests/components/app-shell.test.tsx`

**Interfaces:**
- `createApiArchiveStorage(fetcher)` returns `loadArchive()`, `saveTravel(travel)`, and `importLocalArchiveOnce(localArchive)`.
- `loadArchive()` returns `Promise<Archive>`.
- `RoadbookApp` accepts `archiveStorage?: ApiArchiveStorage` for deterministic component tests.

- [ ] **Step 1: Write the API storage tests first**

Create `tests/domain/api-archive-storage.test.ts`:

```ts
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
  const storage = createApiArchiveStorage(async () => new Response("offline", { status: 503 }));
  await expect(storage.importLocalArchiveOnce(localArchive)).rejects.toThrow("数据服务暂不可用");
});
```

- [ ] **Step 2: Run the browser storage test and confirm RED**

Run: `pnpm test tests/domain/api-archive-storage.test.ts`

Expected: failure because `src/data/api-archive-storage.ts` does not exist.

- [ ] **Step 3: Implement API client and asynchronous app bootstrap**

`createApiArchiveStorage` must request `/api/travels`, convert the response to `Archive`, and preserve the currently selected travel. It must send `PUT /api/travels/:id` for a changed travel and `POST /api/import/local-archive` with `{ archive }` for migration. Convert non-OK API responses to Chinese `Error` messages using their response payload.

Change `RoadbookApp` to begin with a loading state, load the remote archive in `useEffect`, and show a retryable error state if loading fails. On successful remote load, inspect `loadArchive().archive` from the legacy local storage and call `importLocalArchiveOnce` only when the archive contains travels. Preserve the legacy local data until a successful remote load after import. Change `commitRoadbook` and travel import to await API saves; if saving fails, retain the visible edit and set a `save-notice` error.

- [ ] **Step 4: Verify GREEN with component coverage**

Run: `pnpm test tests/domain/api-archive-storage.test.ts tests/components/app-shell.test.tsx`

Expected: storage tests pass and the app shell shows loading, loaded, and failed states.

- [ ] **Step 5: Review only the Task 3 diff**

Run: `git diff -- src/RoadbookApp.tsx src/main.tsx src/data/api-archive-storage.ts tests/domain/api-archive-storage.test.ts tests/components/app-shell.test.tsx`

Expected: UI does not write localStorage after server persistence is available; do not commit.

### Task 4: Package the Dokploy deployment

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `README.md`
- Create: `tests/deployment-config.test.mjs`

**Interfaces:**
- `docker compose config` accepts `.env` derived from `.env.example`.
- `app` reads `DATABASE_URL=file:/data/travel.db` and listens only on its Docker network.
- `tinyauth` receives `TINYAUTH_APPURL=https://${AUTH_DOMAIN}` and Google OAuth configuration.

- [ ] **Step 1: Write deployment configuration assertions first**

Create `tests/deployment-config.test.mjs` to read YAML/text and assert:

```js
it("persists separate application and TinyAuth SQLite volumes", () => {
  expect(compose).toContain("travel-data:/data");
  expect(compose).toContain("tinyauth-data:/data");
});

it("does not publish the application container port", () => {
  expect(appService).not.toMatch(/^\s*ports:/m);
});
```

- [ ] **Step 2: Run the deployment configuration test and confirm RED**

Run: `pnpm test tests/deployment-config.test.mjs`

Expected: failure because `docker-compose.yml` does not exist.

- [ ] **Step 3: Create Dockerfile, Compose configuration, and safe env template**

Use a multi-stage Node LTS Dockerfile. In the build stage install locked dependencies, run `pnpm prisma:generate`, then `pnpm build`. In the runtime stage copy the generated Prisma client, `dist`, `server`, and production dependencies. Set `DATABASE_URL=file:/data/travel.db`; execute `pnpm prisma:migrate` before `pnpm start`.

Create `docker-compose.yml` services and labels:

```yaml
services:
  app:
    build: .
    restart: unless-stopped
    environment:
      DATABASE_URL: file:/data/travel.db
      PORT: 3000
    volumes:
      - travel-data:/data
    labels:
      traefik.enable: "true"
      traefik.http.routers.go-travel.rule: Host(`${APP_DOMAIN}`)
      traefik.http.routers.go-travel.entrypoints: websecure
      traefik.http.routers.go-travel.tls: "true"
      traefik.http.routers.go-travel.middlewares: tinyauth@docker
      traefik.http.services.go-travel.loadbalancer.server.port: "3000"

  tinyauth:
    image: ghcr.io/tinyauthapp/tinyauth:v5
    restart: unless-stopped
    environment:
      TINYAUTH_APPURL: https://${AUTH_DOMAIN}
      TINYAUTH_DATABASE_PATH: /data/tinyauth.db
      TINYAUTH_OAUTH_PROVIDERS_GOOGLE_CLIENTID: ${GOOGLE_CLIENT_ID}
      TINYAUTH_OAUTH_PROVIDERS_GOOGLE_CLIENTSECRET: ${GOOGLE_CLIENT_SECRET}
      TINYAUTH_OAUTH_WHITELIST: ${TINYAUTH_OAUTH_WHITELIST}
      TINYAUTH_AUTH_TRUSTEDPROXIES: 172.16.0.0/12
    volumes:
      - tinyauth-data:/data
    labels:
      traefik.enable: "true"
      traefik.http.routers.tinyauth.rule: Host(`${AUTH_DOMAIN}`)
      traefik.http.routers.tinyauth.entrypoints: websecure
      traefik.http.routers.tinyauth.tls: "true"
      traefik.http.services.tinyauth.loadbalancer.server.port: "3000"
      traefik.http.middlewares.tinyauth.forwardauth.address: http://tinyauth:3000/api/auth/traefik
      traefik.http.middlewares.tinyauth.forwardauth.authResponseHeaders: Remote-Email,Remote-Name
```

Add health checks for `/health` and TinyAuth. Configure forwarded headers to pass the TinyAuth email as `Remote-Email`, which Fastify receives as `remote-email`. Put `DATABASE_URL`, OAuth credentials, domains, and `.env` in `.gitignore`; `.env.example` lists variables with empty values only.

- [ ] **Step 4: Document deployment setup**

Update `README.md` with these ordered instructions:

1. Create `APP_DOMAIN` and `AUTH_DOMAIN` routes in Dokploy.
2. Create a Google Web OAuth client.
3. Set the authorized redirect URI to `https://${AUTH_DOMAIN}/api/oauth/callback/google`.
4. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and comma-separated `TINYAUTH_OAUTH_WHITELIST` as Dokploy secrets.
5. Deploy Compose; verify `/health`, Google login, whitelist rejection, and data retention after redeploy.

- [ ] **Step 5: Verify deployment configuration GREEN**

Run: `pnpm test tests/deployment-config.test.mjs && cp .env.example /tmp/go-travel.env && docker compose --env-file /tmp/go-travel.env config`

Expected: test passes and Compose configuration renders without an application `ports` binding.

- [ ] **Step 6: Run the full project verification**

Run: `pnpm test && pnpm build && docker build -t go-travel:local .`

Expected: all test suites pass, TypeScript/Vite build succeeds, and Docker image builds.

- [ ] **Step 7: Review final diff without committing**

Run: `git status --short && git diff --check && git diff --stat`

Expected: no whitespace errors, no secret file changes, and all expected application, Prisma, deployment, test, and documentation files are present.

## Spec Coverage Review

- NAS/Dokploy Compose deployment: Task 4.
- Separate SQLite volumes for app and TinyAuth: Task 4.
- Google OAuth and whitelist: Task 4.
- User-scoped data and proxy-derived identity: Task 2.
- Prisma/SQLite persistence: Task 1.
- Existing local storage migration and retries: Task 3.
- Authentication, isolation, import and build verification: Tasks 1–4.

## Self-Review

- The plan does not use unbounded local storage writes after migration.
- Every route and repository method uses the same `userId` ownership boundary.
- All interfaces consumed by later tasks are introduced by earlier tasks.
- Secret values are restricted to Dokploy configuration and excluded from source control.
