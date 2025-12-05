/**
 * 防抖函数
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
/**
 * Chrome Storage API 操作辅助函数
 */
function chromeStorageOperation(operation, arg) {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      const callback = (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      };

      switch (operation) {
        case "get":
          chrome.storage.local.get(arg, callback);
          break;
        case "getAll":
          chrome.storage.local.get(null, callback);
          break;
        case "set":
          chrome.storage.local.set(arg, callback);
          break;
        case "remove":
          chrome.storage.local.remove(arg, callback);
          break;
        case "clear":
          chrome.storage.local.clear(callback);
          break;
        default:
          reject(new Error(`Unknown operation: ${operation}`));
      }
    } else {
      // 降级到 localStorage
      try {
        let result;
        switch (operation) {
          case "get": {
            const keys = arg;
            result = {};
            keys.forEach((key) => {
              const value = localStorage.getItem(key);
              result[key] = value ? JSON.parse(value) : null;
            });
            break;
          }
          case "getAll": {
            result = {};
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key) {
                try {
                  result[key] = JSON.parse(localStorage.getItem(key));
                } catch {
                  result[key] = localStorage.getItem(key);
                }
              }
            }
            break;
          }
          case "set": {
            const data = arg;
            Object.entries(data).forEach(([k, v]) => {
              localStorage.setItem(k, JSON.stringify(v));
            });
            result = undefined;
            break;
          }
          case "remove": {
            const keys = arg;
            keys.forEach((k) => localStorage.removeItem(k));
            result = undefined;
            break;
          }
          case "clear":
            localStorage.clear();
            result = undefined;
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  });
}

/**
 * GitHub Gist API 请求辅助函数
 */
