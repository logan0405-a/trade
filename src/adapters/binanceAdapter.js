import { BaseExchangeAdapter } from "./baseAdapter";
import ReconnectingWebSocket from "reconnecting-websocket";

/**
 * Binance 交易所适配器
 */
export class BinanceAdapter extends BaseExchangeAdapter {
  constructor() {
    super("binance", "Binance");
    this.restBaseUrl = "https://api.binance.com";
    this.wsBaseUrl = "wss://stream.binance.com:9443/ws";

    // Binance 时间周期映射
    this.timeframeMap = {
      "1m": "1m",
      "5m": "5m",
      "15m": "15m",
      "1h": "1h",
      "4h": "4h",
      "1d": "1d",
    };
  }

  /**
   * 格式化交易对为Binance格式 (如 BTCUSDT)
   * @param {string} market - 交易对 (如 BTC/USDT)
   * @returns {string} - Binance格式交易对
   */
  formatMarket(market) {
    // 将 BTC/USDT 转换为 BTCUSDT
    return market.replace("/", "").toUpperCase();
  }

  /**
   * 获取支持的交易对列表
   * @returns {Promise<Array<string>>} - 交易对列表
   */
  async getMarkets() {
    try {
      const response = await fetch(`${this.restBaseUrl}/api/v3/exchangeInfo`);
      const data = await response.json();

      // 过滤出现货交易对并格式化为 BTC/USDT 格式
      return data.symbols
        .filter(
          (symbol) =>
            symbol.status === "TRADING" && symbol.isSpotTradingAllowed,
        )
        .map((symbol) => `${symbol.baseAsset}/${symbol.quoteAsset}`);
    } catch (error) {
      console.error("Failed to fetch Binance markets:", error);
      throw error;
    }
  }

  /**
   * 获取K线数据
   * @param {string} market - 交易对
   * @param {string} timeframe - 时间周期
   * @param {number} limit - 返回记录数量
   * @returns {Promise<Array<Kline>>} - K线数据
   */
  async getKlines(market, timeframe, limit = 100) {
    try {
      const binanceTimeframe = this.timeframeMap[timeframe];
      const binanceMarket = this.formatMarket(market);

      const url = `${this.restBaseUrl}/api/v3/klines?symbol=${binanceMarket}&interval=${binanceTimeframe}&limit=${limit}`;
      const response = await fetch(url);
      const data = await response.json();

      // 格式化为统一的K线格式
      return data.map((item) => ({
        timestamp: item[0],
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
      }));
    } catch (error) {
      console.error(`Failed to fetch Binance klines for ${market}:`, error);
      throw error;
    }
  }

  /**
   * 获取订单簿数据
   * @param {string} market - 交易对
   * @param {number} limit - 返回记录数量
   * @returns {Promise<Orderbook>} - 订单簿数据
   */
  async getOrderbook(market, limit = 20) {
    try {
      const binanceMarket = this.formatMarket(market);
      const url = `${this.restBaseUrl}/api/v3/depth?symbol=${binanceMarket}&limit=${limit}`;

      const response = await fetch(url);
      const data = await response.json();

      // 格式化为统一的订单簿格式
      return {
        bids: data.bids.map((item) => [
          parseFloat(item[0]),
          parseFloat(item[1]),
        ]),
        asks: data.asks.map((item) => [
          parseFloat(item[0]),
          parseFloat(item[1]),
        ]),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`Failed to fetch Binance orderbook for ${market}:`, error);
      throw error;
    }
  }

  /**
   * 获取行情数据
   * @param {string} market - 交易对
   * @returns {Promise<Ticker>} - 行情数据
   */
  async getTicker(market) {
    try {
      const binanceMarket = this.formatMarket(market);
      const url = `${this.restBaseUrl}/api/v3/ticker/24hr?symbol=${binanceMarket}`;

      const response = await fetch(url);
      const data = await response.json();

      // 格式化为统一的行情格式
      return {
        symbol: market,
        lastPrice: parseFloat(data.lastPrice),
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
        volume: parseFloat(data.volume),
        high: parseFloat(data.highPrice),
        low: parseFloat(data.lowPrice),
      };
    } catch (error) {
      console.error(`Failed to fetch Binance ticker for ${market}:`, error);
      throw error;
    }
  }

