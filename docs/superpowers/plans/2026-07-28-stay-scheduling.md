# 住宿排期 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持主住宿拖入时间轴，并在切换主住宿时替换当天已有的入住排期。

**Architecture:** 增加独立的 `StaySchedule` 联合类型，复用时间轴引擎处理其时间位置和碰撞。状态仓库负责主住宿的唯一性与替换语义，组件只处理展示和拖拽事件。

**Tech Stack:** React、TypeScript、Zustand、dnd-kit、Vitest。

## Global Constraints

- 保留现有 `Day.stays` 数据与 localStorage 兼容性。
- 默认持续时间为 1 个 slot（30 分钟）。
- 仅主住宿可创建入住排期。

---

### Task 1: 住宿排期数据和时间逻辑

**Files:**
- Modify: `src/domain/roadbook.ts`
- Modify: `src/domain/timeline-engine.ts`
- Modify: `src/components/roadbook/timeline-actions.ts`
- Test: `tests/components/day-timeline.test.tsx`

- [ ] 写一个失败测试，断言主住宿可在指定 slot 创建 30 分钟的排期，非主住宿被拒绝。
- [ ] 运行该测试，确认失败原因是没有住宿排期逻辑。
- [ ] 新增 `StaySchedule` 并让创建、移动和缩放经过现有冲突规则。
- [ ] 运行测试，确认通过。

### Task 2: 主住宿切换和仓库操作

**Files:**
- Modify: `src/store/roadbook-store.ts`
- Test: `tests/domain/roadbook-store.test.ts`

- [ ] 写一个失败测试，断言切换主住宿会替换旧主住宿排期但保留时间与时长。
- [ ] 运行该测试，确认失败原因是没有主住宿切换操作。
- [ ] 实现唯一主住宿、排期替换和删除清理。
- [ ] 运行测试，确认通过。

### Task 3: 住宿卡与时间轴交互

**Files:**
- Modify: `src/components/roadbook/StayCard.tsx`
- Modify: `src/components/roadbook/DayTimeline.tsx`
- Create: `src/components/roadbook/ScheduledStayCard.tsx`
- Modify: `src/components/roadbook/RoadbookWorkspace.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/components/stay-card.test.tsx`

- [ ] 写失败测试，断言主住宿提供拖拽数据、候选可设为当前住宿。
- [ ] 运行测试，确认失败原因是缺少控件和拖拽数据。
- [ ] 实现住宿候选列表、主住宿选择、时间轴入住卡与拖拽分发。
- [ ] 运行测试，确认通过。

### Task 4: 回归验证

**Files:**
- Test: `tests/components/day-timeline.test.tsx`
- Test: `tests/domain/roadbook-store.test.ts`

- [ ] 运行完整测试套件和生产构建。
- [ ] 手动验证拖入主住宿、切换主住宿替换原排期、删除入住排期不删除住宿卡。
