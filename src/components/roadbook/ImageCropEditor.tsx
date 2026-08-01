import { useRef } from "react";
import type { ImageCrop } from "../../domain/roadbook";

type ImageCropEditorProps = {
  image: string;
  value: ImageCrop;
  onChange: (crop: ImageCrop) => void;
};

const defaultCrop: ImageCrop = { zoom: 1, positionX: 50, positionY: 50 };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizedImageCrop(crop?: ImageCrop): ImageCrop {
  return {
    zoom: clamp(crop?.zoom ?? defaultCrop.zoom, 1, 2.4),
    positionX: clamp(crop?.positionX ?? defaultCrop.positionX, 0, 100),
    positionY: clamp(crop?.positionY ?? defaultCrop.positionY, 0, 100)
  };
}

export function imageCropStyle(crop?: ImageCrop) {
  const normalized = normalizedImageCrop(crop);
  return {
    backgroundPosition: `${normalized.positionX}% ${normalized.positionY}%`,
    backgroundSize: `${normalized.zoom * 100}%`
  };
}

export function ImageCropEditor({ image, value, onChange }: ImageCropEditorProps) {
  const pointerStart = useRef<{ clientX: number; clientY: number; crop: ImageCrop } | undefined>(undefined);
  const crop = normalizedImageCrop(value);

  function updateZoom(value: string) {
    const zoom = Number(value);
    onChange({ ...crop, zoom: Number.isFinite(zoom) ? clamp(zoom, 1, 2.4) : 1 });
  }

  function startMove(event: React.PointerEvent<HTMLDivElement>) {
    pointerStart.current = { clientX: event.clientX, clientY: event.clientY, crop };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    if (!start) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    onChange({
      ...start.crop,
      positionX: clamp(start.crop.positionX - ((event.clientX - start.clientX) / bounds.width) * 100, 0, 100),
      positionY: clamp(start.crop.positionY - ((event.clientY - start.clientY) / bounds.height) * 100, 0, 100)
    });
  }

  return (
    <section className="image-crop-editor">
      <div className="image-crop-editor-heading"><strong>背景裁剪</strong><span>拖动图片调整位置</span></div>
      <div aria-label="背景裁剪预览" className="image-crop-stage" onPointerDown={startMove} onPointerMove={move} onPointerUp={() => { pointerStart.current = undefined; }} role="slider" style={{ backgroundImage: `url("${image}")`, ...imageCropStyle(crop) }} tabIndex={0}>
        <span aria-hidden="true" />
      </div>
      <label>图片缩放<input aria-label="图片缩放" inputMode="decimal" max="2.4" min="1" onChange={event => updateZoom(event.target.value)} step="0.1" type="number" value={crop.zoom} /></label>
    </section>
  );
}
