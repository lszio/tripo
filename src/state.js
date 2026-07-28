export const STORAGE_KEY = "go-travel-state-v1";
export const RECORD_STATUSES = ["completed", "adjusted", "skipped", "added"];
export const VISIBILITY_VALUES = ["private", "members", "link", "public"];

const activity = (id, time, title, type, description, place) => ({
  id,
  time,
  title,
  type,
  description,
  status: "planned",
  place
});

const day = (id, date, city, activities) => ({ id, date, city, activities });

export function createSeedTrip() {
  const trip = {
    id: "trip-austria-hungary-demo",
    name: "奥匈九日漫游（演示行程）",
    duration: "9天8晚",
    route: "布达佩斯 → 布拉迪斯拉发 → 维也纳 → 哈尔施塔特 → 萨尔茨堡",
    syntheticNotice: "以下时间、地点与预算均为虚构演示数据，请勿用于实际出行。",
    members: [
      { id: "user-lin-mu", name: "林沐", role: "发起人" },
      { id: "member-chen-xi", name: "陈曦", role: "同行人" }
    ],
    privacy: { visibility: "members", shareLocation: false },
    days: [
      day("day-1", "2026-09-12", "布达佩斯", [
        activity("plan-1", "14:00", "抵达与入住", "交通", "虚构：前往多瑙河畔的演示酒店办理入住。", { name: "布达佩斯东站", x: 19.0837, y: 47.5004 }),
        activity("plan-2", "19:30", "多瑙河夜景散步", "观光", "虚构：从河岸眺望国会大厦夜景。", { name: "多瑙河岸", x: 19.0456, y: 47.4979 })
      ]),
      day("day-2", "2026-09-13", "布达佩斯", [
        activity("plan-3", "09:30", "城堡山步行", "观光", "虚构：漫步渔人堡与城堡山区域。", { name: "渔人堡", x: 19.0341, y: 47.5021 }),
        activity("plan-4", "15:00", "温泉体验", "休闲", "虚构：安排一段温泉休闲时间。", { name: "城市公园温泉", x: 19.0821, y: 47.5188 })
      ]),
      day("day-3", "2026-09-14", "布拉迪斯拉发", [
        activity("plan-5", "09:00", "前往布拉迪斯拉发", "交通", "虚构：乘坐跨城列车前往斯洛伐克首都。", { name: "布拉迪斯拉发火车站", x: 17.1067, y: 48.1586 }),
        activity("plan-6", "15:30", "老城与城堡", "观光", "虚构：游览老城街巷和城堡外观。", { name: "布拉迪斯拉发城堡", x: 17.1003, y: 48.1421 })
      ]),
      day("day-4", "2026-09-15", "维也纳", [
        activity("plan-7", "10:00", "前往维也纳", "交通", "虚构：搭乘短途列车抵达维也纳。", { name: "维也纳中央火车站", x: 16.3785, y: 48.1851 }),
        activity("plan-8", "16:00", "环城大道初探", "观光", "虚构：沿环城大道进行建筑外观巡游。", { name: "维也纳国家歌剧院", x: 16.3695, y: 48.2029 })
      ]),
      day("day-5", "2026-09-16", "维也纳", [
        activity("plan-9", "09:30", "美泉宫花园", "观光", "虚构：参观美泉宫花园与庭院。", { name: "美泉宫", x: 16.3122, y: 48.1845 }),
        activity("plan-10", "19:00", "古典音乐晚间", "演出", "虚构：预留一场小型古典音乐演出。", { name: "维也纳音乐协会", x: 16.3725, y: 48.2002 })
      ]),
      day("day-6", "2026-09-17", "哈尔施塔特", [
        activity("plan-11", "08:30", "前往哈尔施塔特", "交通", "虚构：火车与接驳船组合前往湖区。", { name: "哈尔施塔特码头", x: 13.6493, y: 47.5622 }),
        activity("plan-12", "15:00", "湖畔慢行", "休闲", "虚构：沿湖边步道拍摄演示行程照片。", { name: "哈尔施塔特湖畔", x: 13.6481, y: 47.5617 })
      ]),
      day("day-7", "2026-09-18", "萨尔茨堡", [
        activity("plan-13", "10:00", "前往萨尔茨堡", "交通", "虚构：离开湖区，抵达萨尔茨堡。", { name: "萨尔茨堡中央火车站", x: 13.045, y: 47.813 }),
        activity("plan-14", "16:00", "米拉贝尔花园", "观光", "虚构：在花园及周边散步。", { name: "米拉贝尔花园", x: 13.0436, y: 47.805 })
      ]),
      day("day-8", "2026-09-19", "萨尔茨堡", [
        activity("plan-15", "09:30", "老城与粮食胡同", "观光", "虚构：探索老城街区与特色店铺。", { name: "萨尔茨堡老城", x: 13.043, y: 47.798 }),
        activity("plan-16", "15:30", "要塞观景", "观光", "虚构：从要塞俯瞰城市与河谷。", { name: "霍恩萨尔茨堡要塞", x: 13.0475, y: 47.795 })
      ]),
      day("day-9", "2026-09-20", "萨尔茨堡", [
        activity("plan-17", "09:00", "咖啡与行李整理", "休闲", "虚构：在出发前整理行李、记录旅程。", { name: "萨尔茨堡旧市场", x: 13.0445, y: 47.8002 }),
        activity("plan-18", "13:00", "返程", "交通", "虚构：前往机场或车站结束演示行程。", { name: "萨尔茨堡中央火车站", x: 13.045, y: 47.813 })
      ])
    ],
    entries: [
      { id: "actual-1", dayId: "day-1", planItemId: "plan-2", time: "20:00", title: "提前抵达河岸", type: "实际记录", description: "虚构：比计划早到二十分钟。", status: "adjusted", place: { name: "多瑙河岸", x: 19.0456, y: 47.4979 }, note: "演示数据" },
      { id: "actual-2", dayId: "day-2", planItemId: "plan-4", time: "15:20", title: "完成温泉体验", type: "实际记录", description: "虚构：按计划完成温泉体验。", status: "completed", place: { name: "城市公园温泉", x: 19.0821, y: 47.5188 }, note: "演示数据" }
    ]
  };

  return { trip, selectedDayId: "day-1", selectedView: "itinerary" };
}

