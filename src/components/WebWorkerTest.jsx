// src/components/WebWorkerTest.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material";
import marketDataService from "../services/marketDataService";

const WebWorkerTest = () => {
  const [status, setStatus] = useState("initializing");
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [market, setMarket] = useState("BTC/USDT");
  const [workerStatus, setWorkerStatus] = useState({
    market: false,
    ticker: false,
    orderbook: false,
    klines: false,
  });
  const [processedData, setProcessedData] = useState({
    ticker: null,
    orderbook: null,
    klines: null,
  });

  // 添加日志
  const addLog = (message) => {
    setLogs((prev) =>
      [
        ...prev,
        {
          time: new Date().toISOString().split("T")[1].split(".")[0],
          message,
        },
      ].slice(-20),
    ); // 只保留最近20条
  };

  useEffect(() => {
    // 初始化服务
    const initService = async () => {
      try {
        const success = marketDataService.initialize();
        if (success) {
          setStatus("initialized");
          addLog("Market service initialized");

          // 检查 Worker 状态
          setTimeout(async () => {
            const status = await marketDataService.checkWorkersStatus();
            if (status.error) {
              addLog(`Worker status check error: ${status.error}`);
            } else {
              setWorkerStatus(status);
              addLog(`Workers status updated: ${JSON.stringify(status)}`);
            }
          }, 1000);
        } else {
          setStatus("error");
          addLog("Failed to initialize market service");
        }
      } catch (error) {
        setStatus("error");
        addLog(`Error: ${error.message}`);
        console.error("Failed to initialize market service:", error);
      }
    };

    initService();

    // 添加连接状态监听器
    const unsubConnectionStatus = marketDataService.addListener(
      "connectionStatus",
      (data) => {
        if (data.workers === "ready") {
          setWorkerStatus(data.status);
          addLog(`All workers are ready: ${JSON.stringify(data.status)}`);
        } else {
          addLog(`Connection status update: ${JSON.stringify(data)}`);
        }
      },
    );

    // 添加处理后数据监听器
    const unsubProcessedData = marketDataService.addListener(
      "processedData",
      (data) => {
        // 更新最新处理后的数据
        setProcessedData((prev) => ({
          ...prev,
          [data.type]: data.data,
        }));

        addLog(`Received processed ${data.type} data`);
      },
    );

    // 清理函数
    return () => {
      unsubConnectionStatus();
      unsubProcessedData();
      marketDataService.terminate();
    };
  }, []);

  // 连接到市场
  const connectToMarket = async () => {
    try {
      addLog(`Connecting to ${market}...`);
      const success = await marketDataService.connectToMarket(market);
      if (success) {
        setIsConnected(true);
        addLog(`Connected to ${market}`);
      } else {
        addLog(`Failed to connect to ${market}`);
      }
    } catch (error) {
      addLog(`Connection error: ${error.message}`);
    }
  };

  // 渲染处理后的数据摘要
  const renderProcessedDataSummary = () => {
    if (
      !processedData.ticker &&
      !processedData.orderbook &&
      !processedData.klines
    ) {
      return (
        <Typography color="text.secondary">No processed data yet</Typography>
      );
    }

    return (
      <List dense>
        {processedData.ticker && (
          <ListItem>
            <ListItemText
              primary="Ticker"
              secondary={`Last price: ${processedData.ticker.lastPrice}, Change: ${processedData.ticker.percentageChange}%`}
            />
          </ListItem>
        )}

        {processedData.orderbook && (
          <ListItem>
            <ListItemText
              primary="Orderbook"
              secondary={`Bids: ${processedData.orderbook.bids?.length || 0}, 
                          Asks: ${processedData.orderbook.asks?.length || 0}, 
                          Spread: ${processedData.orderbook.spread?.toFixed(2) || "N/A"}`}
            />
          </ListItem>
        )}

        {processedData.klines && (
          <ListItem>
            <ListItemText
              primary="Klines"
              secondary={`Last close: ${processedData.klines.close?.toFixed(2) || "N/A"}, 
                          Volume: ${processedData.klines.volume?.toFixed(2) || "N/A"}`}
            />
          </ListItem>
        )}
      </List>
    );
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: "auto", mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Multi-Worker Architecture Test
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mr: 2 }}>
          Status:
        </Typography>
        {status === "initializing" && (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography>Initializing...</Typography>
          </Box>
        )}
        {status === "initialized" && (
          <Typography color="success.main">Ready</Typography>
        )}
        {status === "error" && (
          <Typography color="error.main">Error</Typography>
        )}
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Worker Status:
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            label="Market"
            color={workerStatus.market ? "success" : "default"}
            variant="outlined"
          />
          <Chip
            label="Ticker"
            color={workerStatus.ticker ? "success" : "default"}
            variant="outlined"
          />
          <Chip
            label="Orderbook"
            color={workerStatus.orderbook ? "success" : "default"}
            variant="outlined"
          />
          <Chip
            label="Klines"
            color={workerStatus.klines ? "success" : "default"}
            variant="outlined"
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          disabled={status !== "initialized" || isConnected}
          onClick={connectToMarket}
          sx={{ mr: 2 }}
        >
          Connect to {market}
        </Button>

        {isConnected && (
          <Typography color="success.main">Connected to {market}</Typography>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" gutterBottom>
        Processed Data
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        {renderProcessedDataSummary()}
      </Paper>

      <Typography variant="h6" gutterBottom>
        Activity Log
      </Typography>

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          maxHeight: 300,
          overflow: "auto",
          bgcolor: "background.default",
          fontFamily: "monospace",
          fontSize: 14,
        }}
      >
        {logs.length === 0 ? (
          <Typography color="text.secondary">No activity yet</Typography>
        ) : (
          logs.map((log, index) => (
            <Box key={index} sx={{ mb: 0.5 }}>
              <Typography component="span" color="primary" sx={{ mr: 1 }}>
                [{log.time}]
              </Typography>
              <Typography component="span">{log.message}</Typography>
            </Box>
          ))
        )}
      </Paper>
    </Paper>
  );
};

export default WebWorkerTest;
