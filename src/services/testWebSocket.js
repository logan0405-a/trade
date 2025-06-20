import marketDataService from "./marketDataService";

/**
 * 测试WebSocket连接
 * 用于控制台验证
 */
export async function testWebSocketConnection() {
  console.log("Starting WebSocket connection test...");

  try {
    // 初始化服务
    const initialized = marketDataService.initialize("binance");
    if (!initialized) {
      throw new Error("Failed to initialize market data service");
    }

    // 添加数据监听器
    marketDataService.addListener("ticker", (data) => {
      console.log("Ticker data received:", data);
    });

    marketDataService.addListener("orderbook", (data) => {
      console.log(
        "Orderbook data received:",
        `bids: ${data.bids.length}, asks: ${data.asks.length}`,
      );
    });

    marketDataService.addListener("klines", (data) => {
      console.log("Klines data received:", data);
    });

    marketDataService.addListener("connectionStatus", (status) => {
      console.log("Connection status updated:", status);
    });

    // 获取可用交易对
    const markets = await marketDataService.fetchAvailableMarkets();

    if (markets.length === 0) {
      throw new Error("No available markets found");
    }

    // 使用第一个交易对测试连接
    const testMarket = markets[0];
    console.log(`Testing WebSocket connection with ${testMarket}`);

    // 连接到测试市场
    await marketDataService.connectToMarket(testMarket);

    console.log(
      "WebSocket connections established. Check console for incoming data...",
    );

    // 30秒后自动断开连接
    setTimeout(() => {
      console.log("Test complete, closing connections...");
      marketDataService.closeAllConnections();
    }, 30000);

    return true;
  } catch (error) {
    console.error("WebSocket test failed:", error);
    return false;
  }
}

// 可以直接调用测试
testWebSocketConnection();
