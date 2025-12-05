import {
  ChromeStorageStrategy,
  CombinedStorageStrategy,
} from "@browser-tools/core";
/* eslint-env browser */

/**
 * 合并两个已删除项目的逻辑
 */
function mergeBothDeleted(localItem, remoteItem, now) {
  const localDeletedAt = localItem.deletedAt || 0;
  const remoteDeletedAt = remoteItem.deletedAt || 0;
  return remoteDeletedAt > localDeletedAt
    ? { ...remoteItem, updatedAt: now }
    : { ...localItem, updatedAt: now };
}

/**
 * 合并本地删除、远程未删除的逻辑
 */
function mergeLocalDeleted(localItem, remoteItem, now) {
  const localDeletedAt = localItem.deletedAt || 0;
  const remoteUpdatedAt = remoteItem.updatedAt || 0;
  if (remoteUpdatedAt > localDeletedAt) {
    // 远程更新比本地删除新，恢复项目
    return {
      ...remoteItem,
      deleted: false,
      deletedAt: undefined,
      updatedAt: now,
    };
  }
  // 保留删除状态
  return { ...localItem, updatedAt: now };
}

/**
 * 合并远程删除、本地未删除的逻辑
 */
function mergeRemoteDeleted(localItem, remoteItem, now) {
  const remoteDeletedAt = remoteItem.deletedAt || 0;
  const localUpdatedAt = localItem.updatedAt || 0;
  if (localUpdatedAt > remoteDeletedAt) {
    // 本地更新比远程删除新，保留项目
    return { ...localItem, updatedAt: now };
  }
  // 应用删除状态
  return { ...remoteItem, updatedAt: now };
}

/**
 * 合并两端都未删除的逻辑
 */
function mergeBothActive(localItem, remoteItem, now) {
  // 比较内容（排除时间戳和删除标记）
  const localContent = JSON.stringify({
    ...localItem,
    updatedAt: undefined,
    deleted: undefined,
    deletedAt: undefined,
  });
  const remoteContent = JSON.stringify({
    ...remoteItem,
    updatedAt: undefined,
    deleted: undefined,
    deletedAt: undefined,
  });

  if (localContent !== remoteContent) {
    // 内容不同，比较时间戳
    const localTime = localItem.updatedAt || 0;
    const remoteTime = remoteItem.updatedAt || 0;
    return remoteTime > localTime
      ? { ...remoteItem, updatedAt: now }
      : { ...localItem, updatedAt: now };
  }
  // 内容相同，保留本地版本
  return { ...localItem, updatedAt: now };
}

/**
 * 通用合并函数：合并使用软删除策略的数据数组
 */
function mergeSoftDeletedItems(local, remote, now) {
  const mergedMap = new Map();

  // 先添加本地数据（包括已删除的）
  local.forEach((item) => {
    mergedMap.set(item.id, {
      ...item,
      updatedAt: item.updatedAt || now,
    });
  });

  // 合并远程数据
  remote.forEach((item) => {
    const localItem = mergedMap.get(item.id);

    if (!localItem) {
      // 本地没有，直接添加（包括已删除的）
      mergedMap.set(item.id, {
        ...item,
        updatedAt: item.updatedAt || now,
      });
    } else {
      // 两端都有，需要合并
      const localDeleted = localItem.deleted === true;
      const remoteDeleted = item.deleted === true;

      let mergedItem;
      if (localDeleted && remoteDeleted) {
        mergedItem = mergeBothDeleted(localItem, item, now);
      } else if (localDeleted && !remoteDeleted) {
        mergedItem = mergeLocalDeleted(localItem, item, now);
      } else if (!localDeleted && remoteDeleted) {
        mergedItem = mergeRemoteDeleted(localItem, item, now);
      } else {
        mergedItem = mergeBothActive(localItem, item, now);
      }

      mergedMap.set(item.id, mergedItem);
    }
  });

  return Array.from(mergedMap.values());
}

/**
 * 存储管理器
 */
class StorageManager {
  constructor() {
    this.strategy = new CombinedStorageStrategy();
    this.configKey = "storage_config";
  }

  /**
   * 初始化存储策略
   */
  async init() {
    const config = await this.getStorageConfig();

    if (config && config.enableGithub && config.token) {
      this.strategy.setGithubGist(config.token, config.gistId || null);
    } else {
      this.strategy.setGithubGist(null);
    }
  }

  /**
   * 获取存储配置
   */
  async getStorageConfig() {
    const chromeStorage = new ChromeStorageStrategy();
    return await chromeStorage.get(this.configKey);
  }

  /**
   * 设置存储配置
   */
  async setStorageConfig(config) {
    const chromeStorage = new ChromeStorageStrategy();
    await chromeStorage.set(this.configKey, config);
    await this.init(); // 重新初始化策略
  }

  /**
   * 获取数据
   */
  async get(key) {
    return await this.strategy.get(key);
  }

  /**
   * 设置数据
   */
  async set(key, value) {
    return await this.strategy.set(key, value);
  }

  /**
   * 删除数据
   */
  async remove(key) {
    return await this.strategy.remove(key);
  }

  /**
   * 清空数据
   */
  async clear() {
    return await this.strategy.clear();
  }

  /**
   * 手动触发同步到 GitHub Gist（用于测试或立即同步）
   */
  async syncToGithub() {
    if (this.strategy.githubGist) {
      await this.strategy.flushSyncQueue();
    }
  }

