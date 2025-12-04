/* eslint-env browser */
/* global chrome */

/**
 * 存储策略抽象接口
 */
class StorageStrategy {
  // eslint-disable-next-line no-unused-vars
  async get(_key) {
    throw new Error('get method must be implemented')
  }

  // eslint-disable-next-line no-unused-vars
  async set(_key, _value) {
    throw new Error('set method must be implemented')
  }

  // eslint-disable-next-line no-unused-vars
  async remove(_key) {
    throw new Error('remove method must be implemented')
  }

  async clear() {
    throw new Error('clear method must be implemented')
  }
}

/**
 * Chrome Storage 存储策略
 */
class ChromeStorageStrategy extends StorageStrategy {
  async get(key) {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve(result[key] || null)
          }
        })
      } else {
        // 降级到 localStorage
        try {
          const value = localStorage.getItem(key)
          resolve(value ? JSON.parse(value) : null)
        } catch (error) {
          reject(error)
        }
      }
    })
  }

  async set(key, value) {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve()
          }
        })
      } else {
        // 降级到 localStorage
        try {
          localStorage.setItem(key, JSON.stringify(value))
          resolve()
        } catch (error) {
          reject(error)
        }
      }
    })
  }

  async remove(key) {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove([key], () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve()
          }
        })
      } else {
        // 降级到 localStorage
        try {
          localStorage.removeItem(key)
          resolve()
        } catch (error) {
          reject(error)
        }
      }
    })
  }

  async clear() {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.clear(() => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve()
          }
        })
      } else {
        // 降级到 localStorage
        try {
          localStorage.clear()
          resolve()
        } catch (error) {
          reject(error)
        }
      }
    })
  }
}

/**
 * GitHub Gist 存储策略
 */
class GitHubGistStrategy extends StorageStrategy {
  constructor(token, gistId = null) {
    super()
    this.token = token
    this.gistId = gistId
    this.baseUrl = 'https://api.github.com/gists'
  }

  async get(key) {
    if (!this.gistId) {
      return null
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.gistId}`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch gist: ${response.statusText}`)
      }

      const gist = await response.json()
      const file = gist.files[key] || gist.files['data.json']
      
      if (!file) {
        return null
      }

      return JSON.parse(file.content)
    } catch (error) {
      console.error('[Storage] GitHub Gist get error:', error)
      return null // 失败时返回 null，不影响主存储
    }
  }

  async set(key, value) {
    if (!this.token) {
      return null
    }

    try {
      const content = JSON.stringify(value, null, 2)
      const files = { [key]: { content } }

      if (this.gistId) {
        // 更新现有 gist
        const response = await fetch(`${this.baseUrl}/${this.gistId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ files })
        })

        if (!response.ok) {
          throw new Error(`Failed to update gist: ${response.statusText}`)
        }

        const gist = await response.json()
        this.gistId = gist.id
      } else {
        // 创建新 gist
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            description: 'WebTab shortcuts storage',
            public: false,
            files
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to create gist: ${response.statusText}`)
        }

        const gist = await response.json()
        this.gistId = gist.id
      }

      return this.gistId
    } catch (error) {
      console.error('[Storage] GitHub Gist set error:', error)
      // 不抛出错误，只记录日志，不影响主存储
      return null
    }
  }

  async remove(key) {
    if (!this.gistId || !this.token) {
      return
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: { [key]: null }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to remove from gist: ${response.statusText}`)
      }
    } catch (error) {
      console.error('[Storage] GitHub Gist remove error:', error)
      // 不抛出错误，只记录日志
    }
  }

  async clear() {
    if (!this.gistId || !this.token) {
      return
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {}
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to clear gist: ${response.statusText}`)
      }
    } catch (error) {
      console.error('[Storage] GitHub Gist clear error:', error)
      // 不抛出错误，只记录日志
    }
  }
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * 组合存储策略：Chrome Storage（主存储）+ GitHub Gist（可选备份）
 */
class CombinedStorageStrategy extends StorageStrategy {
  constructor() {
    super()
    this.chromeStorage = new ChromeStorageStrategy()
    this.githubGist = null
    this.syncQueue = new Map() // 待同步队列
    this.syncDebounced = debounce(() => this.flushSyncQueue(), 2000) // 2秒防抖
  }