async function gistApiRequest(url, options = {}) {
  const { token, method = "GET", body } = options;
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    ...(body && { "Content-Type": "application/json" }),
  };

  const response = await fetch(url, {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 存储策略抽象接口
 */
class StorageStrategy {
  // eslint-disable-next-line no-unused-vars
  async get(_key) {
    throw new Error("get method must be implemented");
  }

  // eslint-disable-next-line no-unused-vars
  async set(_key, _value) {
    throw new Error("set method must be implemented");
  }

  // eslint-disable-next-line no-unused-vars
  async remove(_key) {
    throw new Error("remove method must be implemented");
  }

  async clear() {
    throw new Error("clear method must be implemented");
  }
}

/**
 * Chrome Storage 存储策略
 */
class ChromeStorageStrategy extends StorageStrategy {
  async get(key) {
    const result = await chromeStorageOperation("get", [key]);
    return result[key] || null;
  }

  async set(key, value) {
    await chromeStorageOperation("set", { [key]: value });
  }

  async remove(key) {
    await chromeStorageOperation("remove", [key]);
  }

  async clear() {
    await chromeStorageOperation("clear");
  }

  /**
   * 获取所有存储的键值对
   */
  async getAll() {
    const result = await chromeStorageOperation("getAll");
    return result || {};
  }
}

/**
 * GitHub Gist 存储策略
 */
class GitHubGistStrategy extends StorageStrategy {
  constructor(token, gistId = null) {
    super();
    this.token = token;
    this.gistId = gistId;
    this.baseUrl = "https://api.github.com/gists";
  }

  async get(key) {
    if (!this.gistId) {
      return null;
    }

    try {
      const gist = await gistApiRequest(`${this.baseUrl}/${this.gistId}`, {
        token: this.token,
      });
      const file = gist.files[key] || gist.files["data.json"];

      if (!file) {
        return null;
      }

      return JSON.parse(file.content);
    } catch (error) {
      console.error("[Storage] GitHub Gist get error:", error);
      return null; // 失败时返回 null，不影响主存储
    }
  }

  async set(key, value) {
    if (!this.token) {
      return null;
    }

    try {
      const content = JSON.stringify(value, null, 2);
      const files = { [key]: { content } };

      if (this.gistId) {
        // 更新现有 gist
        const gist = await gistApiRequest(`${this.baseUrl}/${this.gistId}`, {
          token: this.token,
          method: "PATCH",
          body: { files },
        });
        this.gistId = gist.id;
      } else {
        // 创建新 gist
        const gist = await gistApiRequest(this.baseUrl, {
          token: this.token,
          method: "POST",
          body: {
            description: "WebTab shortcuts storage",
            public: false,
            files,
          },
        });
        this.gistId = gist.id;
      }

      return this.gistId;
    } catch (error) {
      console.error("[Storage] GitHub Gist set error:", error);
      // 不抛出错误，只记录日志，不影响主存储
      return null;
    }
  }

  async remove(key) {
    if (!this.gistId || !this.token) {
      return;
    }

    try {
      await gistApiRequest(`${this.baseUrl}/${this.gistId}`, {
        token: this.token,
        method: "PATCH",
        body: {
          files: { [key]: null },
        },
      });
    } catch (error) {
      console.error("[Storage] GitHub Gist remove error:", error);
      // 不抛出错误，只记录日志
    }
  }

  async clear() {
    if (!this.gistId || !this.token) {
      return;
    }

    try {
      await gistApiRequest(`${this.baseUrl}/${this.gistId}`, {
        token: this.token,
        method: "PATCH",
        body: {
          files: {},
        },
      });
    } catch (error) {
      console.error("[Storage] GitHub Gist clear error:", error);
      // 不抛出错误，只记录日志
    }
  }
}

/**
 * 组合存储策略：Chrome Storage（主存储）+ GitHub Gist（可选备份）
 */
class CombinedStorageStrategy extends StorageStrategy {
  constructor() {
    super();
    this.chromeStorage = new ChromeStorageStrategy();
    this.githubGist = null;
    this.syncQueue = new Map(); // 待同步队列
    this.syncDebounced = debounce(() => this.flushSyncQueue(), 2000); // 2秒防抖
  }

  /**
   * 设置 GitHub Gist 配置
   */
  setGithubGist(token, gistId = null) {
    if (token) {
      this.githubGist = new GitHubGistStrategy(token, gistId);
    } else {
      this.githubGist = null;
    }
  }

  /**
   * 刷新同步队列
   */
  async flushSyncQueue() {
    if (!this.githubGist || this.syncQueue.size === 0) {
      return;
    }

    const operations = Array.from(this.syncQueue.entries());
    this.syncQueue.clear();

    console.log(
      "[Storage] 开始同步到 GitHub Gist，队列大小:",
      operations.length
    );
    for (const [, { operation, key, value }] of operations) {
      try {
        if (operation === "set") {
          console.log(`[Storage] 同步 ${key} 到 GitHub Gist`);
          await this.githubGist.set(key, value);
          console.log(`[Storage] ${key} 同步成功`);
        } else if (operation === "remove") {
          console.log(`[Storage] 从 GitHub Gist 删除 ${key}`);
          await this.githubGist.remove(key);
          console.log(`[Storage] ${key} 删除成功`);
        }
      } catch (error) {
        console.error(
          `[Storage] Sync ${operation} to GitHub Gist failed:`,
          error
        );
      }
    }
  }

  /**
   * 获取数据（优先从 Chrome Storage 读取）
   */
  async get(key) {
    // 始终从 Chrome Storage 读取
    return await this.chromeStorage.get(key);
  }

  /**
   * 设置数据（立即更新 Chrome Storage，异步更新 GitHub Gist）
   */
  async set(key, value) {
    // 立即更新 Chrome Storage
    await this.chromeStorage.set(key, value);

    // 如果配置了 GitHub Gist，加入同步队列
    if (this.githubGist) {
      this.syncQueue.set(`set_${key}`, { operation: "set", key, value });
      this.syncDebounced();
    }
  }

  /**
   * 删除数据（立即更新 Chrome Storage，异步更新 GitHub Gist）
   */
  async remove(key) {
    // 立即更新 Chrome Storage
    await this.chromeStorage.remove(key);

    // 如果配置了 GitHub Gist，加入同步队列
    if (this.githubGist) {
      this.syncQueue.set(`remove_${key}`, { operation: "remove", key });
      this.syncDebounced();
    }
  }

  /**
   * 清空数据
   */
  async clear() {
    // 立即清空 Chrome Storage
    await this.chromeStorage.clear();

    // 如果配置了 GitHub Gist，清空同步队列并立即同步
    if (this.githubGist) {
      this.syncQueue.clear();
      await this.githubGist.clear();
    }
  }
}

export { ChromeStorageStrategy, GitHubGistStrategy, CombinedStorageStrategy };