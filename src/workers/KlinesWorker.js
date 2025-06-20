// src/workers/KlinesWorker.js

// Worker 内部通信端口
let port = null;

// 保存历史 K 线数据
let historicalKlines = [];
// 当前时间周期
let currentTimeframe = "1m";

// 初始化 Worker
self.onmessage = function (event) {
  // 接收初始化消息，设置通信端口
  if (event.data.type === "INIT_PORT") {
    port = event.ports[0];
    port.onmessage = handleMessage;
    console.log("KlinesWorker: Communication port initialized");

    // 通知主线程 Worker 已准备好
    port.postMessage({ type: "WORKER_READY", workerType: "klines" });
  }
};

/**
 * 处理来自主线程或其他 Worker 的消息
 * @param {MessageEvent} event 消息事件
 */
function handleMessage(event) {
  const { type, data, timeframe } = event.data;

  switch (type) {
    case "HISTORICAL_KLINES":
      handleHistoricalKlines(data, timeframe);
      break;

    case "KLINE_UPDATE":
      processKlineUpdate(data, timeframe);
      break;

    case "CHANGE_TIMEFRAME":
      currentTimeframe = timeframe;
      port.postMessage({
        type: "TIMEFRAME_CHANGED",
        timeframe,
        timestamp: Date.now(),
      });
      break;

    case "PING":
      // 心跳检测
      port.postMessage({
        type: "PONG",
        timestamp: Date.now(),
        workerType: "klines",
      });
      break;

    default:
      console.warn("KlinesWorker: Unknown message type:", type);
  }
}

/**
 * 处理历史 K 线数据
 * @param {Array} data K 线数据
 * @param {string} timeframe 时间周期
 */
function handleHistoricalKlines(data, timeframe) {
  console.log(
    `KlinesWorker: Received ${data.length} historical klines for ${timeframe}`,
  );

  // 更新当前时间周期
  currentTimeframe = timeframe;

  // 保存历史数据
  historicalKlines = [...data];

  // 计算技术指标
  const processedData = calculateIndicators(historicalKlines);

  // 发送处理后的数据到主线程
  port.postMessage({
    type: "PROCESSED_HISTORICAL_KLINES",
    data: processedData,
    timeframe: currentTimeframe,
  });
}

/**
 * 处理 K 线更新
 * @param {Object} kline K 线数据
 * @param {string} timeframe 时间周期
 */
function processKlineUpdate(kline, timeframe) {
  if (timeframe !== currentTimeframe) {
    // 忽略不同时间周期的更新
    return;
  }

  // 更新最新的 K 线
  const index = historicalKlines.findIndex(
    (k) => k.timestamp === kline.timestamp,
  );

  if (index !== -1) {
    // 更新现有 K 线
    historicalKlines[index] = kline;
  } else {
    // 添加新 K 线
    historicalKlines.push(kline);
    // 保持合理的历史数据量
    if (historicalKlines.length > 500) {
      historicalKlines.shift();
    }
  }

  // 计算技术指标
  const latestKlines = historicalKlines.slice(-50); // 只计算最近的 K 线
  const processedData = calculateIndicators(latestKlines);

  // 发送处理后的最新 K 线到主线程
  port.postMessage({
    type: "PROCESSED_KLINE_UPDATE",
    data: processedData[processedData.length - 1],
    timeframe: currentTimeframe,
  });
}

/**
 * 计算技术指标
 * @param {Array} klines K 线数据
 * @returns {Array} 带有技术指标的 K 线数据
 */
function calculateIndicators(klines) {
  if (klines.length === 0) return [];

  // 克隆数据以避免修改原始数据
  const processedKlines = klines.map((kline) => ({ ...kline }));

  // 计算 SMA 5 和 SMA 10 (简单移动平均线)
  calculateSMA(processedKlines, 5, "sma5");
  calculateSMA(processedKlines, 10, "sma10");

  return processedKlines;
}

/**
 * 计算简单移动平均线
 * @param {Array} klines K 线数据
 * @param {number} period 周期
 * @param {string} key 结果属性名
 */
function calculateSMA(klines, period, key) {
  for (let i = 0; i < klines.length; i++) {
    if (i < period - 1) {
      klines[i][key] = null;
      continue;
    }

    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += klines[i - j].close;
    }

    klines[i][key] = sum / period;
  }
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

console.log("KlinesWorker initialized");
