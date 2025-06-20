// src/workers/TickerWorker.js

// Worker 内部通信端口
let port = null;

// 初始化 Worker
self.onmessage = function (event) {
  // 接收初始化消息，设置通信端口
  if (event.data.type === "INIT_PORT") {
    port = event.ports[0];
    port.onmessage = handleMessage;
    console.log("TickerWorker: Communication port initialized");

    // 通知主线程 Worker 已准备好
    port.postMessage({ type: "WORKER_READY", workerType: "ticker" });
  }
};

/**
 * 处理来自主线程或其他 Worker 的消息
 * @param {MessageEvent} event 消息事件
 */
function handleMessage(event) {
  const { type, data } = event.data;

  switch (type) {
    case "TICKER_DATA":
      processTicker(data);
      break;

    case "PING":
      // 心跳检测
      port.postMessage({
        type: "PONG",
        timestamp: Date.now(),
        workerType: "ticker",
      });
      break;

    default:
      console.warn("TickerWorker: Unknown message type:", type);
  }
}

/**
 * 处理 Ticker 数据
 * @param {Object} data Ticker 数据
 */
function processTicker(data) {
  // 这里可以添加更复杂的处理逻辑，如计算移动平均线等
  const processed = {
    ...data,
    // 添加计算字段
    percentageChange: parseFloat(data.priceChangePercent) || 0,
    timestamp: Date.now(),
  };

  // 发送处理后的数据到主线程
  port.postMessage({
    type: "PROCESSED_TICKER",
    data: processed,
  });
}

// 设置全局错误处理
self.addEventListener("error", function (event) {
  if (port) {
    port.postMessage({
      type: "ERROR",
      error: {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      timestamp: Date.now(),
    });
  }
});

console.log("TickerWorker initialized");
