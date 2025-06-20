// src/workers/MarketWorker.js

// Worker 内部通信端口（与主线程通信）
let mainPort = null;

// 与专业 Worker 的通信端口
let tickerPort = null;
let orderbookPort = null;
let klinesPort = null;

// 初始化标志
let isTickerWorkerReady = false;
let isOrderbookWorkerReady = false;
let isKlinesWorkerReady = false;

// 初始化 Worker
self.onmessage = function (event) {
  // 接收初始化消息，设置主通信端口
  if (event.data.type === "INIT_MAIN_PORT") {
    mainPort = event.ports[0];
    mainPort.onmessage = handleMainMessage;
    console.log("MarketWorker: Main communication port initialized");

    // 通知主线程 Worker 已准备好
    mainPort.postMessage({ type: "WORKER_READY", workerType: "market" });
  }
  // 接收专业 Worker 的通信端口
  else if (event.data.type === "INIT_WORKER_PORT") {
    const { workerType, port } = event.data;

    switch (workerType) {
      case "ticker":
        tickerPort = port;
        tickerPort.onmessage = handleTickerMessage;
        console.log("MarketWorker: Ticker worker port initialized");
        break;

      case "orderbook":
        orderbookPort = port;
        orderbookPort.onmessage = handleOrderbookMessage;
        console.log("MarketWorker: Orderbook worker port initialized");
        break;

      case "klines":
        klinesPort = port;
        klinesPort.onmessage = handleKlinesMessage;
        console.log("MarketWorker: Klines worker port initialized");
        break;

      default:
        console.warn(`MarketWorker: Unknown worker type: ${workerType}`);
    }
  }
};

/**
 * 处理来自主线程的消息
 * @param {MessageEvent} event 消息事件
 */
function handleMainMessage(event) {
  const { type, dataType, data } = event.data;

  switch (type) {
    case "MARKET_DATA":
      // 根据数据类型分发到相应的专业 Worker
      distributeMarketData(dataType, data);
      break;

    case "WORKER_STATUS":
      const allReady =
        isTickerWorkerReady && isOrderbookWorkerReady && isKlinesWorkerReady;
      mainPort.postMessage({
        type: "WORKER_STATUS_RESPONSE",
        status: {
          ticker: isTickerWorkerReady,
          orderbook: isOrderbookWorkerReady,
          klines: isKlinesWorkerReady,
          allReady,
        },
      });
      break;

    case "PING":
      // 心跳检测
      mainPort.postMessage({
        type: "PONG",
        timestamp: Date.now(),
        workerType: "market",
      });

      // 同时检查专业 Worker 的状态
      if (tickerPort) tickerPort.postMessage({ type: "PING" });
      if (orderbookPort) orderbookPort.postMessage({ type: "PING" });
      if (klinesPort) klinesPort.postMessage({ type: "PING" });
      break;

    default:
      console.warn("MarketWorker: Unknown message type:", type);
  }
}

/**
 * 分发市场数据到相应的专业 Worker
 * @param {string} dataType 数据类型
 * @param {Object} data 数据
 */
function distributeMarketData(dataType, data) {
  switch (dataType) {
    case "ticker":
      if (tickerPort && isTickerWorkerReady) {
        tickerPort.postMessage({ type: "TICKER_DATA", data });
      } else {
        console.warn(
          "MarketWorker: Ticker worker not ready, data not forwarded",
        );
      }
      break;

    case "orderbook":
      if (orderbookPort && isOrderbookWorkerReady) {
        orderbookPort.postMessage({ type: "ORDERBOOK_DATA", data });
      } else {
        console.warn(
          "MarketWorker: Orderbook worker not ready, data not forwarded",
        );
      }
      break;

    case "klines":
      if (klinesPort && isKlinesWorkerReady) {
        // 区分历史数据和更新
        if (data.isHistorical) {
          klinesPort.postMessage({
            type: "HISTORICAL_KLINES",
            data: data.data,
            timeframe: data.timeframe,
          });
        } else {
          klinesPort.postMessage({
            type: "KLINE_UPDATE",
            data: data.data,
            timeframe: data.timeframe,
          });
        }
      } else {
        console.warn(
          "MarketWorker: Klines worker not ready, data not forwarded",
        );
      }
      break;

    default:
      console.warn(`MarketWorker: Unknown data type: ${dataType}`);
  }
}

