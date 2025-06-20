// src/hooks/useWebSocket.js
import { useState, useEffect, useRef, useCallback } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";

/**
 * WebSocket 连接状态枚举
 */
export const WebSocketStatus = {
  CONNECTING: "connecting",
  OPEN: "open",
  CLOSING: "closing",
  CLOSED: "closed",
  ERROR: "error",
};

/**
 * WebSocket 连接钩子
 * 提供WebSocket连接管理功能
 *
 * @param {string} url - WebSocket URL
 * @param {Object} options - 配置选项
 * @param {Function} options.onMessage - 消息处理函数
 * @param {Function} options.onError - 错误处理函数
 * @param {boolean} options.autoConnect - 是否自动连接
 * @param {boolean} options.reconnect - 是否自动重连
 * @param {number} options.reconnectInterval - 重连间隔(毫秒)
 * @param {number} options.maxReconnectAttempts - 最大重连尝试次数
 * @returns {Object} WebSocket状态和控制方法
 */
const useWebSocket = (url, options = {}) => {
  const {
    onMessage,
    onError,
    autoConnect = true,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    protocols = [],
  } = options;

  const [status, setStatus] = useState(WebSocketStatus.CLOSED);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  /**
   * 建立WebSocket连接
   */
  const connect = useCallback(() => {
    // 如果已经连接，直接返回
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // 更新状态
      setStatus(WebSocketStatus.CONNECTING);

      // 创建WebSocket连接
      const wsOptions = {
        connectionTimeout: 4000,
        maxRetries: maxReconnectAttempts,
        maxReconnectionDelay: 10000,
        minReconnectionDelay: reconnectInterval,
      };

      wsRef.current = new ReconnectingWebSocket(url, protocols, wsOptions);

      // 连接打开事件
      wsRef.current.onopen = () => {
        console.log(`[useWebSocket] Connected to ${url}`);
        setStatus(WebSocketStatus.OPEN);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      // 消息接收事件
      wsRef.current.onmessage = (event) => {
        let parsedData;
        try {
          parsedData = JSON.parse(event.data);
        } catch (e) {
          parsedData = event.data;
        }

        setLastMessage(parsedData);

        if (onMessage) {
          onMessage(parsedData);
        }
      };

      // 错误事件
      wsRef.current.onerror = (event) => {
        console.error(`[useWebSocket] Error for ${url}:`, event);
        setStatus(WebSocketStatus.ERROR);
        setError(event);

        if (onError) {
          onError(event);
        }
      };

      // 连接关闭事件
      wsRef.current.onclose = (event) => {
        console.log(
          `[useWebSocket] Closed for ${url}:`,
          event.code,
          event.reason,
        );
        setStatus(WebSocketStatus.CLOSED);

        if (event.code !== 1000) {
          // 非正常关闭
          reconnectAttemptsRef.current += 1;

          if (
            !reconnect ||
            reconnectAttemptsRef.current >= maxReconnectAttempts
          ) {
            console.log(
              `[useWebSocket] Max reconnect attempts reached (${maxReconnectAttempts})`,
            );
          }
        }
      };
    } catch (err) {
      console.error(
        `[useWebSocket] Failed to create connection to ${url}:`,
        err,
      );
      setStatus(WebSocketStatus.ERROR);
      setError(err);

      if (onError) {
        onError(err);
      }
    }
  }, [
    url,
    onMessage,
    onError,
    reconnect,
    reconnectInterval,
    maxReconnectAttempts,
    protocols,
  ]);

  /**
   * 关闭WebSocket连接
   */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      console.log(`[useWebSocket] Disconnecting from ${url}`);
      setStatus(WebSocketStatus.CLOSING);
      wsRef.current.close(1000, "User initiated disconnect");
      wsRef.current = null;
    }
  }, [url]);

  /**
   * 发送消息
   * @param {any} data - 要发送的数据
   * @returns {boolean} - 是否发送成功
   */
  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === "string" ? data : JSON.stringify(data);
      wsRef.current.send(message);
      return true;
    }
    console.warn("[useWebSocket] Cannot send message, connection not open");
    return false;
  }, []);

  /**
   * 重新连接
   */
  const reconnectNow = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // 组件挂载时自动连接
  useEffect(() => {
    if (url && autoConnect) {
      connect();
    }

    // 组件卸载时断开连接
    return () => {
      if (wsRef.current) {
        disconnect();
      }
    };
  }, [url, autoConnect, connect, disconnect]);

  return {
    // 状态
    status,
    lastMessage,
    error,

    // 控制方法
    send,
    connect,
    disconnect,
    reconnect: reconnectNow,

    // 状态判断辅助方法
    isConnecting: status === WebSocketStatus.CONNECTING,
    isConnected: status === WebSocketStatus.OPEN,
    isClosing: status === WebSocketStatus.CLOSING,
    isClosed: status === WebSocketStatus.CLOSED,
    isError: status === WebSocketStatus.ERROR,
  };
};

export default useWebSocket;
