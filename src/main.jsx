import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initSentry, ErrorBoundary } from "./utils/sentry";
import "./index.css";
import { testWebSocketConnection } from "./services/testWebSocket";
// 初始化 Sentry性能监控和错误日志
initSentry();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary fallback={<div>An error has occurred</div>}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
