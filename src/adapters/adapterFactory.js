import { BinanceAdapter } from "./binanceAdapter";
import { captureError } from "../utils/sentry";

// 支持的交易所列表
const SUPPORTED_EXCHANGES = {
  binance: BinanceAdapter,
};

/**
 * 交易所适配器工厂
 */
class ExchangeAdapterFactory {
  constructor() {
    this.adapters = new Map();
  }

  /**
   * 获取交易所适配器实例
   * @param {string} exchangeId - 交易所ID
   * @returns {ExchangeAdapter} 交易所适配器实例
   */
  getAdapter(exchangeId) {
    // 如果适配器已存在，直接返回
    if (this.adapters.has(exchangeId)) {
      return this.adapters.get(exchangeId);
    }

    // 检查是否支持该交易所
    const AdapterClass = SUPPORTED_EXCHANGES[exchangeId];
    if (!AdapterClass) {
      const error = new Error(`Unsupported exchange: ${exchangeId}`);
      captureError(error, {
        component: "AdapterFactory",
        action: "getAdapter",
      });
      throw error;
    }

    // 创建新的适配器实例
    try {
      const adapter = new AdapterClass();
      this.adapters.set(exchangeId, adapter);
      return adapter;
    } catch (error) {
      captureError(error, {
        component: "AdapterFactory",
        action: "createAdapter",
        exchange: exchangeId,
      });
      throw error;
    }
  }

  /**
   * 获取支持的交易所列表
   * @returns {Array<string>} 交易所ID列表
   */
  getSupportedExchanges() {
    return Object.keys(SUPPORTED_EXCHANGES);
  }
}

// 创建单例实例
const adapterFactory = new ExchangeAdapterFactory();

export default adapterFactory;
