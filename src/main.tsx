import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RoadbookApp } from "./RoadbookApp";
import "./styles/tokens.css";
import "./styles/app.css";

const root = document.querySelector("#app");

if (!root) {
  throw new Error("找不到应用挂载节点。");
}

createRoot(root).render(
  <StrictMode>
    <RoadbookApp />
  </StrictMode>
);
