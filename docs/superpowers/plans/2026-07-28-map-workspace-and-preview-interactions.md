# 地图工作区与预览交互 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 添加独立地图工作区，并修复地图层级、地点文本、图片封面和活动预览关闭交互。

**Architecture:** 让 `RoadbookWorkspace` 保存当前界面视图，编辑器继续使用 `MapPreview`，地图工作区复用同一套 Leaflet 画布并以页面布局呈现。地点选择器根据是否已有选择在摘要和搜索状态间切换；预览关闭事件限制在工作区空白区。

**Tech Stack:** React 19、TypeScript、Leaflet、Vitest、Testing Library、OpenStreetMap。

## Global Constraints

- 地图工作区为应用内页面，不是浮窗。
- 地图和 OSM 署名必须保留。
- 所有编辑抽屉与确认框层级高于 Leaflet。
- 不新增活动或住宿数据字段。
- 现有编辑器的 Day 与预览状态在地图页往返后保持。

---

### Task 1: 可复用地图画布与独立工作区

**Files:**
- Modify: `src/components/roadbook/MapPreview.tsx`
- Create: `src/components/roadbook/MapWorkspace.tsx`
- Modify: `src/components/roadbook/RoadbookWorkspace.tsx`
- Test: `tests/components/map-preview.test.tsx`
- Test: `tests/components/roadbook-workspace.test.tsx`

- [ ] 写入失败测试，验证预览提供“进入地图工作区”、工作区提供“返回路书编辑器”。
- [ ] 运行相关测试，确认缺少新页面时失败。
- [ ] 将 Leaflet 画布提取为可配置尺寸、滚轮缩放与瓦片错误回退的内部组件；新增包含 Day 导航、节点列表与返回按钮的 `MapWorkspace`。
- [ ] 在 `RoadbookWorkspace` 中以 `editor | map` 视图状态切换页面，同时保留 store、selectedDayId、previewActivityId。
- [ ] 运行地图与工作区测试。

### Task 2: 地图层级与视觉稳定性

**Files:**
- Modify: `src/styles/app.css`
- Test: `tests/components/map-preview.test.tsx`

- [ ] 写入失败测试，验证地图预览入口可访问且地图画布存在。
- [ ] 添加 Leaflet pane 层级限制、抽屉/确认框/通知优先层级、预览地图放大高度和地图页布局样式。
- [ ] 为 OSM 图层配置 `referrerPolicy: "strict-origin-when-cross-origin"`、`errorTileUrl` 和 tile error 处理。
- [ ] 运行组件测试。

### Task 3: 紧凑地点摘要、封面与空白处关闭预览

**Files:**
- Modify: `src/components/roadbook/LocationPicker.tsx`
- Modify: `src/components/roadbook/RoadbookWorkspace.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/components/location-picker.test.tsx`
- Test: `tests/components/roadbook-workspace.test.tsx`

- [ ] 写入失败测试，验证已选地点提供“更换地点”，点击空白时间轴后活动预览消失。
- [ ] 运行相关测试，确认新断言失败。
- [ ] 已选地点时显示两行截断摘要和更换按钮；更换后才显示查询控件。活动详情图片预览改为固定比例 `object-fit: cover`。
- [ ] 只在不属于卡片、按钮、链接、表单、抽屉和预览的工作区点击中清除活动预览。
- [ ] 运行相关测试。

### Task 4: 完整验证

**Files:**
- Modify: `README.md`（只在需要说明地图网络依赖时）

- [ ] 运行 `pnpm test`。
- [ ] 运行 `pnpm run build`。
- [ ] 在本地页面确认预览地图更高、可进入和返回地图工作区、地点名不会撑宽抽屉、空白点击关闭预览。
