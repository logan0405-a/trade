// src/services/WorkerManager.js

/**
 * Web Worker 管理服务
 * 负责创建和管理 Worker 实例及通信通道
 */
class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.channels = new Map();
    this.workerConnections = new Map();
  }

  /**
   * 创建一个新的 Worker 并建立 MessageChannel 通信
   * @param {string} name Worker 名称
   * @param {string} scriptPath Worker 脚本路径
   * @param {string} portType 端口类型（'main' 或默认）
   * @returns {Object} 包含 port 和 worker 的对象
   */
  createWorker(name, scriptPath, portType = "main") {
    // 检查是否已存在同名 Worker
    if (this.workers.has(name)) {
      console.warn(
        `Worker ${name} already exists, returning existing instance`,
      );
      return {
        port: this.channels.get(`${name}:${portType}`),
        worker: this.workers.get(name),
      };
    }

    // 创建新 Worker
    const worker = new Worker(new URL(scriptPath, import.meta.url), {
      type: "module",
    });

    // 创建 MessageChannel
    const channel = new MessageChannel();
    const mainPort = channel.port1;
    const workerPort = channel.port2;

    // 向 Worker 发送端口
    const messageType = portType === "main" ? "INIT_MAIN_PORT" : "INIT_PORT";
    worker.postMessage({ type: messageType }, [workerPort]);

    // 存储引用
    this.workers.set(name, worker);
    this.channels.set(`${name}:${portType}`, mainPort);

    console.log(`Worker ${name} created successfully with ${portType} port`);

    return {
      port: mainPort,
      worker,
    };
  }

  /**
   * 连接两个 Worker，使它们可以相互通信
   * @param {string} sourceWorkerName 源 Worker 名称
   * @param {string} targetWorkerName 目标 Worker 名称
   * @param {string} connectionType 连接类型（用于标识）
   * @returns {boolean} 是否成功连接
   */
  connectWorkers(sourceWorkerName, targetWorkerName, connectionType) {
    // 检查 Worker 是否存在
    if (
      !this.workers.has(sourceWorkerName) ||
      !this.workers.has(targetWorkerName)
    ) {
      console.error(
        `Cannot connect workers: ${sourceWorkerName} or ${targetWorkerName} not found`,
      );
      return false;
    }

    // 创建唯一连接 ID
    const connectionId = `${sourceWorkerName}-${targetWorkerName}:${connectionType}`;

    // 检查连接是否已存在
    if (this.workerConnections.has(connectionId)) {
      console.warn(`Connection ${connectionId} already exists`);
      return true;
    }

    // 获取 Worker 引用
    const sourceWorker = this.workers.get(sourceWorkerName);
    const targetWorker = this.workers.get(targetWorkerName);

    // 创建通信通道
    const channel = new MessageChannel();
    const sourcePort = channel.port1;
    const targetPort = channel.port2;

    // 将端口发送给各自的 Worker
    sourceWorker.postMessage(
      {
        type: "INIT_WORKER_PORT",
        workerType: targetWorkerName,
        port: sourcePort,
      },
      [sourcePort],
    );

    targetWorker.postMessage(
      {
        type: "INIT_PORT",
        port: targetPort,
      },
      [targetPort],
    );

    // 存储连接信息
    this.workerConnections.set(connectionId, {
      sourceWorker: sourceWorkerName,
      targetWorker: targetWorkerName,
      connectionType,
    });

    console.log(
      `Connected ${sourceWorkerName} to ${targetWorkerName} with type ${connectionType}`,
    );

    return true;
  }

  /**
   * 获取已创建的通信端口
   * @param {string} name Worker 名称
   * @param {string} portType 端口类型（'main' 或默认）
   * @returns {MessagePort|null} 通信端口
   */
  getChannel(name, portType = "main") {
    return this.channels.get(`${name}:${portType}`) || null;
  }

  /**
   * 终止 Worker 并清理资源
   * @param {string} name Worker 名称
   */
  terminateWorker(name) {
    const worker = this.workers.get(name);

    if (worker) {
      worker.terminate();
      this.workers.delete(name);
      console.log(`Worker ${name} terminated`);

      // 清理相关通道
      this.channels.forEach((value, key) => {
        if (key.startsWith(`${name}:`)) {
          const channel = this.channels.get(key);
          if (channel) channel.close();
          this.channels.delete(key);
        }
      });

      // 清理相关连接
      this.workerConnections.forEach((value, key) => {
        if (key.includes(name)) {
          this.workerConnections.delete(key);
        }
      });
    }
  }

  /**
   * 终止所有 Worker 并清理资源
   */
  terminateAll() {
    for (const name of this.workers.keys()) {
      this.terminateWorker(name);
    }
    console.log("All workers terminated");
  }
}

// 创建单例
const workerManager = new WorkerManager();
export default workerManager;