  /**
   * 创建订单簿WebSocket流
   * @param {string} market - 交易对
   * @param {Function} onMessage - 消息处理函数
   * @param {Function} onError - 错误处理函数
   * @returns {Object} - WebSocket控制对象
   */
  createOrderbookStream(market, onMessage, onError) {
    const binanceMarket = this.formatMarket(market).toLowerCase();

    // 修改 WebSocket URL 使用 "depth" 而非 "depth@100ms"
    // 使用标准的订单簿增量更新，不要使用 100ms 的高频更新
    const wsUrl = `${this.wsBaseUrl}/${binanceMarket}@depth`;

    console.log(`Creating orderbook stream: ${wsUrl}`);

    const ws = new ReconnectingWebSocket(wsUrl);

    // 用于存储完整订单簿的状态
    let orderbook = {
      bids: [],
      asks: [],
      timestamp: Date.now(),
    };

    // 先获取一次完整的订单簿快照
    this.getOrderbook(market)
      .then((snapshot) => {
        orderbook = snapshot;
        console.log(
          `Initial orderbook snapshot received with ${orderbook.bids.length} bids and ${orderbook.asks.length} asks`,
        );

        // 发送初始快照
        onMessage(orderbook);
      })
      .catch((err) => {
        console.error("Failed to fetch initial orderbook snapshot:", err);
        if (onError) onError(err);
      });

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 检查数据格式
        if (!data.b && !data.a) {
          console.warn(
            "Received orderbook data without bids (b) or asks (a):",
            data,
          );
          return;
        }

        // 更新订单簿
        if (data.b && data.b.length > 0) {
          // 处理买单更新
          data.b.forEach((item) => {
            const price = parseFloat(item[0]);
            const amount = parseFloat(item[1]);

            // 如果数量为0，则删除此价格档位
            if (amount === 0) {
              orderbook.bids = orderbook.bids.filter((bid) => bid[0] !== price);
            } else {
              // 更新或添加此价格档位
              const existingIndex = orderbook.bids.findIndex(
                (bid) => bid[0] === price,
              );
              if (existingIndex !== -1) {
                orderbook.bids[existingIndex] = [price, amount];
              } else {
                orderbook.bids.push([price, amount]);
                // 保持价格降序排列（最高买价在前）
                orderbook.bids.sort((a, b) => b[0] - a[0]);
              }
            }
          });
        }

        if (data.a && data.a.length > 0) {
          // 处理卖单更新
          data.a.forEach((item) => {
            const price = parseFloat(item[0]);
            const amount = parseFloat(item[1]);

            // 如果数量为0，则删除此价格档位
            if (amount === 0) {
              orderbook.asks = orderbook.asks.filter((ask) => ask[0] !== price);
            } else {
              // 更新或添加此价格档位
              const existingIndex = orderbook.asks.findIndex(
                (ask) => ask[0] === price,
              );
              if (existingIndex !== -1) {
                orderbook.asks[existingIndex] = [price, amount];
              } else {
                orderbook.asks.push([price, amount]);
                // 保持价格升序排列（最低卖价在前）
                orderbook.asks.sort((a, b) => a[0] - b[0]);
              }
            }
          });
        }

        // 更新时间戳
        orderbook.timestamp = data.E || Date.now();

        // 限制订单簿大小，只保留前20个价格档位
        orderbook.bids = orderbook.bids.slice(0, 20);
        orderbook.asks = orderbook.asks.slice(0, 20);

        // 发送更新后的订单簿
        onMessage({ ...orderbook });
      } catch (error) {
        console.error("Error parsing Binance orderbook message:", error);
        if (onError) onError(error);
      }
    };

    ws.onerror = (error) => {
      console.error("Binance orderbook websocket error:", error);
      if (onError) onError(error);
    };

    return {
      close: () => ws.close(),
      isOpen: () => ws.readyState === WebSocket.OPEN,
    };
  }

  /**
   * 创建行情WebSocket流
   * @param {string} market - 交易对
   * @param {Function} onMessage - 消息处理函数
   * @param {Function} onError - 错误处理函数
   * @returns {Object} - WebSocket控制对象
   */
  createTickerStream(market, onMessage, onError) {
    const binanceMarket = this.formatMarket(market).toLowerCase();
    const wsUrl = `${this.wsBaseUrl}/${binanceMarket}@ticker`;

    const ws = new ReconnectingWebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 转换为统一格式
        const ticker = {
          symbol: market,
          lastPrice: parseFloat(data.c),
          priceChange: parseFloat(data.p),
          priceChangePercent: parseFloat(data.P),
          volume: parseFloat(data.v),
          high: parseFloat(data.h),
          low: parseFloat(data.l),
        };

        onMessage(ticker);
      } catch (error) {
        console.error("Error parsing Binance ticker message:", error);
        if (onError) onError(error);
      }
    };

    ws.onerror = (error) => {
      console.error("Binance ticker websocket error:", error);
      if (onError) onError(error);
    };

    return {
      close: () => ws.close(),
      isOpen: () => ws.readyState === WebSocket.OPEN,
    };
  }

  /**
   * 创建K线WebSocket流
   * @param {string} market - 交易对
   * @param {string} timeframe - 时间周期
   * @param {Function} onMessage - 消息处理函数
   * @param {Function} onError - 错误处理函数
   * @returns {Object} - WebSocket控制对象
   */
  createKlineStream(market, timeframe, onMessage, onError) {
    const binanceMarket = this.formatMarket(market).toLowerCase();
    const binanceTimeframe = this.timeframeMap[timeframe];
    const wsUrl = `${this.wsBaseUrl}/${binanceMarket}@kline_${binanceTimeframe}`;

    const ws = new ReconnectingWebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const k = data.k;

        // 转换为统一格式
        const kline = {
          timestamp: k.t,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
          isComplete: k.x,
        };

        onMessage(kline);
      } catch (error) {
        console.error("Error parsing Binance kline message:", error);
        if (onError) onError(error);
      }
    };

    ws.onerror = (error) => {
      console.error("Binance kline websocket error:", error);
      if (onError) onError(error);
    };

    return {
      close: () => ws.close(),
      isOpen: () => ws.readyState === WebSocket.OPEN,
    };
  }
}
