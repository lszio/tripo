import type { Price, Trip } from "./roadbook";

export type BudgetSummary = {
  activity: number;
  route: number;
  stay: number;
  total: number;
  currency: string;
};

const CNY_PER_UNIT: Record<string, number> = {
  CNY: 1,
  EUR: 7.8,
  USD: 7.2,
  GBP: 9.2,
  JPY: 0.046,
  CHF: 8.1
};

export const SUPPORTED_BUDGET_CURRENCIES = Object.keys(CNY_PER_UNIT);

function nightCount(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return 1;
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000));
}

export function normalizePrice(price: Price | undefined, people: number, nights: number) {
  if (!price || !Number.isFinite(price.amount)) return 0;
  if (price.unit === "person") return price.amount * people;
  if (price.unit === "night") return price.amount * nights;
  return price.amount;
}

export function convertCurrency(amount: number, fromCurrency: string, targetCurrency: string) {
  const fromRate = CNY_PER_UNIT[fromCurrency.trim().toUpperCase()];
  const targetRate = CNY_PER_UNIT[targetCurrency.trim().toUpperCase()];
  if (!Number.isFinite(amount) || !fromRate || !targetRate) return 0;
  return amount * fromRate / targetRate;
}

function normalizedPriceInCurrency(price: Price | undefined, people: number, nights: number, targetCurrency: string) {
  if (!price) return 0;
  return convertCurrency(normalizePrice(price, people, nights), price.currency, targetCurrency);
}

function emptySummary(currency: string): BudgetSummary {
  return { activity: 0, route: 0, stay: 0, total: 0, currency };
}

export function calculateDayBudget(trip: Trip, dayId: string, targetCurrency = trip.currency): BudgetSummary {
  const summary = emptySummary(targetCurrency);
  const activities = new Map(trip.activities.map(activity => [activity.id, activity]));

  for (const node of trip.schedule) {
    if (node.dayId !== dayId) continue;
    if (node.type === "activity") {
      const activity = activities.get(node.activityId);
      summary.activity += normalizedPriceInCurrency(node.priceOverride ?? activity?.defaultPrice, trip.people, 1, targetCurrency);
    } else if (node.type === "route") {
      summary.route += normalizedPriceInCurrency(node.price, trip.people, 1, targetCurrency);
    }
  }

  const day = trip.days.find(item => item.id === dayId);
  for (const stay of day?.stays ?? []) {
    summary.stay += normalizedPriceInCurrency(stay.price, trip.people, nightCount(stay.checkIn, stay.checkOut), targetCurrency);
  }

  summary.total = summary.activity + summary.route + summary.stay;
  return summary;
}

export function calculateTripBudget(trip: Trip, targetCurrency = trip.currency): BudgetSummary {
  return trip.days.reduce<BudgetSummary>((total, day) => {
    const daySummary = calculateDayBudget(trip, day.id, targetCurrency);
    return {
      activity: total.activity + daySummary.activity,
      route: total.route + daySummary.route,
      stay: total.stay + daySummary.stay,
      total: total.total + daySummary.total,
      currency: targetCurrency
    };
  }, emptySummary(targetCurrency));
}
