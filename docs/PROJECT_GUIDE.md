# 自由行路书编辑器 · 协作指南

> 最后更新：2026-07-28  
> 项目定位：面向自由行的本地优先（local-first）旅行路书编辑器。

## 1. 项目目标

将「Go Travel」中的旅行攻略工作区替换为桌面端路书工作台。用户可以在同一页面完成：

1. 创建可复用的活动素材；
2. 将活动、入住和交通安排到具体日期与时间；
3. 用 30 分钟粒度调整日程；
4. 查看仅由时间轴节点驱动的地图预览；
5. 统计活动、交通与住宿预算；
6. 通过预览再进入编辑，避免误触表单。

本项目当前不接入真实登录、云同步、多人协作、AI 导入、真实导航或自动交通规划。

## 2. 当前产品范围

### 已实现

- 旅行库、旅行记录工作区与路书工作区入口。
- 本地 `localStorage` 持久化与旧攻略数据迁移。
- 本地访客资料：可修改访客昵称，资料仅保留在当前浏览器。
- 单旅行方案 JSON 导入/导出：导入时校验文件版本、重建内部 ID，并追加为一段新旅行。
- 旅行名称、日期范围、人数、默认币种设置；变更日期范围时可选择保留或删除超出范围的排期。
- 日历化 Day：Day 由旅行起止日期生成，不使用自定义 Day 名称。
- 活动母卡素材库：活动母卡不会因排期而消失，可拖拽排序、重复安排至多个日期。
- 48 个时间 Slot（每格 30 分钟）的日时间轴，默认 `08:00–23:00`；拖拽至边缘自动扩展，可切换全天。
- 活动、入住、交通排期的拖放、跨 Day 移动、时长拖拽与冲突顺延。
- 多住宿方案：每个 Day 可有多张住宿卡；仅当前住宿可从住宿区拖入时间轴；同一酒店可在当天出现多个入住排期。
- 地图预览与独立地图工作区（OpenStreetMap + Leaflet）。
- 预算汇总、币种换算、活动/交通/住宿分类统计。
- 活动、入住、交通卡片的双击预览；预览内再进入编辑。
- Day 复制/粘贴：复制活动排期、住宿卡及交通关系到另一日期；目标日期已有内容保留。

### 暂不实现

- AI 文本解析、AI 自动排程。
- 真实路线搜索、导航、距离/耗时计算。
- 自动生成交通（数据模型保留 `routeType: "generated"`）。
- 云端数据、账户、协作与权限。
- 第三方商业地图密钥。

## 3. 体验与设计原则

### 工作台

路书编辑器是一个整体工作台，而不是旅游展示页：

```text
一体化旅行头部（基础信息、预算统计、设置）
Day 导航（选择、复制、粘贴）
素材库 | 当前 Day 时间轴 | 地图 / 住宿 / 当日预算
```

- 时间轴负责编辑；地图负责理解空间关系。
- 视觉采用深黑、冷灰蓝与青蓝能量色；使用低对比网格、半透明深色面板与克制的冷色发光。
- 顶部以一体化大卡呈现，含旅行信息、总预算、行程天数、已排期节点和设置入口。
- 卡片标题优先级最高；有图片时用 `cover` 裁切作为背景，不拉伸。
- 所有按钮应有 default / hover / active / disabled / focus-visible 状态。
- 桌面端优先完整编辑；移动端允许查看、轻量调整和执行行程。

### 卡片交互

- **素材活动、时间轴活动、时间轴入住、时间轴交通**：双击打开概要预览。
- 预览中点击「编辑活动 / 编辑住宿 / 编辑交通」才打开详情抽屉。
- 点击工作台空白处关闭预览。
- 删除活动母卡、排期实例、住宿、交通均走二次确认。
- 排期删除只删除实例；活动母卡不受影响。

### Day 复制 / 粘贴

