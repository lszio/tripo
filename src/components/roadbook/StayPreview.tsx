import type { StayNode, StaySchedule } from "../../domain/roadbook";
import { timeFromSlot } from "../../domain/timeline-engine";
import { OpenStreetMapLink } from "./OpenStreetMapLink";

export function StayPreview({ stay, schedule, onEdit, onClose }: { stay: StayNode; schedule: StaySchedule; onEdit: () => void; onClose: () => void }) {
  const price = stay.price ? `${stay.price.currency} ${stay.price.amount}${stay.price.unit === "night" ? " / 晚" : ""}` : "未设置预算";
  return (
    <section aria-label="住宿预览" className="activity-preview stay-preview">
      <div className="activity-preview-hero">
        <header><p className="eyebrow">入住安排</p><button aria-label="关闭预览" onClick={onClose} type="button">×</button></header>
        <div className="activity-preview-title"><h2>{stay.name}</h2><p>{stay.location?.name ?? "未设置位置"}</p></div>
      </div>
      <div className="activity-preview-body">
        <dl><div><dt>本次入住</dt><dd>{timeFromSlot(schedule.startSlot)} · {schedule.durationSlots * 30} 分钟</dd></div><div><dt>住宿预算</dt><dd>{price}</dd></div></dl>
        {stay.note && <div className="preview-note"><strong>备注</strong><p>{stay.note}</p></div>}
        <OpenStreetMapLink location={stay.location} />
        <footer><button onClick={onEdit} type="button">编辑住宿</button></footer>
      </div>
    </section>
  );
}
