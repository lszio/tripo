export type PriceUnit = "total" | "person" | "night";

export type Price = {
  amount: number;
  currency: string;
  unit: PriceUnit;
};

export type Location = {
  name: string;
  latitude?: number;
  longitude?: number;
};

export type Activity = {
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

export type ActivitySchedule = {
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

export type StaySchedule = {
  id: string;
  type: "stay";
  stayId: string;
  dayId: string;
  startSlot: number;
  durationSlots: number;
  isTimeLocked: boolean;
};

export type Transport = "walk" | "train" | "car" | "flight" | "other";

export type RouteSchedule = {
  id: string;
  type: "route";
  dayId: string;
  startSlot?: number;
  fromScheduleId?: string;
  toScheduleId?: string;
  transport?: Transport;
  durationSlots?: number;
  price?: Price;
  routeType: "manual" | "generated";
  status: "valid" | "invalid";
};

export type StayNode = {
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

export type Day = {
  id: string;
  date: string;
  order: number;
  stays?: StayNode[];
  isActive?: boolean;
};

export type TimelineSchedule = ActivitySchedule | StaySchedule;

export type ScheduledNode = TimelineSchedule | RouteSchedule;

export type Trip = {
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

export type ActivityPriceOverride = Pick<ActivitySchedule, "id" | "priceOverride">;

export type BudgetCategory = "activity" | "route" | "stay";

export type LegacyContentBlock = {
  id: string;
  kind: string;
  value: unknown;
};

export type LegacyPlanCard = {
  id: string;
  plannedDayId?: string;
  plannedTime?: string;
  blocks?: LegacyContentBlock[];
};

export type LegacyPlanDay = {
  id: string;
  date: string;
  title?: string;
  cards?: LegacyPlanCard[];
};

export type LegacyPlan = {
  id?: string;
  theme?: string;
  days?: LegacyPlanDay[];
};

export type TravelRecord = {
  id: string;
  actualDayId: string;
  actualTime?: string;
  planCardId?: string;
  status?: string;
  content?: string;
  photoUrls?: string[];
};

export type ArchiveTravel = {
  id: string;
  title: string;
  destination?: string;
  dates?: string;
  status: "planned" | "active" | "archived";
  records: TravelRecord[];
  roadbook: Trip;
  editablePlan?: LegacyPlan;
  recordingPlanSnapshot?: LegacyPlan;
};

export type Archive = {
  schemaVersion: 2;
  travels: ArchiveTravel[];
  selectedTravelId?: string;
};
