// src/workers/OrderbookWorker.js

// Worker 内部通信端口
let port = null;

// 保存最新的订单簿状态
let currentOrderbook = {
  bids: [],
  asks: [],
  timestamp: 0,
};

// 初始化 Worker
self.onmessage = function (event) {
  // 接收初始化消息，设置通信端口
  if (event.data.type === "INIT_PORT") {
    port = event.ports[0];
    port.onmessage = handleMessage;
    console.log("OrderbookWorker: Communication port initialized");

    // 通知主线程 Worker 已准备好
    port.postMessage({ type: "WORKER_READY", workerType: "orderbook" });
  }
};

/**
 * 处理来自主线程或其他 Worker 的消息
 * @param {MessageEvent} event 消息事件
 */
function handleMessage(event) {
  const { type, data } = event.data;

  switch (type) {
    case "ORDERBOOK_DATA":
      processOrderbook(data);
      break;

    case "PING":
      // 心跳检测
      port.postMessage({
        type: "PONG",
        timestamp: Date.now(),
        workerType: "orderbook",
      });
      break;

    default:
      console.warn("OrderbookWorker: Unknown message type:", type);
  }
}

/**
 * 处理订单簿数据
 * @param {Object} data 订单簿数据
 */
function processOrderbook(data) {
  // 更新当前订单簿状态
  if (data.bids && data.bids.length > 0) {
    currentOrderbook.bids = data.bids;
  }

  if (data.asks && data.asks.length > 0) {
    currentOrderbook.asks = data.asks;
  }

  currentOrderbook.timestamp = data.timestamp || Date.now();

  // 这里可以添加更复杂的处理逻辑，如计算市场深度、价格聚合等
  const processed = {
    ...currentOrderbook,
    // 计算买卖盘压力
    bidVolume: calculateVolume(currentOrderbook.bids),
    askVolume: calculateVolume(currentOrderbook.asks),
    // 计算市场深度
    spread: calculateSpread(currentOrderbook.bids, currentOrderbook.asks),
    midPrice: calculateMidPrice(currentOrderbook.bids, currentOrderbook.asks),
  };

  // 发送处理后的数据到主线程
  port.postMessage({
    type: "PROCESSED_ORDERBOOK",
    data: processed,
  });
}

/**
 * 计算一侧订单簿的总量
 * @param {Array} orders 订单数组
 * @returns {number} 总量
 */
function calculateVolume(orders) {
  return orders.reduce((sum, [price, amount]) => sum + parseFloat(amount), 0);
}

/**
 * 计算买卖盘价差
 * @param {Array} bids 买单数组
 * @param {Array} asks 卖单数组
 * @returns {number} 价差
 */
function calculateSpread(bids, asks) {
  if (bids.length === 0 || asks.length === 0) return 0;

  const highestBid = bids[0][0];
  const lowestAsk = asks[0][0];

  return lowestAsk - highestBid;
}

/**
 * 计算买卖盘中间价格
 * @param {Array} bids 买单数组
 * @param {Array} asks 卖单数组
 * @returns {number} 中间价格
 */
function calculateMidPrice(bids, asks) {
  if (bids.length === 0 || asks.length === 0) return 0;

  const highestBid = bids[0][0];
  const lowestAsk = asks[0][0];

  return (highestBid + lowestAsk) / 2;
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

console.log("OrderbookWorker initialized");
