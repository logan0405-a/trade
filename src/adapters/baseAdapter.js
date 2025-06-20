import { TIMEFRAMES } from "./types";

/**
 * 基础交易所适配器
 * 提供通用方法和默认实现
 */
export class BaseExchangeAdapter {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.timeframes = TIMEFRAMES;
  }

  /**
   * 格式化交易对为标准格式
   * @param {string} market - 交易对
   * @returns {string} - 标准格式交易对
   */
  formatMarket(market) {
    return market; // 默认实现，子类应重写
  }

  /**
   * 获取支持的交易对列表
   * @returns {Promise<Array<string>>} - 交易对列表
   */
  async getMarkets() {
    throw new Error("Method not implemented");
  }

  /**
   * 获取K线数据
   * @param {string} market - 交易对
   * @param {string} timeframe - 时间周期
   * @param {number} limit - 返回记录数量
   * @returns {Promise<Array<Kline>>} - K线数据
   */
  async getKlines(market, timeframe, limit = 100) {
    throw new Error("Method not implemented");
  }

  /**
   * 获取订单簿数据
   * @param {string} market - 交易对
   * @param {number} limit - 返回记录数量
   * @returns {Promise<Orderbook>} - 订单簿数据
   */
  async getOrderbook(market, limit = 20) {
    throw new Error("Method not implemented");
  }

  /**
   * 获取行情数据
   * @param {string} market - 交易对
   * @returns {Promise<Ticker>} - 行情数据
   */
  async getTicker(market) {
    throw new Error("Method not implemented");
  }

  /**
   * 创建订单簿WebSocket流
   * @param {string} market - 交易对
   * @param {Function} onMessage - 消息处理函数
   * @param {Function} onError - 错误处理函数
   * @returns {Object} - WebSocket控制对象
   */
  createOrderbookStream(market, onMessage, onError) {
    throw new Error("Method not implemented");
  }

  /**
   * 创建行情WebSocket流
   * @param {string} market - 交易对
   * @param {Function} onMessage - 消息处理函数
   * @param {Function} onError - 错误处理函数
   * @returns {Object} - WebSocket控制对象
   */
  createTickerStream(market, onMessage, onError) {
    throw new Error("Method not implemented");
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
    throw new Error("Method not implemented");
  }
}
