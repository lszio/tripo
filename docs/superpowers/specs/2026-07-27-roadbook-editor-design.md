# 自由行路书编辑器改造设计

## 目标

将现有“Go Travel”中单次旅行的“攻略”工作区替换为自由行路书编辑器。保留“我的旅行”和“旅行记录”入口、记录模式与浏览器本地持久化；本次不实现真实地图服务、AI 导入、真实交通规划、登录或协作。

编辑器以桌面端整体工作台为核心：用户在同一页面中创建可复用活动、将活动安排到一个或多个 Day、通过时间轴调整具体排期，并在不离开编辑上下文的情况下查看和修改详情。

## 产品边界

### 保留

- 现有本地旅行集合、旅行选择、旅行记录与记录模式。
- `localStorage` 持久化模式；不使用服务器或第三方账号。
- 已有旅行数据和已有实录数据的可读性。

### 替换

- “攻略”标签页的自由文本卡片网格。
- 攻略主题选择、攻略冻结版本的编辑呈现。

### V1 包含

- 旅行基础信息展示，以及 Day 的创建、删除、重命名、排序和切换。
- 活动母卡素材库、活动详情编辑、活动排期实例。
- 48 槽（00:00–24:00）日时间轴；桌面端默认滚动到 06:00，仍可上下查看完整 24 小时。
- 30 分钟吸附、跨 Day 拖放、实例持续时间调整。
- 交通卡、住宿锚点、基础地图示意和预算统计。
- 桌面端详情侧栏与移动端全屏详情编辑。

### V1 不包含

- AI 文本解析、真实路线搜索或导航、地图 SDK 与第三方地图密钥。
- 自动交通重算、多人编辑、上传或云端同步。
- 对旧“旅行记录”工作区的结构性重做。

## 技术方案

将项目由无构建工具的原生 JavaScript 升级为 React、TypeScript 与 Vite。选择此方案是为了让拖放、临时编辑状态、跨面板同步和数据迁移有明确的组件与状态边界。

- React：页面、对话框和时间轴组成可组合组件。
- TypeScript：区分可复用活动、具体排期、交通与住宿，减少引用关系错误。
- Zustand：管理当前旅行、详情面板、编辑草稿和本地持久化。
- dnd-kit：素材库到时间轴、跨 Day 移动，以及键盘可访问的拖放操作。
- 纯 CSS 设计令牌：保持无衬线、暖白、细分隔线、低装饰的统一视觉。

不引入线上地图、路由或 AI SDK。地图由具有坐标的活动/住宿渲染为本地路线示意；缺少坐标时展示“未设置位置”。

## 工作台布局

### 桌面端

“攻略”页是一个整体页面而不是多个跳转页面：

1. 顶部栏：旅行名称、日期、人数、币种、总预算和主要添加操作。
2. Day 导航：可切换 Day，也可新增、重命名、重排或删除 Day。
3. 左栏素材库：所有活动母卡的持久列表，不随排期而消失。
4. 中栏时间轴：当前 Day 的 48 个 30 分钟槽和该日排期实例。
5. 右栏：当前 Day 的 `MapPreview`、住宿锚点与独立 `BudgetPanel`。
6. 详情面板：点击任一活动母卡、排期实例、交通卡或住宿卡后从右侧打开；不离开工作台。

### 移动端

以“Day 列表 + 当日时间轴”为主。详情编辑改为全屏页面式面板；素材库和地图通过底部操作进入。触控目标不小于 44px。

## 视觉规范

- 字体：系统无衬线字体栈，优先 `Inter`、`PingFang SC`、`Microsoft YaHei`、Arial。
- 基调：暖白或浅灰背景、深墨色正文、低饱和自然色作为单一强调色。
- 结构：使用留白、细边线和浅层级来区分区域；不使用仪表盘式密集卡片或重阴影。
- 状态：仅对无效交通、未定位、冲突或保存失败使用语义色；不能仅凭颜色传递状态。
- 可访问性：可见焦点、语义按钮与标签、键盘可打开详情和操作拖放。

## 数据模型

### 旅行

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

type Day = {
  id: string;
  date: string;
  title?: string;
  order: number;
  stays?: StayNode[];
};
```

### 活动母卡与排期实例

素材库保存 `Activity`，无论该活动是否被安排，都永久存在。将活动拖入时间轴创建 `ActivitySchedule`，它只引用 `activityId`，不会移动或复制母卡。

```ts
type Location = { name: string; latitude?: number; longitude?: number };
type Price = {
  amount: number;
  currency: string;
  unit: "total" | "person" | "night";
};

type Activity = {
  id: string;
  type: "activity";
  name: string;
  location?: Location;
  image?: string;
  defaultPrice?: Price;
  tags?: string[];
  note?: string;
  url?: string;
};

