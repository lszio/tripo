# 本地访客与旅行方案导入导出实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不接入登录或云端的前提下，提供持久化本地访客资料，以及单个旅行方案的 JSON 导入和导出。

**Architecture:** 新增纯领域模块负责导入导出格式、解析和 ID 去重；`RoadbookApp` 持有本地访客资料和当前 Archive。旅行库提供导入入口和每个旅行的导出入口，导入的方案追加到现有旅行集合，绝不覆盖本地 Archive。

**Tech Stack:** React 19、TypeScript、Vitest、浏览器 `localStorage`、浏览器 `FileReader` / `Blob` 下载。

## Global Constraints

- 保持现有 `go-travel-state-v1` Archive 数据可读取。
- 不引入账号密码、联网、第三方认证、云同步或服务端依赖。
- 导入失败不能改写当前数据。
- 导入的旅行必须生成新的旅行 ID 和路书 ID，避免与本地数据冲突。
- 导出格式需要携带版本号与导出时间；仅导出单个旅行方案。

---

### Task 1: 本地访客资料

**Files:**
- Create: `src/data/local-guest.ts`
- Test: `tests/domain/local-guest.test.ts`

**Interfaces:**
- Produces `LocalGuest`、`loadLocalGuest()`、`saveLocalGuest()`。
- `LocalGuest` 包含 `id`、`name`、`createdAt`。

- [ ] **Step 1: Write the failing test**

```ts
expect(loadLocalGuest(storage)).toMatchObject({ name: "旅行者" });
saveLocalGuest({ id: "guest-1", name: "林沐", createdAt: "2026-07-29T00:00:00.000Z" }, storage);
expect(loadLocalGuest(storage).name).toBe("林沐");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/domain/local-guest.test.ts`

- [ ] **Step 3: Write minimal implementation**

```ts
export type LocalGuest = { id: string; name: string; createdAt: string };
export function loadLocalGuest(storage?: StorageLike): LocalGuest;
export function saveLocalGuest(guest: LocalGuest, storage?: StorageLike): void;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/domain/local-guest.test.ts`

### Task 2: 旅行 JSON 格式与安全导入

**Files:**
- Create: `src/domain/trip-transfer.ts`
- Test: `tests/domain/trip-transfer.test.ts`

**Interfaces:**
- Consumes `ArchiveTravel`。
- Produces `serializeTravel(travel)`、`parseImportedTravel(raw, existingTravelIds)`。

- [ ] **Step 1: Write the failing test**

```ts
const exported = serializeTravel(travel);
const restored = parseImportedTravel(exported, new Set([travel.id]));
expect(restored.id).not.toBe(travel.id);
expect(restored.roadbook.id).not.toBe(travel.roadbook.id);
expect(restored.title).toBe(travel.title);
expect(() => parseImportedTravel("{}", new Set())).toThrow("不支持的旅行方案文件");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/domain/trip-transfer.test.ts`

- [ ] **Step 3: Write minimal implementation**

```ts
export type TravelExport = { format: "go-travel-trip"; version: 1; exportedAt: string; travel: ArchiveTravel };
export function serializeTravel(travel: ArchiveTravel): string;
export function parseImportedTravel(raw: string, existingTravelIds: Set<string>): ArchiveTravel;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/domain/trip-transfer.test.ts`

### Task 3: 访客与导入导出界面

**Files:**
- Create: `src/components/library/GuestMenu.tsx`
- Modify: `src/RoadbookApp.tsx`
- Modify: `src/components/library/TravelLibrary.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/components/app-shell.test.tsx`

**Interfaces:**
- Consumes `LocalGuest`, `serializeTravel`, `parseImportedTravel`。
- Produces访客昵称编辑、旅行导入、单旅行导出以及导入状态提示。

- [ ] **Step 1: Write the failing test**

```ts
await user.click(screen.getByRole("button", { name: "访客：旅行者" }));
await user.click(screen.getByRole("button", { name: "编辑访客资料" }));
await user.clear(screen.getByLabelText("访客昵称"));
await user.type(screen.getByLabelText("访客昵称"), "小林");
await user.click(screen.getByRole("button", { name: "保存访客资料" }));
expect(screen.getByRole("button", { name: "访客：小林" })).not.toBeNull();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/components/app-shell.test.tsx`

- [ ] **Step 3: Write minimal implementation**

```tsx
<GuestMenu guest={guest} onSave={saveGuest} />
<TravelLibrary onExportTravel={exportTravel} onImportTravel={importTravel} />
```

- [ ] **Step 4: Run component tests and build**

Run: `pnpm test && pnpm run build`
