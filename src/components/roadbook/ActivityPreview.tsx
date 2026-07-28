import type { Activity } from "../../domain/roadbook";
import { OpenStreetMapLink } from "./OpenStreetMapLink";

export function ActivityPreview({ activity, onEdit, onClose }: { activity: Activity; onEdit: () => void; onClose: () => void }) {
  const price = activity.defaultPrice ? `${activity.defaultPrice.currency} ${activity.defaultPrice.amount}` : "未设置预算";
  return (
    <section aria-label="活动预览" className="activity-preview">
      <div className="activity-preview-hero" style={activity.image ? { backgroundImage: `linear-gradient(180deg, rgba(30, 20, 22, .2), rgba(30, 20, 22, .92)), url("${activity.image}")` } : undefined}>
        <header><p className="eyebrow">活动详情</p><button aria-label="关闭预览" onClick={onClose} type="button">×</button></header>
        <div className="activity-preview-title"><h2>{activity.name}</h2><p>{activity.location?.name ?? "未设置位置"}</p></div>
      </div>
      <div className="activity-preview-body">
        <dl><div><dt>默认预算</dt><dd>{price}</dd></div><div><dt>分类标签</dt><dd>{activity.tags?.join(" · ") || "未分类"}</dd></div></dl>
        {activity.note && <div className="preview-note"><strong>备注</strong><p>{activity.note}</p></div>}
        <OpenStreetMapLink location={activity.location} />
        {activity.url && <a href={activity.url} rel="noreferrer" target="_blank">打开外部链接</a>}
        <footer><button onClick={onEdit} type="button">编辑活动</button></footer>
      </div>
    </section>
  );
}