type ActivitySchedule = {
  id: string;
  type: "activity";
  activityId: string;
  dayId: string;
  startSlot: number;
  durationSlots: number;
  isTimeLocked: boolean;
  priceOverride?: Price;
  noteOverride?: string;
};
```

一个活动可在同日或多个 Day 生成多条 `ActivitySchedule`。编辑 `Activity` 的名称、地点、图片、标签、默认价格、备注或链接，所有实例立即读取到新值；编辑实例的时间、时长、价格覆盖和实例备注，仅影响本次安排。

`isTimeLocked` 表示用户明确指定的时间。未锁定实例可由时间引擎在拖入、插入或排期冲突时自动顺延；已锁定实例绝不被系统自动移动。

### 交通与住宿

```ts
type RouteSchedule = {
  id: string;
  type: "route";
  dayId: string;
  fromScheduleId?: string;
  toScheduleId?: string;
  transport?: "walk" | "train" | "car" | "flight" | "other";
  durationSlots?: number;
  price?: Price;
  routeType: "manual" | "generated";
  status: "valid" | "invalid";
};

type StayNode = {
  id: string;
  type: "stay";
  name: string;
  location?: Location;
  checkIn?: string;
  checkOut?: string;
  price?: Price;
  isPrimary?: boolean;
  note?: string;
};

