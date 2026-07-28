import type { ArchiveTravel } from "../../domain/roadbook";

export function moveRecordToDay(travel: ArchiveTravel, recordId: string, dayId: string): ArchiveTravel {
  return {
    ...travel,
    records: travel.records.map(record => record.id === recordId ? { ...record, actualDayId: dayId } : record)
  };
}