- 每个日期右侧有复制（`⧉`）和粘贴（`⎘`）控件。
- 复制来源日期后，不能粘贴回同一日期。
- 粘贴不会清空目标 Day；目标 Day 中已有排期、住宿继续保留。
- 活动排期继续引用原活动母卡；住宿卡和所有排期实例生成新 ID。
- 交通卡中的 `fromScheduleId` / `toScheduleId` 会重映射到复制出的排期实例。
- 粘贴到没有实际 `Day` 数据、但位于日期范围内的日历日期时，会自动物化该 Day。
- 时间轴冲突使用 `TimelineEngine.insertSchedule` 的规则处理；没有足够空间时取消粘贴并提示。

## 4. 核心数据模型

定义位置：`src/domain/roadbook.ts`。

```ts
type Trip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  currency: string;
  people: number;
  days: Day[];
  activities: Activity[];
  schedule: ScheduledNode[];
};
```

### Activity 与 ActivitySchedule

```text
Activity（可复用素材母卡）
  └─ ActivitySchedule（某次排期实例）
```

- `Activity` 保存名称、地点、图片、默认价格、标签、备注、链接。
- `ActivitySchedule` 只保存本次出现的 Day、`startSlot`、`durationSlots`、时间锁定状态，以及可选价格/备注覆盖。
- **禁止**为活动增加独立 `order` 字段；时间轴顺序只由 `startSlot` 决定。
- 默认 `durationSlots = 1`，即 30 分钟。

### Stay 与 StaySchedule

- `Day.stays` 保存当日住宿方案，可同时存在多个。
- `StaySchedule` 是入住时间轴实例，允许同一家当前酒店在同一天存在多次。
- `isPrimary` 表示当前住宿方案；切换当前住宿时，当日原当前住宿的时间轴实例会切换为新住宿。
- 删除住宿母卡会删除所有引用它的入住排期。

### RouteSchedule

- 交通卡属于时间轴节点，保存出发/到达排期引用、交通方式、时长、价格、来源类型和状态。
- V1 仅创建 `routeType: "manual"` 的交通卡。
- 关联活动排期被删除后，交通卡标记为 `status: "invalid"`，不自动规划新路线。

### 时间计算

```text
一天 = 48 个 slot
1 slot = 30 分钟
08:00 = slot 16
23:00 = slot 46
```

- `startSlot`：节点开始时间和排序依据。
- `durationSlots`：节点高度；最小值为 1。
- `isTimeLocked = false`：允许插入或拖动时自动顺延。
- `isTimeLocked = true`：不可被自动顺延。

## 5. 架构与目录职责

```text
src/
├── RoadbookApp.tsx                 # 应用级路由和 Archive 提交
├── components/
│   ├── library/                    # 我的旅行入口
│   ├── records/                    # 旅行记录工作区（保留功能）
│   └── roadbook/                   # 路书工作台 UI
├── data/archive-storage.ts         # localStorage 读取与保存
├── data/local-guest.ts              # 本地访客资料读取与保存
├── domain/                         # 纯业务模型、预算、时间轴、地图、迁移
│   └── trip-transfer.ts             # 单旅行 JSON 序列化、校验与 ID 重建
├── store/roadbook-store.ts         # Zustand 路书状态与写操作
└── styles/                         # tokens.css + app.css
```

### 关键模块

| 模块 | 职责 |
| --- | --- |
| `RoadbookWorkspace` | 工作台编排、拖拽事件、预览状态、删除确认、地图工作区切换。 |
| `TripHeader` | 一体化旅行头部、全行程预算概览和旅行设置抽屉。 |
| `DayNavigator` | 日历日期选择与 Day 复制/粘贴控件。 |
| `MaterialLibrary` | 活动母卡排序、预览和删除。 |
| `DayTimeline` | 当前 Day 的可见时间范围、节点渲染与拖放目标。 |
| `TimelineEngine` | 纯时间轴逻辑：slot、吸附、冲突、顺延、跨 Day、时长。 |
| `MapPreview` / `MapWorkspace` | OSM/Leaflet 地图预览、单日节点与每日路线总览。 |
| `BudgetPanel` | 当日预算明细和预算币种选择。 |
| `roadbook-store` | Zustand 状态、草稿、提交、删除、复制/粘贴等写操作。 |

