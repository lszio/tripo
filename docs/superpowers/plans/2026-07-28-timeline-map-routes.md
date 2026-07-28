# 时间轴地图路线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让地图只展示时间轴节点，并在地图工作区提供按日着色的全行程路线。

**Architecture:** 用纯函数从 `Trip.schedule` 派生单日与多日地图节点和连接段。Leaflet 组件接收派生结果绘制标记与彩虹折线，住宿卡样式只调整控件定位。

**Tech Stack:** React、TypeScript、Leaflet、Vitest。

### Task 1: 地图路线数据派生

**Files:**
- Create: `src/domain/map-routes.ts`
- Test: `tests/domain/map-routes.test.ts`

- [ ] 写失败测试，断言候选住宿不会成为地图节点，入住排期会成为节点。
- [ ] 实现按日期和 slot 排序的节点、按出发日着色的路线段。
- [ ] 运行测试确认通过。

### Task 2: 地图预览和工作区模式

**Files:**
- Modify: `src/components/roadbook/MapPreview.tsx`
- Modify: `src/components/roadbook/MapWorkspace.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/components/map-preview.test.tsx`

- [ ] 写失败测试，断言单日地图不显示未排期住宿，总览可显示每日路线模式。
- [ ] 绘制单日和总览节点、彩虹连线及图例。
- [ ] 运行测试确认通过。

### Task 3: 住宿卡控件布局

**Files:**
- Modify: `src/styles/app.css`
- Test: `tests/components/stay-card.test.tsx`

- [ ] 写失败测试，断言删除住宿仍触发确认回调。
- [ ] 将删除控件定位右上角、拖拽控件定位右侧中部。
- [ ] 运行完整测试与生产构建。