function clone(value) {
  return globalThis.structuredClone
    ? globalThis.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
}

function createPlan(id, theme, days) {
  return {
    id,
    theme,
    days: days.map(({ id: dayId, date, title, cards }) => ({
      id: dayId,
      date,
      title,
      cards: cards.map(({ id: cardId, plannedTime, content }) => ({
        id: cardId,
        plannedDayId: dayId,
        plannedTime,
        blocks: [{ id: `${cardId}-text`, kind: "text", value: content }]
      }))
    }))
  };
}

function createDemoTravel({ id, title, destination, theme, dates, days, records = [] }) {
  return {
    id,
    title: `${title}（演示旅行）`,
    destination,
    demoLabel: "虚构演示旅行",
    dates,
    theme,
    status: "planned",
    editablePlan: createPlan(`${id}-plan`, theme, days),
    records
  };
}

export function createArchive() {
  const austriaHungary = createDemoTravel({
    id: "travel-austria-hungary-demo",
    title: "奥匈九日漫游",
    destination: "奥地利 / 匈牙利",
    theme: "archive",
    dates: "2026-09-12 至 2026-09-20",
    days: [
      { id: "day-1", date: "2026-09-12", title: "布达佩斯", cards: [{ id: "plan-1", plannedTime: "14:00", content: "抵达与入住" }] },
      { id: "day-2", date: "2026-09-13", title: "布达佩斯", cards: [{ id: "plan-2", plannedTime: "09:30", content: "城堡山步行" }] }
    ],
    records: [{
      id: "record-1",
      actualDayId: "day-1",
      actualTime: "20:00",
      planCardId: "plan-1",
      status: "adjusted",
      content: "虚构：提前抵达河岸。",
      photoUrls: []
    }]
  });
  const japan = createDemoTravel({
    id: "travel-japan-demo",
    title: "日本城市漫游",
    destination: "日本",
    theme: "editorial",
    dates: "2026-11-03 至 2026-11-08",
    days: [
      { id: "japan-day-1", date: "2026-11-03", title: "东京", cards: [{ id: "japan-plan-1", plannedTime: "10:00", content: "代官山与中目黑散步" }] },
      { id: "japan-day-2", date: "2026-11-04", title: "京都", cards: [{ id: "japan-plan-2", plannedTime: "09:00", content: "清水寺晨间参观" }] }
    ]
  });
  const perth = createDemoTravel({
    id: "travel-perth-demo",
    title: "珀斯海岸自驾",
    destination: "澳大利亚珀斯",
    theme: "routebook",
    dates: "2027-01-15 至 2027-01-19",
    days: [
      { id: "perth-day-1", date: "2027-01-15", title: "珀斯", cards: [{ id: "perth-plan-1", plannedTime: "11:00", content: "天鹅河沿岸取车" }] },
      { id: "perth-day-2", date: "2027-01-16", title: "弗里曼特尔", cards: [{ id: "perth-plan-2", plannedTime: "09:30", content: "港口与海岸公路" }] }
    ]
  });

  return {
    travels: [austriaHungary, japan, perth],
    selectedTravelId: austriaHungary.id
  };
}