## 6. 状态与持久化

### 状态分层

- **Trip 业务数据**：存于 Zustand store 的 `trip`，每次提交经 `RoadbookApp` 写回 Archive。
- **UI 状态**：当前 Day、详情草稿、预览、删除确认、地图工作区、复制缓冲区。
- **编辑草稿**：活动、住宿、交通抽屉均先编辑草稿；保存后再提交 Trip。

### 本地存储

- Key：`go-travel-state-v1`。
- Schema：`Archive.schemaVersion = 2`。
- 本地访客 Key：`go-travel-local-guest-v1`；仅保存访客 ID、昵称和创建时间。
- 导出文件格式：`go-travel-trip` v1；包含导出时间和一段完整 `ArchiveTravel`。
- 导入失败只显示提示，不覆盖当前 Archive；导入成功后作为新的旅行追加到本地集合。
- 浏览器文件导入使用 `FileReader` 读取 JSON；不要依赖 `File.text()`，以兼容更多浏览器与测试环境。
- 旧 `editablePlan.days[].cards[]` 会迁移为 `Activity + ActivitySchedule`。
- 迁移无时间的旧卡从 `07:00`（slot 14）开始，并经过时间轴规范化。
- 读取失败时保留恢复提示并生成演示数据；不要静默覆盖无法解析的原数据。

## 7. 地图与预算规则

### MapPreview

- V1 使用 OpenStreetMap + Leaflet，不使用 Google Maps 或真实导航。
- 当日地图节点**只**来自该 Day 时间轴中已排期的活动和入住实例。
- 未排期的活动或住宿不显示为当日地图节点。
- 节点无坐标时在列表显示「未设置位置」，不放 Marker。
- 地图工作区的「每日路线总览」按日期分配低饱和彩虹色；跨天连线使用出发日颜色。

### Budget

- 活动价格优先级：`ActivitySchedule.priceOverride` → `Activity.defaultPrice`。
- 交通使用 `RouteSchedule.price`，住宿使用 `StayNode.price`。
- `Price.unit`：`total`、`person`、`night`。
- `person` 按 `Trip.people` 放大；`night` 按入住晚数计算，缺失日期时按 1 晚。
- 所有总额按内置参考汇率换算到选定币种；该汇率仅作本地估算。

## 8. 开发约定

### 修改功能前

1. 先确认是否应放入 `domain`、`store` 或 React 组件。
2. 时间轴计算不要写在组件内，优先扩展 `src/domain/timeline-engine.ts`。
3. 新交互至少补充一个相邻组件或领域层测试。
4. 保持 Activity 母卡与 ActivitySchedule 实例分离。

### 验证命令

```bash
pnpm test
pnpm run build
```

测试目录：

```text
tests/domain/       # 纯业务逻辑与 store
tests/components/   # 组件交互与工作台行为
```

### 不要破坏的兼容性

- 不移除旅行库、旅行记录工作区或 `localStorage` 模式。
- 不把地图改回需要 API Key 的服务。
- 不把复制/粘贴改为共享同一个住宿或排期实例。
- 不在 `ActivitySchedule` 增加时间排序用的 `order`。
- 不在点击卡片时直接打开编辑抽屉；保持「双击预览 → 主动编辑」。

## 9. 建议的后续演进

1. AI 文本导入：LLM 输出结构化 `Activity` / `ActivitySchedule`，再进入现有 TimelineEngine。
2. 真实路线：保留 `RouteSchedule.routeType` 和 `status`，接入路线服务后再生成 polyline 与耗时。
3. 云同步：先抽象 Archive repository，再引入账户与冲突合并。
4. 移动端执行模式：当日时间轴、地图、打卡、照片和轻量调整。
