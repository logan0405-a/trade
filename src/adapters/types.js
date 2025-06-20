// src/adapters/types.js
/**
 * 交易所适配器接口
 * @typedef {Object} ExchangeAdapter
 * @property {string} id - 交易所唯一标识符
 * @property {string} name - 交易所名称
 * @property {Function} getMarkets - 获取支持的交易对列表
 * @property {Function} getKlines - 获取K线数据
 * @property {Function} getOrderbook - 获取订单簿数据
 * @property {Function} getTicker - 获取行情数据
 * @property {Function} createOrderbookStream - 创建订单簿WebSocket流
 * @property {Function} createTickerStream - 创建行情WebSocket流
 * @property {Function} createKlineStream - 创建K线WebSocket流
 * @property {Function} formatMarket - 格式化交易对
 * @property {Object} timeframes - 支持的时间周期映射
 */

/**
 * K线数据结构
 * @typedef {Object} Kline
 * @property {number} timestamp - 时间戳
 * @property {number} open - 开盘价
 * @property {number} high - 最高价
 * @property {number} low - 最低价
 * @property {number} close - 收盘价
 * @property {number} volume - 交易量
 */

/**
 * 订单簿数据结构
 * @typedef {Object} Orderbook
 * @property {Array<[number, number]>} bids - 买单列表 [价格, 数量]
 * @property {Array<[number, number]>} asks - 卖单列表 [价格, 数量]
 * @property {number} timestamp - 时间戳
 */

/**
 * 行情数据结构
 * @typedef {Object} Ticker
 * @property {string} symbol - 交易对
 * @property {number} lastPrice - 最新价格
 * @property {number} priceChange - 价格变化
 * @property {number} priceChangePercent - 价格变化百分比
 * @property {number} volume - 24小时交易量
 * @property {number} high - 24小时最高价
 * @property {number} low - 24小时最低价
 */

export const TIMEFRAMES = {
  "1m": "1分钟",
  "5m": "5分钟",
  "15m": "15分钟",
  "1h": "1小时",
  "4h": "4小时",
  "1d": "1天",
};