  /**
   * 从 GitHub Gist 同步数据并合并
   */
  async syncFromGithub() {
    if (!this.strategy.githubGist) {
      throw new Error("GitHub Gist 未启用，请先在设置中启用");
    }

    console.log("[Storage] 开始从 GitHub Gist 同步数据");
    const now = Date.now();

    try {
      // 从 GitHub Gist 获取数据
      const remoteShortcuts = await this.strategy.githubGist.get("shortcuts");
      const remoteTodos = await this.strategy.githubGist.get("todos");
      const remoteLogs = await this.strategy.githubGist.get("operation_logs");

      // 获取本地数据
      const localShortcuts = (await this.get("shortcuts")) || [];
      const localTodos = (await this.get("todos")) || [];
      const localLogs = (await this.get("operation_logs")) || [];

      // 合并快捷方式
      const mergedShortcuts = mergeSoftDeletedItems(
        localShortcuts,
        remoteShortcuts || [],
        now
      );

      // 合并待办事项
      const mergedTodos = mergeSoftDeletedItems(
        localTodos,
        remoteTodos || [],
        now
      );

      // 合并操作日志
      const mergedLogs = this.mergeOperationLogs(localLogs, remoteLogs || []);

      // 保存合并后的数据
      await this.set("shortcuts", mergedShortcuts);
      await this.set("todos", mergedTodos);
      await this.set("operation_logs", mergedLogs);

      console.log("[Storage] 同步完成");
      console.log(
        "[Storage] 快捷方式: 本地",
        localShortcuts.length,
        "远程",
        remoteShortcuts?.length || 0,
        "合并后",
        mergedShortcuts.length
      );
      console.log(
        "[Storage] 待办事项: 本地",
        localTodos.length,
        "远程",
        remoteTodos?.length || 0,
        "合并后",
        mergedTodos.length
      );
      console.log(
        "[Storage] 操作日志: 本地",
        localLogs.length,
        "远程",
        remoteLogs?.length || 0,
        "合并后",
        mergedLogs.length
      );

      return {
        shortcuts: {
          local: localShortcuts.length,
          remote: remoteShortcuts?.length || 0,
          merged: mergedShortcuts.length,
        },
        todos: {
          local: localTodos.length,
          remote: remoteTodos?.length || 0,
          merged: mergedTodos.length,
        },
        logs: {
          local: localLogs.length,
          remote: remoteLogs?.length || 0,
          merged: mergedLogs.length,
        },
      };
    } catch (error) {
      console.error("[Storage] 从 GitHub Gist 同步失败:", error);
      throw error;
    }
  }

  /**
   * 合并操作日志数据
   * 操作日志采用追加式合并：按时间戳排序，去重（基于id），保留最新的1000条
   */
  mergeOperationLogs(local, remote) {
    const MAX_LOG_ENTRIES = 1000;
    const logMap = new Map();

    // 先添加本地日志
    local.forEach((log) => {
      if (log.id) {
        logMap.set(log.id, log);
      }
    });

    // 添加远程日志（如果ID不存在或时间戳更新）
    remote.forEach((log) => {
      if (log.id) {
        const existingLog = logMap.get(log.id);
        if (
          !existingLog ||
          (log.timestamp && log.timestamp > (existingLog.timestamp || 0))
        ) {
          logMap.set(log.id, log);
        }
      }
    });

    // 转换为数组并按时间戳降序排序
    const mergedLogs = Array.from(logMap.values())
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, MAX_LOG_ENTRIES);

    return mergedLogs;
  }

  /**
   * 调试方法：输出所有存储数据
   */
  async debug() {
    try {
      console.group("[Storage Debug] 存储数据调试信息");

      // 获取所有存储数据
      const chromeStorage = new ChromeStorageStrategy();
      const allData = await chromeStorage.getAll();

      console.log("[Storage Debug] 所有存储的键值对:", allData);
      console.table(allData);

      // 显示存储配置
      const config = await this.getStorageConfig();
      console.log("[Storage Debug] 存储配置:", config);

      // 显示 GitHub Gist 状态
      if (this.strategy.githubGist) {
        console.log("[Storage Debug] GitHub Gist 已启用");
        console.log(
          "[Storage Debug] Gist ID:",
          this.strategy.githubGist.gistId
        );
        console.log(
          "[Storage Debug] 待同步队列大小:",
          this.strategy.syncQueue.size
        );
        if (this.strategy.syncQueue.size > 0) {
          console.log(
            "[Storage Debug] 待同步队列:",
            Array.from(this.strategy.syncQueue.entries())
          );
        }
      } else {
        console.log("[Storage Debug] GitHub Gist 未启用");
      }

      // 显示常用数据
      const shortcuts = await this.get("shortcuts");
      const todos = await this.get("todos");
      const bgSettings = await this.get("background_settings");

      console.log("[Storage Debug] 快捷方式数量:", shortcuts?.length || 0);
      console.log("[Storage Debug] 待办事项数量:", todos?.length || 0);
      console.log("[Storage Debug] 背景设置:", bgSettings);

      console.groupEnd();

      return {
        allData,
        config,
        githubGistEnabled: !!this.strategy.githubGist,
        gistId: this.strategy.githubGist?.gistId || null,
        syncQueueSize: this.strategy.syncQueue.size,
        shortcutsCount: shortcuts?.length || 0,
        todosCount: todos?.length || 0,
        bgSettings,
      };
    } catch (error) {
      console.error("[Storage Debug] 调试失败:", error);
      throw error;
    }
  }
}

// 导出单例
export const storageManager = new StorageManager();

// 在开发环境下将 storageManager 挂载到 window 对象，方便调试
if (typeof window !== "undefined") {
  window.storageManager = storageManager;
  console.log(
    "[Storage Debug] 存储管理器已挂载到 window.storageManager，可在控制台使用 storageManager.debug() 查看所有存储数据"
  );
}

// 导出策略类（用于测试或扩展）
export { StorageManager };