  /**
   * 设置 GitHub Gist 配置
   */
  setGithubGist(token, gistId = null) {
    if (token) {
      this.githubGist = new GitHubGistStrategy(token, gistId)
    } else {
      this.githubGist = null
    }
  }

  /**
   * 刷新同步队列
   */
  async flushSyncQueue() {
    if (!this.githubGist || this.syncQueue.size === 0) {
      return
    }

    const operations = Array.from(this.syncQueue.entries())
    this.syncQueue.clear()

    console.log('[Storage] 开始同步到 GitHub Gist，队列大小:', operations.length)
    for (const [, { operation, key, value }] of operations) {
      try {
        if (operation === 'set') {
          console.log(`[Storage] 同步 ${key} 到 GitHub Gist`)
          await this.githubGist.set(key, value)
          console.log(`[Storage] ${key} 同步成功`)
        } else if (operation === 'remove') {
          console.log(`[Storage] 从 GitHub Gist 删除 ${key}`)
          await this.githubGist.remove(key)
          console.log(`[Storage] ${key} 删除成功`)
        }
      } catch (error) {
        console.error(`[Storage] Sync ${operation} to GitHub Gist failed:`, error)
      }
    }
  }

  /**
   * 获取数据（优先从 Chrome Storage 读取）
   */
  async get(key) {
    // 始终从 Chrome Storage 读取
    return await this.chromeStorage.get(key)
  }

  /**
   * 设置数据（立即更新 Chrome Storage，异步更新 GitHub Gist）
   */
  async set(key, value) {
    // 立即更新 Chrome Storage
    await this.chromeStorage.set(key, value)

    // 如果配置了 GitHub Gist，加入同步队列
    if (this.githubGist) {
      this.syncQueue.set(`set_${key}`, { operation: 'set', key, value })
      this.syncDebounced()
    }
  }

  /**
   * 删除数据（立即更新 Chrome Storage，异步更新 GitHub Gist）
   */
  async remove(key) {
    // 立即更新 Chrome Storage
    await this.chromeStorage.remove(key)

    // 如果配置了 GitHub Gist，加入同步队列
    if (this.githubGist) {
      this.syncQueue.set(`remove_${key}`, { operation: 'remove', key })
      this.syncDebounced()
    }
  }

  /**
   * 清空数据
   */
  async clear() {
    // 立即清空 Chrome Storage
    await this.chromeStorage.clear()

    // 如果配置了 GitHub Gist，清空同步队列并立即同步
    if (this.githubGist) {
      this.syncQueue.clear()
      await this.githubGist.clear()
    }
  }
}

/**
 * 存储管理器
 */
class StorageManager {
  constructor() {
    this.strategy = new CombinedStorageStrategy()
    this.configKey = 'storage_config'
  }

  /**
   * 初始化存储策略
   */
  async init() {
    const config = await this.getStorageConfig()
    
    if (config && config.enableGithub && config.token) {
      this.strategy.setGithubGist(config.token, config.gistId || null)
    } else {
      this.strategy.setGithubGist(null)
    }
  }

  /**
   * 获取存储配置
   */
  async getStorageConfig() {
    const chromeStorage = new ChromeStorageStrategy()
    return await chromeStorage.get(this.configKey)
  }

  /**
   * 设置存储配置
   */
  async setStorageConfig(config) {
    const chromeStorage = new ChromeStorageStrategy()
    await chromeStorage.set(this.configKey, config)
    await this.init() // 重新初始化策略
  }

  /**
   * 获取数据
   */
  async get(key) {
    return await this.strategy.get(key)
  }

  /**
   * 设置数据
   */
  async set(key, value) {
    return await this.strategy.set(key, value)
  }

  /**
   * 删除数据
   */
  async remove(key) {
    return await this.strategy.remove(key)
  }

  /**
   * 清空数据
   */
  async clear() {
    return await this.strategy.clear()
  }

  /**
   * 手动触发同步到 GitHub Gist（用于测试或立即同步）
   */
  async syncToGithub() {
    if (this.strategy.githubGist) {
      await this.strategy.flushSyncQueue()
    }
  }
}

// 导出单例
export const storageManager = new StorageManager()

// 导出策略类（用于测试或扩展）
export { StorageStrategy, ChromeStorageStrategy, GitHubGistStrategy, CombinedStorageStrategy, StorageManager }
