import { addEntry, comparisonSummary, getPlanItem, getTravel, loadState, saveState, startRecording } from "./state.js";

export const navigationItems = [
  { id: "overview", label: "概览" },
  { id: "plan", label: "攻略" },
  { id: "journal", label: "实录" },
  { id: "map", label: "地图" },
  { id: "review", label: "复盘" }
];

const archiveNavigationItems = [
  { id: "travels", label: "我的旅行" },
  { id: "records", label: "旅行记录" }
];
const statusLabels = { planned: "计划中", active: "旅行中", archived: "已归档" };
const planThemes = {
  editorial: "编辑特写",
  routebook: "路线手册",
  archive: "档案手稿"
};
let currentArchive;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  })[character]);
}

function normalizeArchive(archive) {
  const nextArchive = archive?.travels ? archive : loadState();
  nextArchive.travels ??= [];
  if (!nextArchive.travels.some(travel => travel.id === nextArchive.selectedTravelId)) {
    nextArchive.selectedTravelId = nextArchive.travels[0]?.id;
  }
  nextArchive.activeRoute = ["travels", "records", "workspace"].includes(nextArchive.activeRoute)
    ? nextArchive.activeRoute
    : "travels";
  nextArchive.workspaceMode = nextArchive.workspaceMode === "records" ? "records" : "plan";
  return nextArchive;
}

