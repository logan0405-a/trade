// src/components/SentryTester.jsx
import React from "react";
import { Box, Button, Typography, Stack } from "@mui/material";
import {
  captureError,
  captureMessage,
  startTransaction,
  addBreadcrumb,
} from "../utils/sentry";

const SentryTester = () => {
  // 测试错误捕获
  const testErrorCapture = () => {
    try {
      // 故意制造一个错误
      throw new Error("This is a test error for Sentry");
    } catch (error) {
      // 捕获错误并上报到 Sentry
      captureError(error, {
        source: "SentryTester",
        action: "testErrorCapture",
        userId: "test-user-123",
      });

      // 显示提示（实际应用中可以使用通知系统）
      alert("Test error captured and sent to Sentry!");
    }
  };

  // 测试消息捕获
  const testMessageCapture = () => {
    // 添加面包屑
    addBreadcrumb("test", "User initiated message test");

    // 发送消息到 Sentry
    captureMessage("This is a test message from the application", "info", {
      source: "SentryTester",
      action: "testMessageCapture",
    });

    alert("Test message sent to Sentry!");
  };

  // 测试未捕获的错误
  const testUncaughtError = () => {
    // 这将触发未捕获的错误
    setTimeout(() => {
      // 故意访问 null 对象的属性
      const obj = null;
      obj.nonExistentMethod();
    }, 100);
  };

  // 测试性能监控
  const testPerformanceMonitoring = () => {
    // 开始一个事务
    const transaction = startTransaction("test_transaction", "test");

    // 添加面包屑
    addBreadcrumb("performance", "Starting performance test");

    // 模拟一些耗时操作
    setTimeout(() => {
      // 设置一些事务数据
      transaction.setTag("test_type", "timeout");
      transaction.setData("duration_ms", 1500);

      // 结束事务
      transaction.finish();

      alert("Performance transaction completed and sent to Sentry!");
    }, 1500);
  };

  return (
    <Box
      sx={{
        p: 3,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        mb: 2,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Sentry Integration Tester
      </Typography>

      <Stack spacing={2} direction={{ xs: "column", sm: "row" }} sx={{ mt: 2 }}>
        <Button variant="contained" color="primary" onClick={testErrorCapture}>
          Test Error Capture
        </Button>

        <Button
          variant="contained"
          color="secondary"
          onClick={testMessageCapture}
        >
          Test Message Capture
        </Button>

        <Button variant="contained" color="error" onClick={testUncaughtError}>
          Test Uncaught Error
        </Button>

        <Button
          variant="contained"
          color="success"
          onClick={testPerformanceMonitoring}
        >
          Test Performance
        </Button>
      </Stack>

      <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
        Note: These tests will only send data to Sentry in production builds. In
        development, they will log to the console instead.
      </Typography>
    </Box>
  );
};

export default SentryTester;
