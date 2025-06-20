// src/services/marketDataService.js
import adapterFactory from "../adapters/adapterFactory";
import workerManager from "./WorkerManager";

/**
 * 市场数据服务
 * 管理 WebSocket 连接、数据获取和 Worker 通信
 */
class MarketDataService {
  constructor() {
    // WebSocket 连接
    this.connections = {
      ticker: null,
      orderbook: null,
      klines: null,
    };

    // 核心属性
    this.adapter = null;
    this.currentMarket = null;
    this.currentTimeframe = "1m";

    // 数据监听器
    this.listeners = {
      ticker: new Set(),
      orderbook: new Set(),
      klines: new Set(),
      connectionStatus: new Set(),
      processedData: new Set(),
    };

    // 连接状态
    this.connectionStatus = {
      ticker: "closed",
      orderbook: "closed",
      klines: "closed",
    };

    // Worker 相关
    this.marketWorker = null;
    this.marketPort = null;
    this.workersReady = {
      market: false,
      ticker: false,
      orderbook: false,
      klines: false,
    };
  }

  /**
   * 初始化交易所适配器和 Worker
   * @param {string} exchangeId - 交易所 ID
   * @returns {boolean} - 是否初始化成功
   */
  initialize(exchangeId = "binance") {
    try {
      // 初始化适配器
      this.adapter = adapterFactory.getAdapter(exchangeId);
      console.log(`MarketDataService initialized with ${exchangeId} adapter`);

      // 初始化 Worker 架构
      this.initializeWorkers();

      return true;
    } catch (error) {
      console.error("Failed to initialize adapter:", error);
      return false;
    }
  }

  /**
   * 初始化 Worker 架构
   */
  initializeWorkers() {
    try {
      console.log("Initializing worker architecture...");

      // 1. 创建 MarketWorker（主 Worker）
      const { worker: marketWorker, port: marketPort } =
        workerManager.createWorker(
          "market",
          "../workers/MarketWorker.js",
          "main",
        );

      this.marketWorker = marketWorker;
      this.marketPort = marketPort;

      // 设置主 Worker 消息处理
      this.marketPort.onmessage = this.handleMarketWorkerMessage.bind(this);
      this.marketPort.start();

      // 2. 创建专业 Worker
      const { worker: tickerWorker } = workerManager.createWorker(
        "ticker",
        "../workers/TickerWorker.js",
      );

      const { worker: orderbookWorker } = workerManager.createWorker(
        "orderbook",
        "../workers/OrderbookWorker.js",
      );

      const { worker: klinesWorker } = workerManager.createWorker(
        "klines",
        "../workers/KlinesWorker.js",
      );

      // 3. 连接 Worker
      workerManager.connectWorkers("market", "ticker", "data");
      workerManager.connectWorkers("market", "orderbook", "data");
      workerManager.connectWorkers("market", "klines", "data");

      console.log("Worker architecture initialized");
    } catch (error) {
      console.error("Failed to initialize workers:", error);
      throw error;
    }
  }

  /**
   * 处理来自 MarketWorker 的消息
   * @param {MessageEvent} event 消息事件
   */
  handleMarketWorkerMessage(event) {
    const { type, dataType, data, workerType, subType } = event.data;

    switch (type) {
      case "WORKER_READY":
        this.handleWorkerReady(workerType);
        break;

      case "PROCESSED_DATA":
        this.handleProcessedData(dataType, data, subType);
        break;

      case "WORKER_ERROR":
        console.error(`Error in ${workerType} worker:`, event.data.error);
        // 可以实现错误重试策略或通知用户
        break;

      case "WORKER_PONG":
        // 处理心跳响应，可用于监控 Worker 健康状态
        console.log(
          `Worker ${workerType} responded in ${Date.now() - event.data.timestamp}ms`,
        );
        break;

      case "WORKER_STATUS_RESPONSE":
        // 处理 Worker 状态响应
        console.log("Worker status:", event.data.status);
        break;

      default:
        console.log("Unknown message from MarketWorker:", event.data);
    }
  }