export function readTravelDeepLink(hash = "") {
  const params = new URLSearchParams(String(hash).replace(/^#/, ""));
  const travelId = params.get("travel")?.trim();
  if (!travelId) return undefined;
  return {
    travelId,
    workspaceMode: params.get("mode") === "record" ? "records" : "plan"
  };
}

export function initializeArchiveFromUrl(archive, hash = typeof location === "undefined" ? "" : location.hash) {
  const nextArchive = normalizeArchive(archive);
  const deepLink = readTravelDeepLink(hash);
  if (!deepLink || !getTravel(nextArchive, deepLink.travelId)) return nextArchive;
  nextArchive.selectedTravelId = deepLink.travelId;
  nextArchive.workspaceMode = deepLink.workspaceMode;
  nextArchive.activeRoute = "workspace";
  return nextArchive;
}

function updateTravelHistory(archive) {
  if (typeof history === "undefined" || !archive.selectedTravelId) return;
  const mode = archive.workspaceMode === "records" ? "record" : "plan";
  history.pushState(null, "", `#travel=${encodeURIComponent(archive.selectedTravelId)}&mode=${mode}`);
}

function planMetrics(travel) {
  const days = travel.editablePlan?.days ?? [];
  const cardCount = days.reduce((total, day) => total + (day.cards?.length ?? 0), 0);
  return { days: days.length, cardCount };
}

function travelMeta(travel) {
  const { days, cardCount } = planMetrics(travel);
  return `${days} 天 · ${cardCount} 项攻略`;
}

function renderTravelCard(travel, { recordsOnly = false } = {}) {
  const recordCount = travel.records?.length ?? 0;
  const actionLabel = recordsOnly ? "查看旅行记录" : "查看旅行";
  return `
    <article class="travel-card" data-theme="${escapeHtml(travel.theme ?? "archive")}">
      <div class="travel-cover" aria-hidden="true"><span>${escapeHtml(travel.destination ?? "旅行档案")}</span><i>${escapeHtml(travel.theme ?? "archive")}</i></div>
      <div class="travel-card-body">
        <div class="travel-card-heading"><p class="eyebrow">${escapeHtml(travel.demoLabel ?? "个人旅行")}</p><span class="travel-status status-${escapeHtml(travel.status ?? "planned")}">${escapeHtml(statusLabels[travel.status] ?? "计划中")}</span></div>
        <h2>${escapeHtml(travel.title)}</h2>
        <p class="travel-dates">${escapeHtml(travel.dates ?? "日期待定")}</p>
        <dl class="travel-facts"><div><dt>攻略进度</dt><dd>${escapeHtml(travelMeta(travel))}</dd></div><div><dt>旅行记录</dt><dd>${recordCount} 条</dd></div></dl>
        <button class="text-button" type="button" data-travel-id="${escapeHtml(travel.id)}" data-workspace-mode="${recordsOnly ? "records" : "plan"}">${actionLabel}<span aria-hidden="true">↗</span></button>
      </div>
    </article>
  `;
}

export function getRecordedTravels(archive) {
  return (archive.travels ?? []).filter(travel => (travel.records?.length ?? 0) > 0);
}

export function renderTravelLibrary(archive) {
  const travels = archive.travels ?? [];
  return `
    <section class="library" aria-labelledby="travels-title">
      <header class="library-heading"><div><p class="eyebrow">Personal archive</p><h1 id="travels-title">我的旅行</h1><p>每一段出发，都留给时间慢慢展开。</p></div><span>${travels.length} 段旅行</span></header>
      <div class="travel-grid">${travels.map(travel => renderTravelCard(travel)).join("") || "<p class=\"empty-state\">还没有旅行档案。</p>"}</div>
    </section>
  `;
}

export function renderRecordsLibrary(archive) {
  const travels = getRecordedTravels(archive);
  return `
    <section class="library" aria-labelledby="records-title">
      <header class="library-heading"><div><p class="eyebrow">Travel notes</p><h1 id="records-title">旅行记录</h1><p>只收录已经留下真实片段的旅行。</p></div><span>${travels.length} 段有记录旅行</span></header>
      <div class="travel-grid records-grid">${travels.map(travel => renderTravelCard(travel, { recordsOnly: true })).join("") || "<p class=\"empty-state\">还没有旅行记录，先从一段出发开始。</p>"}</div>
    </section>
  `;
}

function getTextBlock(card) {
  return card.blocks?.find(block => block.kind === "text");
}

function cardText(card) {
  return getTextBlock(card)?.value ?? "";
}

function createLocalId(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}

function findPlanCard(travel, cardId) {
  return (travel.editablePlan?.days ?? [])
    .flatMap(day => day.cards ?? [])
    .find(card => card.id === cardId);
}

export function movePlanCard(travel, cardId, plannedDayId) {
  const days = travel.editablePlan?.days ?? [];
  const sourceDay = days.find(day => (day.cards ?? []).some(card => card.id === cardId));
  const targetDay = days.find(day => day.id === plannedDayId);
  if (!sourceDay || !targetDay) return travel;

  const cardIndex = sourceDay.cards.findIndex(card => card.id === cardId);
  const [card] = sourceDay.cards.splice(cardIndex, 1);
  card.plannedDayId = targetDay.id;
  targetDay.cards.push(card);
  return travel;
}

export function moveRecordCard(travel, recordId, actualDayId) {
  const record = travel.records?.find(item => item.id === recordId);
  if (record) record.actualDayId = actualDayId;
  return travel;
}

export function setTravelTheme(travel, theme) {
  if (travel.status !== "planned" || !planThemes[theme]) return travel;
  travel.theme = theme;
  if (travel.editablePlan) travel.editablePlan.theme = theme;
  return travel;
}

function addPlanCard(travel, dayId) {
  const day = travel.editablePlan?.days?.find(item => item.id === dayId);
  if (!day) return travel;
  const cardId = createLocalId("plan-card");
  day.cards ??= [];
  day.cards.push({
    id: cardId,
    plannedDayId: day.id,
    plannedTime: "",
    blocks: [{ id: `${cardId}-text`, kind: "text", value: "" }]
  });
  return travel;
}

function updatePlanCard(travel, cardId, field, value) {
  const card = findPlanCard(travel, cardId);
  if (!card) return travel;
  if (field === "content") {
    card.blocks ??= [];
    const textBlock = getTextBlock(card);
    if (textBlock) textBlock.value = value;
    else card.blocks.push({ id: `${card.id}-text`, kind: "text", value });
  } else if (field === "time") {
    card.plannedTime = value;
  }
  return travel;
}

function updateRecord(travel, recordId, field, value) {
  const record = travel.records?.find(item => item.id === recordId);
  if (record && field !== "day") record[field] = value;
  return travel;
}

function renderPlanCard(card) {
  return `
    <article class="plan-card" draggable="true" data-plan-card-id="${escapeHtml(card.id)}">
      <div class="card-grip" aria-hidden="true">⠿</div>
      <label>计划时间<input type="time" value="${escapeHtml(card.plannedTime ?? "")}" data-plan-field="time" data-card-id="${escapeHtml(card.id)}" /></label>
      <label>自由记录<textarea rows="3" data-plan-field="content" data-card-id="${escapeHtml(card.id)}" placeholder="写下这一刻的安排、灵感或备忘">${escapeHtml(cardText(card))}</textarea></label>
    </article>
  `;
}

function renderPlanDay(day, index) {
  return `
    <section class="plan-day" data-plan-dropzone="${escapeHtml(day.id)}">
      <header><p>第 ${index + 1} 天 · ${escapeHtml(day.date)}</p><h3>${escapeHtml(day.title)}</h3><span>${(day.cards ?? []).length} 张卡片</span></header>
      <div class="plan-card-stack">${(day.cards ?? []).map(renderPlanCard).join("") || "<p class=\"drop-hint\">将卡片拖到这里，或新建一张。</p>"}</div>
      <button class="quiet-action" type="button" data-add-plan-card="${escapeHtml(day.id)}">＋ 添加自由卡片</button>
    </section>
  `;
}

export function renderPlanMode(travel) {
  const canChangeTheme = travel.status === "planned";
  const themeControls = canChangeTheme
    ? `<fieldset class="theme-picker"><legend>呈现主题</legend><div>${Object.entries(planThemes).map(([id, label]) => `<button class="theme-option ${travel.theme === id ? "is-selected" : ""}" type="button" data-theme-choice="${id}" aria-pressed="${travel.theme === id}">${label}</button>`).join("")}</div></fieldset>`
    : `<p class="frozen-note">旅程已开始，主题与攻略快照均已封存。</p>`;
  const startAction = canChangeTheme
    ? `<button class="record-start" type="button" data-start-recording>开始记录<span>冻结当前攻略</span></button>`
    : "";

  return `
    <div class="plan-mode" data-theme="${escapeHtml(travel.theme ?? "archive")}">
      <div class="plan-mode-heading"><div><p class="eyebrow">可编辑路书</p><h2>把旅程拆成可移动的片段</h2></div>${startAction}</div>
      <div class="plan-controls">${themeControls}<p>拖动卡片可调整日期；文字与时间会保存在当前攻略中。</p></div>
      <div class="plan-day-grid">${(travel.editablePlan?.days ?? []).map(renderPlanDay).join("")}</div>
    </div>
  `;
}

function renderSnapshotDay(day, index) {
  return `
    <section class="snapshot-day"><p>第 ${index + 1} 天 · ${escapeHtml(day.date)}</p><h3>${escapeHtml(day.title)}</h3>
      <ul>${(day.cards ?? []).map(card => `<li><time>${escapeHtml(card.plannedTime || "待定")}</time><span>${escapeHtml(cardText(card) || "未命名攻略")}</span></li>`).join("") || "<li>这一日没有计划卡片。</li>"}</ul>
    </section>
  `;
}

function renderRecordCard(record, days) {
  return `
    <article class="record-card record-card-editable" draggable="true" data-record-id="${escapeHtml(record.id)}">
      <div class="record-card-meta"><span class="card-grip" aria-hidden="true">⠿</span><small>${escapeHtml(record.status ?? "记录")}</small></div>
      <label>实际时间<input type="time" value="${escapeHtml(record.actualTime ?? "")}" data-record-field="actualTime" data-record-id="${escapeHtml(record.id)}" /></label>
      <label>实际日期<select data-record-field="day" data-record-id="${escapeHtml(record.id)}">${days.map(day => `<option value="${escapeHtml(day.id)}" ${record.actualDayId === day.id ? "selected" : ""}>${escapeHtml(day.date)} · ${escapeHtml(day.title)}</option>`).join("")}</select></label>
      <label>实录内容<textarea rows="3" data-record-field="content" data-record-id="${escapeHtml(record.id)}" placeholder="此刻真实发生了什么？">${escapeHtml(record.content ?? "")}</textarea></label>
    </article>
  `;
}

export function renderRecordMode(travel) {
  const snapshot = travel.recordingPlanSnapshot;
  if (!snapshot) {
    return `<section class="record-start-panel"><p class="eyebrow">记录模式</p><h2>先冻结，再出发。</h2><p>开始记录会复制当前攻略，之后的真实轨迹将独立保存。</p><button class="record-start" type="button" data-start-recording>开始记录<span>冻结当前攻略</span></button></section>`;
  }
  const days = snapshot.days ?? [];
  return `
    <div class="record-mode" data-theme="${escapeHtml(travel.theme ?? snapshot.theme ?? "archive")}">
      <header class="record-mode-heading"><div><p class="eyebrow">旅行实录</p><h2>计划留在左，真实发生在右。</h2></div><p>实录跨日移动不会改写已冻结的攻略。</p></header>
      <div class="record-columns">
        <section class="snapshot-column"><header><p class="eyebrow">冻结攻略</p><span>只读快照</span></header><div class="snapshot-day-grid">${days.map(renderSnapshotDay).join("")}</div></section>
        <section class="record-column"><header><p class="eyebrow">实际记录</p><span>可编辑 · 可跨日移动</span></header><div class="record-day-grid">${days.map((day, index) => `<section class="record-day" data-record-dropzone="${escapeHtml(day.id)}"><header><p>第 ${index + 1} 天 · ${escapeHtml(day.date)}</p><h3>${escapeHtml(day.title)}</h3></header><div class="record-stack">${(travel.records ?? []).filter(record => record.actualDayId === day.id).map(record => renderRecordCard(record, days)).join("") || "<p class=\"drop-hint\">把实录拖到这里。</p>"}</div></section>`).join("")}</div></section>
      </div>
    </div>
  `;
}

function renderTravelWorkspace(archive) {
  const travel = getTravel(archive, archive.selectedTravelId);
  if (!travel) return "<p class=\"empty-state\">未找到这段旅行。</p>";
  const isRecordMode = archive.workspaceMode === "records";
  return `
    <section class="travel-workspace" aria-labelledby="workspace-title">
      <button class="back-button" type="button" data-route="travels">← 返回我的旅行</button>
      <header class="workspace-heading" data-theme="${escapeHtml(travel.theme ?? "archive")}"><p class="eyebrow">${escapeHtml(travel.destination ?? "旅行档案")}</p><h1 id="workspace-title">${escapeHtml(travel.title)}</h1><p>${escapeHtml(travel.dates ?? "日期待定")} · ${escapeHtml(statusLabels[travel.status] ?? "计划中")}</p></header>
      <nav class="workspace-tabs" aria-label="旅行内容"><button class="${isRecordMode ? "" : "is-active"}" type="button" data-workspace-mode="plan">攻略</button><button class="${isRecordMode ? "is-active" : ""}" type="button" data-workspace-mode="records">旅行记录 <span>${travel.records?.length ?? 0}</span></button></nav>
      <div class="workspace-content ${isRecordMode ? "is-record-mode" : ""}">${isRecordMode ? renderRecordMode(travel) : renderPlanMode(travel)}</div>
    </section>
  `;
}

export function selectTravel(travelId, workspaceMode) {
  const archive = normalizeArchive(currentArchive);
  if (!getTravel(archive, travelId)) return archive;
  archive.selectedTravelId = travelId;
  if (workspaceMode) archive.workspaceMode = workspaceMode === "records" ? "records" : "plan";
  archive.activeRoute = "workspace";
  updateTravelHistory(archive);
  return archive;
}

function renderArchiveNavigation(archive) {
  return archiveNavigationItems.map(item => `
    <button class="archive-nav-item ${archive.activeRoute === item.id ? "is-active" : ""}" type="button" data-route="${item.id}" aria-current="${archive.activeRoute === item.id ? "page" : "false"}">${item.label}</button>
  `).join("");
}

export function renderApp(archive) {
  currentArchive = normalizeArchive(archive);
  const page = currentArchive.activeRoute === "records"
    ? renderRecordsLibrary(currentArchive)
    : currentArchive.activeRoute === "workspace"
      ? renderTravelWorkspace(currentArchive)
      : renderTravelLibrary(currentArchive);
  const markup = `<div class="archive-shell"><header class="archive-header"><a class="archive-brand" href="#app" data-route="travels" aria-label="Go Travel 我的旅行">GO <strong>Travel</strong></a><nav class="archive-navigation" aria-label="档案导航">${renderArchiveNavigation(currentArchive)}</nav><span class="archive-owner">林沐的档案</span></header><main class="archive-main">${page}</main></div>`;
  if (typeof document !== "undefined") {
    const app = document.querySelector("#app");
    if (app) app.innerHTML = markup;
  }
  return markup;
}

function persistAndRender() {
  saveState(currentArchive);
  renderApp(currentArchive);
}

export function bindEvents() {
  if (typeof document === "undefined") return;
  const app = document.querySelector("#app");
  if (!app || app.dataset.eventsBound === "true") return;
  app.dataset.eventsBound = "true";
  app.addEventListener("click", event => {
    const routeButton = event.target.closest("[data-route]");
    if (routeButton) {
      currentArchive.activeRoute = routeButton.dataset.route;
      persistAndRender();
      return;
    }
    const travelButton = event.target.closest("[data-travel-id]");
    if (travelButton) {
      selectTravel(travelButton.dataset.travelId, travelButton.dataset.workspaceMode);
      persistAndRender();
      return;
    }
    const modeButton = event.target.closest("[data-workspace-mode]");
    if (modeButton) {
      currentArchive.workspaceMode = modeButton.dataset.workspaceMode === "records" ? "records" : "plan";
      updateTravelHistory(currentArchive);
      persistAndRender();
      return;
    }
    const startButton = event.target.closest("[data-start-recording]");
    if (startButton) {
      const travel = getTravel(currentArchive, currentArchive.selectedTravelId);
      if (travel?.status === "planned") {
        startRecording(travel);
        currentArchive.workspaceMode = "records";
        updateTravelHistory(currentArchive);
        persistAndRender();
      }
      return;
    }
    const themeButton = event.target.closest("[data-theme-choice]");
    if (themeButton) {
      const travel = getTravel(currentArchive, currentArchive.selectedTravelId);
      if (travel) {
        setTravelTheme(travel, themeButton.dataset.themeChoice);
        persistAndRender();
      }
      return;
    }
    const addCardButton = event.target.closest("[data-add-plan-card]");
    if (addCardButton) {
      const travel = getTravel(currentArchive, currentArchive.selectedTravelId);
      if (travel) {
        addPlanCard(travel, addCardButton.dataset.addPlanCard);
        persistAndRender();
      }
    }
  });
  app.addEventListener("input", event => {
    const planField = event.target.closest("[data-plan-field]");
    const recordField = event.target.closest("[data-record-field]");
    const travel = getTravel(currentArchive, currentArchive.selectedTravelId);
    if (!travel) return;
    if (planField) updatePlanCard(travel, planField.dataset.cardId, planField.dataset.planField, planField.value);
    if (recordField && recordField.dataset.recordField !== "day") updateRecord(travel, recordField.dataset.recordId, recordField.dataset.recordField, recordField.value);
    if (planField || recordField) saveState(currentArchive);
  });
  app.addEventListener("change", event => {
    const recordDayField = event.target.closest("[data-record-field=\"day\"]");
    if (!recordDayField) return;
    const travel = getTravel(currentArchive, currentArchive.selectedTravelId);
    if (!travel) return;
    moveRecordCard(travel, recordDayField.dataset.recordId, recordDayField.value);
    persistAndRender();
  });
  app.addEventListener("dragstart", event => {
    const card = event.target.closest("[data-plan-card-id], [data-record-id]");
    if (!card || !event.dataTransfer) return;
    const kind = card.dataset.planCardId ? "plan" : "record";
    const id = card.dataset.planCardId ?? card.dataset.recordId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.setData("application/x-go-travel-card", kind);
  });
  app.addEventListener("dragover", event => {
    if (event.target.closest("[data-plan-dropzone], [data-record-dropzone]")) event.preventDefault();
  });
  app.addEventListener("drop", event => {
    const planDropzone = event.target.closest("[data-plan-dropzone]");
    const recordDropzone = event.target.closest("[data-record-dropzone]");
    if (!planDropzone && !recordDropzone) return;
    event.preventDefault();
    const travel = getTravel(currentArchive, currentArchive.selectedTravelId);
    const kind = event.dataTransfer?.getData("application/x-go-travel-card");
    const cardId = event.dataTransfer?.getData("text/plain");
    if (!travel || !cardId) return;
    if (kind === "plan" && planDropzone) movePlanCard(travel, cardId, planDropzone.dataset.planDropzone);
    if (kind === "record" && recordDropzone) moveRecordCard(travel, cardId, recordDropzone.dataset.recordDropzone);
    persistAndRender();
  });
}

export function applyEntry(formData, state) {
  if (!state?.trip) return state;
  const planItemId = String(formData.get("planItemId") ?? "") || undefined;
  const linkedPlan = planItemId ? getPlanItem(state, planItemId) : undefined;
  const note = String(formData.get("note") ?? "").trim();
  return addEntry(state, {
    dayId: String(formData.get("dayId") ?? state.selectedDayId),
    planItemId,
    title: String(formData.get("title") ?? "").trim(),
    note,
    description: note || "本地新增的虚构演示记录",
    status: String(formData.get("status") ?? "added"),
    place: linkedPlan?.place
  });
}

export function renderMap(state) {
  const entries = state?.trip?.entries ?? [];
  return `<section class="legacy-render"><h2>计划与实际路线</h2><p>实际路线：${entries.length} 条虚构演示记录。</p></section>`;
}

export function renderReview(state) {
  const summary = comparisonSummary(state);
  const entries = state.trip.entries.map(entry => `<li>${escapeHtml(entry.title)}</li>`).join("");
  return `<section class="legacy-render"><h2>旅程复盘</h2><p>已完成 ${summary.completed} 条</p><ul>${entries}</ul></section>`;
}

if (typeof document !== "undefined") {
  renderApp(initializeArchiveFromUrl(loadState()));
  bindEvents();
}
