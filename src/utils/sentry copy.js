import * as Sentry from "@sentry/react";

// 从环境变量获取 DSN，如果不存在则使用默认值
const SENTRY_DSN =
  import.meta.env.VITE_SENTRY_DSN ||
  "https://08472d101615aa3d32c0b1cf1b60325a@o4509524324122624.ingest.us.sentry.io/4509524325367808";

// 初始化 Sentry
export const initSentry = () => {
  if (import.meta.env.PROD) {
    Sentry.init({
      // 使用环境变量中的 DSN
      dsn: SENTRY_DSN,

      // 集成浏览器性能跟踪
      integrations: [
        Sentry.browserTracingIntegration(),
        // 会话回放功能
        Sentry.replayIntegration({
          maskAllText: false,
          maskAllInputs: true,
        }),
      ],

      // 发送默认的 PII 数据
      sendDefaultPii: true,

      // 性能监控采样率 (0.2 = 20%)
      tracesSampleRate: 0.2,

      // 会话回放采样率
      replaysSessionSampleRate: 0.1, // 10% 的正常会话
      replaysOnErrorSampleRate: 1.0, // 100% 的错误会话

      // 环境标记
      environment: import.meta.env.MODE,

      // 启用性能追踪
      enableTracing: true,

      // 设置最大广度
      maxBreadcrumbs: 50,

      // 捕获未处理的承诺拒绝
      attachStacktrace: true,

      // 处理未捕获的错误
      autoSessionTracking: true,
    });

    // 添加全局标签
    Sentry.setTags({
      app: "crypto-trading-platform",
      version: import.meta.env.VITE_APP_VERSION || "dev",
    });
  }
};

// 自定义错误捕获函数
export const captureError = (error, context = {}) => {
  if (import.meta.env.PROD) {
    Sentry.withScope((scope) => {
      // 添加额外的上下文标签
      for (const key in context) {
        scope.setTag(key, context[key]);
      }

      // 可以添加额外的数据
      scope.setExtra("capturedAt", new Date().toISOString());

      // 捕获异常
      Sentry.captureException(error);
    });
  } else {
    // 开发环境下记录到控制台
    console.error("Error captured:", error, context);
  }
};

// 自定义消息上报
export const captureMessage = (message, level = "info", context = {}) => {
  if (import.meta.env.PROD) {
    Sentry.withScope((scope) => {
      // 设置消息级别
      scope.setLevel(level);

      // 添加额外的上下文标签
      for (const key in context) {
        scope.setTag(key, context[key]);
      }

      // 捕获消息
      Sentry.captureMessage(message);
    });
  } else {
    // 开发环境下记录到控制台
    console.log(`${level}: ${message}`, context);
  }
};

// 性能监控
export const startTransaction = (name, op) => {
  if (import.meta.env.PROD) {
    const transaction = Sentry.startTransaction({
      name,
      op,
    });

    // 设置当前事务
    Sentry.getCurrentHub().configureScope((scope) => {
      scope.setSpan(transaction);
    });

    return transaction;
  }

  // 开发环境下返回一个模拟对象
  return {
    finish: () => console.log(`Transaction finished: ${name} (${op})`),
    setTag: () => {},
    setData: () => {},
  };
};

// 添加面包屑
export const addBreadcrumb = (category, message, data = {}, level = "info") => {
  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      category,
      message,
      data,
      level,
    });
  } else {
    console.log(`Breadcrumb: [${category}] ${message}`, data);
  }
};

// 设置用户上下文
export const setUserContext = (user) => {
  if (user && import.meta.env.PROD) {
    Sentry.setUser(user);
  }
};

// 清除用户上下文
export const clearUserContext = () => {
  if (import.meta.env.PROD) {
    Sentry.setUser(null);
  }
};

// 错误边界组件
export const ErrorBoundary = Sentry.ErrorBoundary;

// 导出额外的 Sentry 功能以供直接使用
export { Sentry };