export function getTravel(archive, travelId) {
  return archive.travels.find(travel => travel.id === travelId);
}

export function startRecording(travel) {
  travel.recordingPlanSnapshot = clone(travel.editablePlan);
  travel.status = "active";
  return travel;
}

export function createPlanCopy(travel) {
  return {
    ...clone(travel.editablePlan),
    id: createId(),
    copiedFromId: travel.editablePlan.id
  };
}

function migrateTripState(state) {
  const travelId = state.trip.id;
  const editablePlan = {
    id: `${travelId}-plan`,
    theme: "archive",
    days: state.trip.days.map(({ id, date, city, activities = [] }) => ({
      id,
      date,
      title: city,
      cards: activities.map(activity => ({
        id: activity.id,
        plannedDayId: id,
        plannedTime: activity.time,
        blocks: [{ id: `${activity.id}-text`, kind: "text", value: activity.description || activity.title }]
      }))
    }))
  };
  const travel = {
    id: travelId,
    title: `${state.trip.name}（演示旅行）`,
    destination: state.trip.route,
    demoLabel: state.trip.syntheticNotice,
    theme: "archive",
    status: "planned",
    privacy: clone(state.trip.privacy ?? { visibility: "private", shareLocation: false }),
    editablePlan,
    records: (state.trip.entries ?? []).map(entry => ({
      id: entry.id,
      actualDayId: entry.dayId,
      actualTime: entry.time,
      planCardId: entry.planItemId,
      status: entry.status,
      content: entry.description || entry.title,
      photoUrls: [],
      actualPlace: entry.place
    }))
  };
  return { travels: [travel], selectedTravelId: travel.id };
}

function getStorage(storage) {
  return storage ?? globalThis.localStorage;
}

export function loadState(storage) {
  const saved = getStorage(storage)?.getItem(STORAGE_KEY);
  if (!saved) return createArchive();

  try {
    const state = JSON.parse(saved);
    return Array.isArray(state.travels) ? state : migrateTripState(state);
  } catch {
    return createArchive();
  }
}

export function saveState(state, storage) {
  getStorage(storage)?.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function getPlanItem(state, planItemId) {
  return state.trip.days
    .flatMap(day => day.activities ?? [])
    .find(activity => activity.id === planItemId);
}

export function addEntry(state, entry) {
  const status = RECORD_STATUSES.includes(entry.status) ? entry.status : "added";
  const linkedPlan = entry.planItemId ? getPlanItem(state, entry.planItemId) : undefined;
  const actualEntry = {
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    time: "",
    type: "实际记录",
    description: "",
    place: linkedPlan?.place ?? { name: "", x: 0, y: 0 },
    note: "",
    ...entry,
    status
  };
  state.trip.entries.push(actualEntry);
  if (linkedPlan) linkedPlan.status = status;
  return actualEntry;
}

export function setVisibility(state, visibility) {
  if (VISIBILITY_VALUES.includes(visibility)) {
    state.trip.privacy ??= {};
    state.trip.privacy.visibility = visibility;
  }
  return state;
}

export function comparisonSummary(state) {
  return state.trip.entries.reduce(
    (summary, entry) => ({ ...summary, [entry.status]: (summary[entry.status] ?? 0) + 1 }),
    { completed: 0, adjusted: 0, skipped: 0, added: 0 }
  );
}
