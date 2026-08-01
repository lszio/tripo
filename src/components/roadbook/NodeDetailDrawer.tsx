import { useState } from "react";
import type { Activity, Location, Price } from "../../domain/roadbook";
import { OpenStreetMapLink } from "./OpenStreetMapLink";
import { LocationPicker } from "./LocationPicker";
import { ModalLayer } from "./ModalLayer";
import { ImageCropEditor, normalizedImageCrop } from "./ImageCropEditor";

type NodeDetailDrawerProps = {
  activity: Activity;
  onSave: (activity: Activity) => void;
  onClose: () => void;
};

type ActivityDraft = {
  name: string;
  location?: Location;
  image: string;
  imageCrop: NonNullable<Activity["imageCrop"]>;
  priceAmount: string;
  priceCurrency: string;
  priceUnit: Price["unit"];
  tags: string;
  note: string;
  url: string;
};

function toDraft(activity: Activity): ActivityDraft {
  return {
    name: activity.name,
    location: activity.location,
    image: activity.image ?? "",
    imageCrop: normalizedImageCrop(activity.imageCrop),
    priceAmount: activity.defaultPrice?.amount.toString() ?? "",
    priceCurrency: activity.defaultPrice?.currency ?? "CNY",
    priceUnit: activity.defaultPrice?.unit ?? "total",
    tags: activity.tags?.join(", ") ?? "",
    note: activity.note ?? "",
    url: activity.url ?? ""
  };
}

function optionalNumber(value: string) {
  const number = Number(value);
  return value.trim() && Number.isFinite(number) ? number : undefined;
}

function buildActivity(activity: Activity, draft: ActivityDraft): Activity {
  const priceAmount = optionalNumber(draft.priceAmount);
  const defaultPrice = priceAmount !== undefined ? { amount: priceAmount, currency: draft.priceCurrency.trim() || "CNY", unit: draft.priceUnit } : undefined;

  return {
    ...activity,
    name: draft.name.trim(),
    location: draft.location,
    image: draft.image.trim() || undefined,
    imageCrop: draft.image.trim() ? normalizedImageCrop(draft.imageCrop) : undefined,
    defaultPrice,
    tags: draft.tags.split(",").map(tag => tag.trim()).filter(Boolean),
    note: draft.note.trim() || undefined,
    url: draft.url.trim() || undefined
  };
}

export function NodeDetailDrawer({ activity, onSave, onClose }: NodeDetailDrawerProps) {
  const [draft, setDraft] = useState<ActivityDraft>(() => toDraft(activity));
  const update = (key: keyof ActivityDraft, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const uploadImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft(current => ({ ...current, image: typeof reader.result === "string" ? reader.result : "", imageCrop: normalizedImageCrop() }));
    reader.readAsDataURL(file);
  };

  return (
    <ModalLayer variant="drawer"><aside aria-label="活动详情" className="detail-drawer" role="dialog">
      <header><h2>活动详情</h2><button aria-label="关闭详情" onClick={onClose} type="button">×</button></header>
      <label>活动名称<input aria-label="活动名称" onChange={event => update("name", event.target.value)} value={draft.name} /></label>
      <LocationPicker label="地点" onChange={location => setDraft(current => ({ ...current, location }))} value={draft.location} />
      <OpenStreetMapLink label="在 OpenStreetMap 中查看" location={draft.location} />
      <label>图片链接<input aria-label="图片链接" onChange={event => setDraft(current => ({ ...current, image: event.target.value, imageCrop: normalizedImageCrop() }))} type="url" value={draft.image} /></label>
      <label>上传图片<input accept="image/*" aria-label="上传图片" onChange={event => uploadImage(event.target.files?.[0])} type="file" /></label>
      {draft.image && <ImageCropEditor image={draft.image} onChange={imageCrop => setDraft(current => ({ ...current, imageCrop }))} value={draft.imageCrop} />}
      <div className="drawer-field-row">
        <label>价格<input aria-label="价格" inputMode="decimal" onChange={event => update("priceAmount", event.target.value)} value={draft.priceAmount} /></label>
        <label>价格币种<input aria-label="价格币种" onChange={event => update("priceCurrency", event.target.value)} value={draft.priceCurrency} /></label>
      </div>
      <label>计价方式<select aria-label="计价方式" onChange={event => update("priceUnit", event.target.value)} value={draft.priceUnit}><option value="total">总价</option><option value="person">每人</option><option value="night">每晚</option></select></label>
      <label>标签<input aria-label="标签" onChange={event => update("tags", event.target.value)} placeholder="用逗号分隔" value={draft.tags} /></label>
      <label>备注<textarea aria-label="备注" onChange={event => update("note", event.target.value)} value={draft.note} /></label>
      <label>外部链接<input aria-label="外部链接" onChange={event => update("url", event.target.value)} type="url" value={draft.url} /></label>
      <footer><button onClick={onClose} type="button">取消</button><button disabled={!draft.name.trim()} onClick={() => onSave(buildActivity(activity, draft))} type="button">保存</button></footer>
    </aside></ModalLayer>
  );
}