type ScheduledNode = ActivitySchedule | RouteSchedule;
```

交通卡位于关联活动之间，视觉区别于普通活动。`routeType` 在 V1 始终由手动创建的交通卡写为 `manual`，保留 `generated` 以支持将来的自动路线功能。删除或移动关联活动后，保留交通卡并将其标记为 `invalid`，详情面板提供删除或重新连接操作。

一个 Day 可以有多个住宿节点，以支持换酒店或临时住宿调整；住宿不出现在时间轴。V1 右栏优先展示 `isPrimary: true` 的住宿，未标记时展示数组的第一项，并可从详情面板切换主要住宿。

## 核心交互

### 素材库和排期

1. 用户创建活动时只需填写名称；其余字段可稍后在详情面板补充。
2. 点击素材库卡片打开活动母卡详情；点击时间轴卡片打开该实例详情，并可进一步跳至母卡。
3. 从素材库拖到时间轴，在最近的 30 分钟槽创建新实例；未选择时长时 `durationSlots` 默认是 `1`（30 分钟）。
4. 在时间轴拖动实例，更新 `dayId` 和 `startSlot`；可跨 Day 移动。
5. 调整实例的底部手柄，更新 `durationSlots`；最短为一个槽（30 分钟）。
6. 删除实例只移除该条 `ActivitySchedule`；删除母卡前须先提示其被引用次数，并明确“删除母卡会移除所有关联排期实例”。

时间轴不保存额外 `order` 字段。每个 Day 中的活动实例只按 `startSlot` 升序显示；正常新增、移动和迁移都会消除相同开始槽与时间重叠。释放活动时，`TimelineEngine` 先根据指针位置计算候选 `startSlot`，然后定位插入边界：若候选槽位落在已有卡片的时间区间内，则插入到该卡片结束之后；否则插入到第一张开始时间不早于候选槽位的卡片之前。引擎从该插入点起依次推移发生重叠的后续未锁定卡片到下一个可用槽。

已锁定卡片是不可跨越的时间边界：若顺延会与已锁定卡片重叠，时间引擎将新插入或被移动的实例放到该锁定卡片结束之后，再继续处理后续未锁定卡片；它不会自动改写锁定卡片的 `startSlot` 或 `durationSlots`。若在此规则下没有连续可用时间，或任何排期会超过第 48 槽，取消本次操作并提示当天没有可用时间；不会静默覆盖或截断已有安排。

### 详情预览与编辑

桌面端使用右侧面板，移动端使用全屏面板。所有修改先在草稿中完成，点击保存才写入旅行状态；关闭时若有未保存更改，提示放弃或继续编辑。

- 活动母卡：名称、地点、图片、默认价格、标签、备注、链接，及“已安排 N 次”引用数量。
- 活动实例：所属 Day、开始时间、持续时间、价格覆盖、实例备注，及跳转到母卡的入口。
- 交通卡：起点、终点、方式、时长、价格与有效状态。
- 住宿卡：名称、地点、入住/退房、费用与备注。

### 地图与预算

- `MapPreview` 根据当前 Day 的住宿与有坐标的活动实例，按时间排序显示 Marker 与简单连接线。它不是地图服务：不提供导航、路线搜索或距离计算；缺少坐标的节点显示“未设置位置”。
- `BudgetPanel` 独立负责总预算、当日预算和活动/交通/住宿分类统计。
- 总预算按全部活动实例的 `priceOverride ?? activity.defaultPrice`、交通价格和住宿价格累加；重复安排会分别计入预算。`total` 直接计入金额，`person` 乘以旅行人数，`night` 乘以住宿的入住晚数；缺失入住/退房日期时，`night` 在 V1 按该 Day 的一晚计算。
- 当日预算按照当前 Day 的同一规则计算。没有价格的节点不计入总额，并在详情中保持可编辑状态。

## 状态、持久化和迁移

Zustand store 只维护当前编辑器需要的 UI 状态（选中旅行/Day、详情面板、草稿、拖放状态）；旅行数据仍序列化到 `localStorage`。

启动时识别旧 `editablePlan.days[].cards[]` 数据：每张旧攻略卡迁移为一个活动母卡和一条对应的活动排期实例。旧卡中的 `plannedTime` 转换为最近的 `startSlot`；没有时间则放入默认早晨区域 `slot 14`（07:00）。迁移产生的活动实例默认 `durationSlots: 1`、`isTimeLocked: false`，并使用 `TimelineEngine` 规范化同一 Day 的重叠时间。旧记录模式数据保持原样，不要求迁移到新路线模型。

如果迁移或持久化解析失败，保留原始数据键并显示可恢复错误提示，不覆盖用户已保存的 JSON。

## 组件边界

```text
App
├── TravelLibrary              # 保持现有入口
├── RoadbookWorkspace
│   ├── TripHeader
│   ├── DayNavigator
│   ├── MaterialLibrary
│   ├── DayTimeline
│   │   ├── TimeGrid
│   │   ├── TimelineEngine
│   │   ├── ScheduledActivityCard
│   │   └── RouteCard
│   ├── MapPreview
│   ├── BudgetPanel
│   ├── StayCard
│   └── NodeDetailDrawer
│       ├── ActivityForm
│       ├── ScheduleForm
│       ├── RouteForm
│       └── StayForm
└── RecordWorkspace            # 保持现有功能
```

`TimelineEngine` 是独立的纯逻辑层，不是 React 组件。它负责槽位换算、拖放吸附、冲突检测、按 `startSlot` 排期、跨 Day 移动与时长更新；组件只负责展示和触发事件。预算计算、迁移与持久化也放在独立的纯函数中，便于覆盖测试。

## 错误处理

- 空名称：阻止保存并在字段旁显示具体错误。
- 无效日期或结束早于开始：阻止创建/保存旅行日期。
- 无效时间/时长：限制到 `0–47` 槽和最小一个时段。
- 找不到被引用的活动：将实例显示为“已删除活动”，允许用户删除实例，不使整个 Day 崩溃。
- 无效交通：显示待处理状态；不自动创建虚假的路线。
- 保存失败：保留内存中的草稿，显示可重试提示，不声称已写入本地。

## 验收与测试

### 单元测试

- 30 分钟时间与槽位之间的转换、吸附和边界处理。
- 默认时长为一槽；插入冲突时按插入点级联后移，不能自动移动已锁定实例，超过第 48 槽时不写入排期。
- 添加、移动、调整和删除活动实例不会错误改变活动母卡。
- 修改母卡在多个实例中显示为一致内容；实例覆盖字段保持独立。
- 预算可正确计算重复安排、覆盖价格、交通和住宿，以及 `total`、`person`、`night` 三种计价方式。
- 删除或移动关联活动使交通卡正确变为无效。
- 多住宿 Day 可正确选择主要住宿并纳入预算。
- 旧攻略数据可迁移，记录模式数据不受影响。

### 组件/交互测试

- 素材库活动可在一个或多个 Day 重复拖入。
- 拖放跨 Day 后只改变目标实例，且时间轴始终由 `startSlot` 决定顺序。
- 点击素材库、活动实例、交通卡和住宿卡均能打开对应详情。
- 保存详情后时间轴、地图和预算同步更新；取消修改不会持久化。
- `MapPreview` 只显示有坐标节点；无坐标节点显示“未设置位置”，不发起导航或路线请求。
- 刷新后活动、实例、住宿、交通和编辑结果可恢复。
- 现有旅行库和旅行记录入口仍可访问。

### 手动验证

- 桌面宽度下三栏无重叠，侧栏打开后时间轴仍可辨识。
- 移动宽度下 Day、时间轴和全屏详情可正常操作。
- 键盘可操作主要按钮和拖放替代路径，焦点始终可见。

## 实施顺序

1. 初始化 React/TypeScript/Vite，并保持现有页面入口可用。
2. 建立新数据模型、迁移器、持久化适配层和纯函数测试。
3. 实现旅行工作台外壳、Day 管理、素材库和详情编辑。
4. 实现时间轴、拖放、时长调整和交通失效规则。
5. 实现住宿、地图示意、预算和响应式布局。
6. 回归验证旅行记录模式与旧本地数据迁移。
