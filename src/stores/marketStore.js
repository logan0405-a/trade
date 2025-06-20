// src/stores/marketStore.js
import { create } from "zustand";

// WebSocket 连接状态枚举
export const WebSocketStatus = {
  CONNECTING: "connecting",
  OPEN: "open",
  CLOSING: "closing",
  CLOSED: "closed",
  ERROR: "error",
};

/**
 * 市场数据状态管理
 */
const useMarketStore = create((set) => ({
  // 交易所和交易对设置
  exchangeId: "binance",
  currentMarket: "BTC/USDT",
  availableMarkets: ["BTC/USDT", "ETH/USDT", "SOL/USDT"],

  // 交易对详细信息
  marketDetails: [
    {
      symbol: "BTC/USDT",
      baseAsset: "BTC",
      quoteAsset: "USDT",
      name: "Bitcoin",
    },
    {
      symbol: "ETH/USDT",
      baseAsset: "ETH",
      quoteAsset: "USDT",
      name: "Ethereum",
    },
    {
      symbol: "SOL/USDT",
      baseAsset: "SOL",
      quoteAsset: "USDT",
      name: "Solana",
    },
  ],

  // 行情数据
  ticker: null,

  // 订单簿数据
  orderbook: {
    bids: [],
    asks: [],
    timestamp: null,
  },

  // K线数据
  klines: {
    data: [],
    timeframe: "1m",
    loading: false,
    error: null,
  },

  // WebSocket 连接状态
  connectionStatus: {
    ticker: WebSocketStatus.CLOSED,
    orderbook: WebSocketStatus.CLOSED,
    klines: WebSocketStatus.CLOSED,
  },

  // 更新交易所
  setExchangeId: (exchangeId) => set({ exchangeId }),

  // 更新当前交易对
  setCurrentMarket: (market) => set({ currentMarket: market }),

  // 更新可用交易对列表
  setAvailableMarkets: (markets) => set({ availableMarkets: markets }),

  // 更新交易对详细信息
  setMarketDetails: (details) => set({ marketDetails: details }),

  // 更新行情数据
  setTicker: (ticker) => set({ ticker }),

  // 更新订单簿数据
  setOrderbook: (orderbook) => set({ orderbook }),

  // 更新K线数据
  setKlines: (klines) =>
    set((state) => ({
      klines: { ...state.klines, ...klines },
    })),

  // 更新WebSocket连接状态
  setConnectionStatus: (service, status) =>
    set((state) => ({
      connectionStatus: {
        ...state.connectionStatus,
        [service]: status,
      },
    })),

  // 重置市场数据
  resetMarketData: () =>
    set({
      ticker: null,
      orderbook: {
        bids: [],
        asks: [],
        timestamp: null,
      },
      klines: {
        data: [],
        timeframe: "1m",
        loading: false,
        error: null,
      },
      connectionStatus: {
        ticker: WebSocketStatus.CLOSED,
        orderbook: WebSocketStatus.CLOSED,
        klines: WebSocketStatus.CLOSED,
      },
    }),
}));

export default useMarketStore;