  /**
   * 处理 Worker 就绪消息
   * @param {string} workerType Worker 类型
   */
  handleWorkerReady(workerType) {
    console.log(`${workerType} worker is ready`);

    this.workersReady[workerType] = true;

    // 检查是否所有 Worker 都准备好了
    const allReady = Object.values(this.workersReady).every((ready) => ready);

    if (allReady) {
      console.log("All workers are ready");
      this._notifyListeners("connectionStatus", {
        workers: "ready",
        status: this.workersReady,
      });
    }
  }

  /**
   * 处理处理后的数据
   * @param {string} dataType 数据类型
   * @param {Object} data 处理后的数据
   * @param {string} subType 数据子类型
   */
  handleProcessedData(dataType, data, subType) {
    // 通知监听器
    this._notifyListeners("processedData", {
      type: dataType,
      data,
      subType,
    });

    // 同时通知特定类型的监听器
    if (dataType === "ticker") {
      this._notifyListeners("ticker", data);
    } else if (dataType === "orderbook") {
      this._notifyListeners("orderbook", data);
    } else if (dataType === "klines") {
      this._notifyListeners("klines", {
        data,
        timeframe: event.data.timeframe,
        loading: false,
        error: null,
        isHistorical: subType === "historical",
        isUpdate: subType === "update",
      });
    }
  }

