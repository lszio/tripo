# 地点选择器与图片裁切 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让活动和住宿可通过显式 OSM 搜索选择地点，并让活动图片在每种卡片中等比裁切展示。

**Architecture:** 新建独立的地点查询模块以封装请求、缓存及一秒节流；`LocationPicker` 消费该模块并把完整 `Location` 返回给两个详情抽屉。图片字段和现有卡片结构不变，仅把背景展示规则统一为不重复的居中裁切。

**Tech Stack:** React 19、TypeScript、Vitest、Testing Library、OpenStreetMap Nominatim。

## Global Constraints

- 查询只由点击搜索或 Enter 触发，绝不实现键入时自动补全。
- 网络请求最少间隔 1000ms，且以关键词缓存。
- 地点结果必须包含显示名称、纬度、经度。
- 不添加新的活动或住宿字段。
- 图片必须使用 `cover`、`center`、`no-repeat`。

---

### Task 1: 地点查询逻辑

**Files:**
- Create: `src/domain/location-search.ts`
- Test: `tests/domain/location-search.test.ts`

**Interfaces:**
- Produces: `searchLocations(query: string, fetcher?: typeof fetch): Promise<Location[]>`
- Produces: `clearLocationSearchCache(): void`

- [ ] **Step 1: 写入失败测试**

```ts
it("returns coordinates from an explicit place query", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ display_name: "Hallstatt, Austria", lat: "47.56", lon: "13.64" }] });
  await expect(searchLocations("Hallstatt", fetcher)).resolves.toEqual([{ name: "Hallstatt, Austria", latitude: 47.56, longitude: 13.64 }]);
});

it("returns a cached result without a second network request", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
  await searchLocations("Hallstatt", fetcher);
  await searchLocations(" Hallstatt ", fetcher);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: 运行测试，确认因模块缺失失败**

Run: `pnpm exec vitest run tests/domain/location-search.test.ts`

- [ ] **Step 3: 实现最小查询模块**

```ts
export async function searchLocations(query: string, fetcher: typeof fetch = fetch): Promise<Location[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const cached = cache.get(normalized.toLowerCase());
  if (cached) return cached;
  await waitForNextAllowedRequest();
  const response = await fetcher(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(normalized)}`);
  if (!response.ok) throw new Error("地点搜索暂时不可用");
  const locations = (await response.json()).map(toLocation);
  cache.set(normalized.toLowerCase(), locations);
  return locations;
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm exec vitest run tests/domain/location-search.test.ts`

### Task 2: 共享地点选择控件

**Files:**
- Create: `src/components/roadbook/LocationPicker.tsx`
- Modify: `src/components/roadbook/NodeDetailDrawer.tsx`
- Modify: `src/components/roadbook/StayDetailDrawer.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/components/location-picker.test.tsx`

**Interfaces:**
- Consumes: `searchLocations(query): Promise<Location[]>`
- Produces: `<LocationPicker label value onChange />`，其中 `onChange(location?: Location): void`。

- [ ] **Step 1: 写入失败测试**

```tsx
it("writes the selected result to the activity draft", async () => {
  render(<LocationPicker label="地点" value={undefined} onChange={onChange} />);
  await user.type(screen.getByLabelText("地点"), "Hallstatt");
  await user.click(screen.getByRole("button", { name: "搜索地点" }));
  await user.click(await screen.findByRole("button", { name: /Hallstatt, Austria/ }));
  expect(onChange).toHaveBeenCalledWith({ name: "Hallstatt, Austria", latitude: 47.56, longitude: 13.64 });
});
```

- [ ] **Step 2: 运行测试，确认因控件缺失失败**

Run: `pnpm exec vitest run tests/components/location-picker.test.tsx`

- [ ] **Step 3: 实现控件和抽屉接入**

```tsx
<LocationPicker
  label="地点"
  value={draft.location}
  onChange={(location) => setDraft(current => ({ ...current, location }))}
/>
```

在活动与住宿草稿中存放 `location?: Location`；保存时直接写回该对象，移除经纬度文本框。

- [ ] **Step 4: 添加状态样式并运行测试**

Run: `pnpm exec vitest run tests/components/location-picker.test.tsx tests/components/node-detail-drawer.test.tsx`

### Task 3: 统一图片背景展示

**Files:**
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: 活动既有 `image?: string`。
- Produces: 素材库、时间轴、详情预览和图片预览的统一覆盖展示。

- [ ] **Step 1: 添加统一背景规则**

```css
.scheduled-activity-card, .material-card-media, .activity-preview-hero {
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}
.drawer-image-preview { object-fit: cover; object-position: center; }
```

- [ ] **Step 2: 运行所有相关测试并进行视觉确认**

Run: `pnpm exec vitest run tests/components/location-picker.test.tsx tests/components/node-detail-drawer.test.tsx tests/components/stay-card.test.tsx`

### Task 4: 构建验证与文档检查

**Files:**
- Modify: `README.md`（若需要补充 OSM 搜索的网络依赖）

- [ ] **Step 1: 运行完整测试**

Run: `pnpm test`

- [ ] **Step 2: 运行生产构建**

Run: `pnpm build`

- [ ] **Step 3: 手动确认流程**

打开本地页面，分别编辑活动与住宿；搜索并选择地点，保存后确认地图出现标记；使用横图和竖图确认图片没有变形或重复。
