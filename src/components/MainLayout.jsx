import React from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import Header from "./Header";
import Footer from "./Footer";
import MarketSelector from "../features/market-selector/MarketSelector";
import TradingViewChart from "../features/chart/TradingViewChart";
import Orderbook from "../features/orderbook/Orderbook";
import TradeForm from "../features/trade-form/TradeForm";
import PositionsTable from "../features/positions/PositionsTable";
import NotificationSystem from "./NotificationSystem";
import SentryTester from "./SentryTester";
const MainLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh", // 最小高度为视口高度
        width: "100%",
      }}
    >
      {/* 头部 - 固定在顶部 */}
      <Header />
      {/* Sentry 测试组件 - 仅在开发模式下显示 */}
      {/* {import.meta.env.DEV && <SentryTester />} */}
      {/* 主内容区 - 允许滚动 */}
      <Box
        sx={{
          flex: "1 0 auto", // 自动增长但不收缩
          display: "flex",
          flexDirection: "column",
          p: 1,
        }}
      >
        {/* 市场选择器 */}
        <Box sx={{ mb: 1 }}>
          <MarketSelector />
        </Box>

        {/* 中间部分 - 图表和订单区域 */}
        <Box
          sx={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            mb: 1,
            gap: 1,
          }}
        >
          {/* 图表区域 */}
          <Box
            sx={{
              flex: isMobile ? "none" : 3,
              height: isMobile ? "400px" : "500px", // 固定高度
            }}
          >
            <TradingViewChart />
          </Box>

          {/* 右侧订单簿和交易表单 */}
          <Box
            sx={{
              flex: isMobile ? "none" : 1,
              display: "flex",
              flexDirection: "column",
              height: isMobile ? "auto" : "500px", // 固定高度
              gap: 1,
            }}
          >
            <Box sx={{ flex: 1, minHeight: isMobile ? "200px" : 0 }}>
              <Orderbook />
            </Box>
            <Box sx={{ flex: 1, minHeight: isMobile ? "200px" : 0 }}>
              <TradeForm />
            </Box>
          </Box>
        </Box>

        {/* 底部持仓表格 */}
        <Box
          sx={{
            height: "250px", // 固定高度
            mb: 1,
          }}
        >
          <PositionsTable />
        </Box>
      </Box>

      <Footer />
      <NotificationSystem />
    </Box>
  );
};

export default MainLayout;
