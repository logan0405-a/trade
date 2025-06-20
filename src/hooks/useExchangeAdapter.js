import { useState, useEffect } from "react";
import adapterFactory from "../adapters/adapterFactory";
import { captureError } from "../utils/sentry";

/**
 * 使用交易所适配器的 Hook
 * @param {string} exchangeId - 交易所ID，默认为binance
 * @returns {Object} 包含适配器和状态的对象
 */
export const useExchangeAdapter = (exchangeId = "binance") => {
  const [adapter, setAdapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAdapter = async () => {
      try {
        setLoading(true);
        setError(null);

        // 获取适配器实例
        const exchangeAdapter = adapterFactory.getAdapter(exchangeId);
        setAdapter(exchangeAdapter);
      } catch (err) {
        setError(err.message);
        captureError(err, {
          component: "useExchangeAdapter",
          action: "initAdapter",
          exchange: exchangeId,
        });
      } finally {
        setLoading(false);
      }
    };

    initAdapter();
  }, [exchangeId]);

  return { adapter, loading, error };
};
