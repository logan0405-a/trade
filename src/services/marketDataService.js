// src/services/marketDataService.js
import adapterFactory from "../adapters/adapterFactory";

/**
 * 市场数据服务
 * 管理WebSocket连接和数据获取
 */
class MarketDataService {
  constructor() {
    // WebSocket连接
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
    };

    // 连接状态
    this.connectionStatus = {
      ticker: "closed",
      orderbook: "closed",
      klines: "closed",
    };
  }

  /**
   * 初始化交易所适配器
   * @param {string} exchangeId - 交易所ID
   * @returns {boolean} - 是否初始化成功
   */
  initialize(exchangeId = "binance") {
    try {
      this.adapter = adapterFactory.getAdapter(exchangeId);
      console.log(`MarketDataService initialized with ${exchangeId} adapter`);
      return true;
    } catch (error) {
      console.error("Failed to initialize adapter:", error);
      return false;
    }
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

      // 连接K线数据流
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
          if (data.bids.length > 0 || data.asks.length > 0) {
            console.log(
              `Orderbook data for ${market}, bids: ${data.bids.length}, asks: ${data.asks.length}`,
            );
          }

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
   * 连接K线数据流
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

      // 通知监听器K线数据正在加载
      this._notifyListeners("klines", { loading: true, error: null });

      // 先获取历史K线数据
      this.fetchHistoricalKlines(market, timeframe)
        .then((historicalData) => {
          console.log(`Creating kline stream for ${market} (${timeframe})`);

          // 连接实时K线数据流
          this.connections.klines = this.adapter.createKlineStream(
            market,
            timeframe,
            // 消息处理函数
            (data) => {
              console.log(`Kline data for ${market} (${timeframe}):`, data);

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
   * 获取历史K线数据
   * @param {string} market - 交易对
   * @param {string} timeframe - 时间周期
   * @returns {Promise<Array>} - K线数据
   */
  async fetchHistoricalKlines(market, timeframe) {
    try {
      console.log(`Fetching historical klines for ${market} (${timeframe})`);
      const klines = await this.adapter.getKlines(market, timeframe, 100);
      console.log(`Received ${klines.length} historical klines`);

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

      // 过滤只保留USDT交易对
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
   * @param {string} type - 数据类型 (ticker, orderbook, klines, connectionStatus)
   * @param {Function} listener - 监听器函数
   */
  addListener(type, listener) {
    if (this.listeners[type]) {
      this.listeners[type].add(listener);
    }
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
    // 关闭所有WebSocket连接
    this.closeAllConnections();

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