  /**
   * 将数据转发给 Market Worker
   * @param {string} dataType 数据类型
   * @param {object} data 数据
   */
  forwardToWorker(dataType, data) {
    if (!this.marketPort || !this.workersReady.market) {
      // Worker 未准备好，跳过
      return;
    }

    this.marketPort.postMessage({
      type: "MARKET_DATA",
      dataType,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 连接到指定市场
   * @param {string} market - 交易对
   * @returns {Promise<boolean>} - 是否连接成功
   */
  async connectToMarket(market) {
    if (!this.adapter) {
      console.error("Adapter not initialized. Call initialize() first.");
      return false;
    }

    try {
      console.log(`Connecting to market: ${market}`);

      // 关闭现有连接
      this.closeAllConnections();

      // 更新当前市场
      this.currentMarket = market;

      // 连接行情数据流
      this.connectTicker(market);

      // 连接订单簿数据流
      this.connectOrderbook(market);

      // 连接 K 线数据流
      this.connectKlines(market, this.currentTimeframe);

      return true;
    } catch (error) {
      console.error(`Failed to connect to market ${market}:`, error);
      return false;
    }
  }

  /**
   * 连接行情数据流
   * @param {string} market - 交易对
   */
  connectTicker(market) {
    if (this.connections.ticker) {
      this.connections.ticker.close();
    }

    try {
      // 更新连接状态
      this._updateConnectionStatus("ticker", "connecting");

      console.log(`Creating ticker stream for ${market}`);

      this.connections.ticker = this.adapter.createTickerStream(
        market,
        // 消息处理函数
        (data) => {
          console.log(`Ticker data for ${market}:`, data);

          // 转发数据到 Worker
          this.forwardToWorker("ticker", data);

          // 通知所有监听器
          this._notifyListeners("ticker", data);
        },
        // 错误处理函数
        (error) => {
          console.error(`Ticker stream error for ${market}:`, error);
          this._updateConnectionStatus("ticker", "error");
        },
      );

      this._updateConnectionStatus("ticker", "open");
      return true;
    } catch (error) {
      console.error(`Failed to connect ticker for ${market}:`, error);
      this._updateConnectionStatus("ticker", "error");
      return false;
    }
  }

  /**
   * 连接订单簿数据流
   * @param {string} market - 交易对
   */
  connectOrderbook(market) {
    if (this.connections.orderbook) {
      this.connections.orderbook.close();
    }

    try {
      // 更新连接状态
      this._updateConnectionStatus("orderbook", "connecting");

      console.log(`Creating orderbook stream for ${market}`);

      this.connections.orderbook = this.adapter.createOrderbookStream(
        market,
        // 消息处理函数
        (data) => {
          // 避免过多日志，只在有合理数据时记录
          if (
            (data.bids && data.bids.length > 0) ||
            (data.asks && data.asks.length > 0)
          ) {
            console.log(
              `Orderbook data for ${market}, bids: ${data.bids?.length || 0}, asks: ${data.asks?.length || 0}`,
            );
          }

          // 转发数据到 Worker
          this.forwardToWorker("orderbook", data);

          // 通知所有监听器
          this._notifyListeners("orderbook", data);
        },
        // 错误处理函数
        (error) => {
          console.error(`Orderbook stream error for ${market}:`, error);
          this._updateConnectionStatus("orderbook", "error");
        },
      );

      this._updateConnectionStatus("orderbook", "open");
      return true;
    } catch (error) {
      console.error(`Failed to connect orderbook for ${market}:`, error);
      this._updateConnectionStatus("orderbook", "error");
      return false;
    }
  }

  /**
   * 连接 K 线数据流
   * @param {string} market - 交易对
   * @param {string} timeframe - 时间周期
   */
  connectKlines(market, timeframe) {
    if (this.connections.klines) {
      this.connections.klines.close();
    }

    this.currentTimeframe = timeframe;

    try {
      // 更新连接状态
      this._updateConnectionStatus("klines", "connecting");

      // 通知监听器 K 线数据正在加载
      this._notifyListeners("klines", { loading: true, error: null });

      // 先获取历史 K 线数据
      this.fetchHistoricalKlines(market, timeframe)
        .then((historicalData) => {
          console.log(`Creating kline stream for ${market} (${timeframe})`);

          // 连接实时 K 线数据流
          this.connections.klines = this.adapter.createKlineStream(
            market,
            timeframe,
            // 消息处理函数
            (data) => {
              console.log(`Kline data for ${market} (${timeframe}):`, data);

              // 转发数据到 Worker
              this.forwardToWorker("klines", {
                data,
                timeframe,
                isUpdate: true,
              });

              // 通知所有监听器
              this._notifyListeners("klines", {
                data: data,
                timeframe,
                loading: false,
                error: null,
                isUpdate: true,
              });
            },
            // 错误处理函数
            (error) => {
              console.error(
                `Kline stream error for ${market} (${timeframe}):`,
                error,
              );
              this._updateConnectionStatus("klines", "error");
              this._notifyListeners("klines", {
                loading: false,
                error: error.message,
              });
            },
          );

          this._updateConnectionStatus("klines", "open");
        })
        .catch((error) => {
          console.error(
            `Failed to fetch historical klines for ${market}:`,
            error,
          );
          this._notifyListeners("klines", {
            loading: false,
            error: error.message,
          });
        });

      return true;
    } catch (error) {
      console.error(`Failed to connect klines for ${market}:`, error);
      this._updateConnectionStatus("klines", "error");
      this._notifyListeners("klines", { loading: false, error: error.message });
      return false;
    }
  }

  /**
   * 获取历史 K 线数据
   * @param {string} market - 交易对
   * @param {string} timeframe - 时间周期
   * @returns {Promise<Array>} - K 线数据
   */
  async fetchHistoricalKlines(market, timeframe) {
    try {
      console.log(`Fetching historical klines for ${market} (${timeframe})`);
      const klines = await this.adapter.getKlines(market, timeframe, 100);
      console.log(`Received ${klines.length} historical klines`);

      // 转发历史数据到 Worker
      this.forwardToWorker("klines", {
        data: klines,
        timeframe,
        isHistorical: true,
      });

      // 通知监听器
      this._notifyListeners("klines", {
        data: klines,
        timeframe,
        loading: false,
        error: null,
        isHistorical: true,
      });

      return klines;
    } catch (error) {
      console.error(`Failed to fetch historical klines for ${market}:`, error);
      throw error;
    }
  }

  /**
   * 切换时间周期
   * @param {string} timeframe - 时间周期
   */
  changeTimeframe(timeframe) {
    if (this.currentTimeframe === timeframe) {
      return;
    }

    console.log(`Changing timeframe to ${timeframe}`);

    if (this.currentMarket) {
      this.connectKlines(this.currentMarket, timeframe);
    }
  }

  /**
   * 检查 Worker 健康状态
   * @returns {Promise<Object>} Worker 状态
   */
  async checkWorkersStatus() {
    return new Promise((resolve) => {
      if (!this.marketPort) {
        resolve({ error: "Market worker not initialized" });
        return;
      }

      const timeoutId = setTimeout(() => {
        resolve({ error: "Worker status check timeout" });
      }, 5000);

      // 设置一次性监听器
      const listener = (event) => {
        if (event.data.type === "WORKER_STATUS_RESPONSE") {
          clearTimeout(timeoutId);
          this.marketPort.removeEventListener("message", listener);
          resolve(event.data.status);
        }
      };

      this.marketPort.addEventListener("message", listener);

      // 发送状态检查请求
      this.marketPort.postMessage({ type: "WORKER_STATUS" });
    });
  }

  /**
   * 关闭所有连接
   */
  closeAllConnections() {
    Object.keys(this.connections).forEach((key) => {
      if (this.connections[key]) {
        console.log(`Closing ${key} connection`);
        this.connections[key].close();
        this.connections[key] = null;
        this._updateConnectionStatus(key, "closed");
      }
    });
  }

  /**
   * 获取支持的交易对
   * @returns {Promise<Array<string>>} - 交易对列表
   */
  async fetchAvailableMarkets() {
    if (!this.adapter) {
      throw new Error("Adapter not initialized. Call initialize() first.");
    }

    try {
      console.log("Fetching available markets");
      const markets = await this.adapter.getMarkets();

      // 过滤只保留 USDT 交易对
      const usdtMarkets = markets.filter((market) => market.endsWith("/USDT"));
      console.log(`Received ${usdtMarkets.length} USDT markets`);

      return usdtMarkets;
    } catch (error) {
      console.error("Failed to fetch available markets:", error);
      throw error;
    }
  }

  /**
   * 添加数据监听器
   * @param {string} type - 数据类型 (ticker, orderbook, klines, connectionStatus, processedData)
   * @param {Function} listener - 监听器函数
   * @returns {Function} 取消监听函数
   */
  addListener(type, listener) {
    if (this.listeners[type]) {
      this.listeners[type].add(listener);
      return () => this.removeListener(type, listener);
    }
    return () => {};
  }

  /**
   * 移除数据监听器
   * @param {string} type - 数据类型
   * @param {Function} listener - 监听器函数
   */
  removeListener(type, listener) {
    if (this.listeners[type]) {
      this.listeners[type].delete(listener);
    }
  }

  /**
   * 通知所有监听器
   * @param {string} type - 数据类型
   * @param {any} data - 数据
   * @private
   */
  _notifyListeners(type, data) {
    if (this.listeners[type]) {
      this.listeners[type].forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in ${type} listener:`, error);
        }
      });
    }
  }

  /**
   * 更新连接状态
   * @param {string} service - 服务类型
   * @param {string} status - 状态
   * @private
   */
  _updateConnectionStatus(service, status) {
    this.connectionStatus[service] = status;

    // 通知所有连接状态监听器
    this._notifyListeners("connectionStatus", this.connectionStatus);
  }

  /**
   * 终止所有资源
   * 在应用关闭时调用
   */
  terminate() {
    // 关闭所有 WebSocket 连接
    this.closeAllConnections();

    // 终止所有 Worker
    workerManager.terminateAll();

    // 重置 Worker 状态
    this.marketWorker = null;
    this.marketPort = null;
    this.workersReady = {
      market: false,
      ticker: false,
      orderbook: false,
      klines: false,
    };

    // 清空所有监听器
    Object.keys(this.listeners).forEach((key) => {
      this.listeners[key].clear();
    });

    console.log("MarketDataService terminated");
  }
}

// 创建单例实例
const marketDataService = new MarketDataService();

export default marketDataService;
