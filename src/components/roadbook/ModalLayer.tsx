import { createPortal } from "react-dom";
import type { ReactNode } from "react";

type ModalLayerProps = {
  children: ReactNode;
  variant?: "dialog" | "drawer";
};

export function ModalLayer({ children, variant = "dialog" }: ModalLayerProps) {
  return createPortal(
    <div className={`modal-layer modal-layer--${variant}`} data-testid={variant === "drawer" ? "drawer-layer" : "modal-layer"}>
      <div aria-hidden="true" className="modal-backdrop" />
      {children}
    </div>,
    document.body,
  );
}