/**
 * 处理来自 Ticker Worker 的消息
 * @param {MessageEvent} event 消息事件
 */
function handleTickerMessage(event) {
  const { type, data } = event.data;

  switch (type) {
    case "WORKER_READY":
      isTickerWorkerReady = true;
      mainPort.postMessage({ type: "WORKER_READY", workerType: "ticker" });
      break;

    case "PROCESSED_TICKER":
      // 转发处理后的数据到主线程
      mainPort.postMessage({
        type: "PROCESSED_DATA",
        dataType: "ticker",
        data,
      });
      break;

    case "ERROR":
      // 转发错误到主线程
      mainPort.postMessage({
        type: "WORKER_ERROR",
        workerType: "ticker",
        error: event.data.error,
      });
      break;

    case "PONG":
      // 转发心跳响应到主线程
      mainPort.postMessage({
        type: "WORKER_PONG",
        workerType: "ticker",
        timestamp: event.data.timestamp,
      });
      break;

    default:
      console.warn("MarketWorker: Unknown message from Ticker worker:", type);
  }
}

/**
 * 处理来自 Orderbook Worker 的消息
 * @param {MessageEvent} event 消息事件
 */
function handleOrderbookMessage(event) {
  const { type, data } = event.data;

  switch (type) {
    case "WORKER_READY":
      isOrderbookWorkerReady = true;
      mainPort.postMessage({ type: "WORKER_READY", workerType: "orderbook" });
      break;

    case "PROCESSED_ORDERBOOK":
      // 转发处理后的数据到主线程
      mainPort.postMessage({
        type: "PROCESSED_DATA",
        dataType: "orderbook",
        data,
      });
      break;

    case "ERROR":
      // 转发错误到主线程
      mainPort.postMessage({
        type: "WORKER_ERROR",
        workerType: "orderbook",
        error: event.data.error,
      });
      break;

    case "PONG":
      // 转发心跳响应到主线程
      mainPort.postMessage({
        type: "WORKER_PONG",
        workerType: "orderbook",
        timestamp: event.data.timestamp,
      });
      break;

    default:
      console.warn(
        "MarketWorker: Unknown message from Orderbook worker:",
        type,
      );
  }
}

/**
 * 处理来自 Klines Worker 的消息
 * @param {MessageEvent} event 消息事件
 */
function handleKlinesMessage(event) {
  const { type, data, timeframe } = event.data;

  switch (type) {
    case "WORKER_READY":
      isKlinesWorkerReady = true;
      mainPort.postMessage({ type: "WORKER_READY", workerType: "klines" });
      break;

    case "PROCESSED_HISTORICAL_KLINES":
      // 转发处理后的历史数据到主线程
      mainPort.postMessage({
        type: "PROCESSED_DATA",
        dataType: "klines",
        subType: "historical",
        data,
        timeframe,
      });
      break;

    case "PROCESSED_KLINE_UPDATE":
      // 转发处理后的更新到主线程
      mainPort.postMessage({
        type: "PROCESSED_DATA",
        dataType: "klines",
        subType: "update",
        data,
        timeframe,
      });
      break;

    case "TIMEFRAME_CHANGED":
      // 转发时间周期变更到主线程
      mainPort.postMessage({
        type: "TIMEFRAME_CHANGED",
        timeframe,
        timestamp: event.data.timestamp,
      });
      break;

    case "ERROR":
      // 转发错误到主线程
      mainPort.postMessage({
        type: "WORKER_ERROR",
        workerType: "klines",
        error: event.data.error,
      });
      break;

    case "PONG":
      // 转发心跳响应到主线程
      mainPort.postMessage({
        type: "WORKER_PONG",
        workerType: "klines",
        timestamp: event.data.timestamp,
      });
      break;

    default:
      console.warn("MarketWorker: Unknown message from Klines worker:", type);
  }
}

// 设置全局错误处理
self.addEventListener("error", function (event) {
  if (mainPort) {
    mainPort.postMessage({
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

console.log("MarketWorker initialized");
