import type { RouteSchedule, Transport } from "../../domain/roadbook";
import { timeFromSlot } from "../../domain/timeline-engine";

const transportLabel: Record<Transport, string> = { walk: "步行", train: "火车", car: "驾车", flight: "航班", other: "其他" };

export function RoutePreview({ route, onEdit, onClose }: { route: RouteSchedule; onEdit: () => void; onClose: () => void }) {
  const startSlot = route.startSlot ?? 16;
  const durationSlots = route.durationSlots ?? 1;
  const price = route.price ? `${route.price.currency} ${route.price.amount}` : "未设置预算";
  return (
    <section aria-label="交通预览" className="activity-preview route-preview">
      <div className="activity-preview-hero">
        <header><p className="eyebrow">交通安排</p><button aria-label="关闭预览" onClick={onClose} type="button">×</button></header>
        <div className="activity-preview-title"><h2>{transportLabel[route.transport ?? "other"]}交通</h2><p>{route.status === "invalid" ? "待处理路线" : "已安排路线"}</p></div>
      </div>
      <div className="activity-preview-body">
        <dl><div><dt>出发时间</dt><dd>{timeFromSlot(startSlot)}</dd></div><div><dt>持续时间</dt><dd>{durationSlots * 30} 分钟</dd></div><div><dt>交通预算</dt><dd>{price}</dd></div></dl>
        <footer><button onClick={onEdit} type="button">编辑交通</button></footer>
      </div>
    </section>
  );
}
