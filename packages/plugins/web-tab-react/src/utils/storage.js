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

  /**
   * 获取所有存储的键值对
   */
  async getAll() {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(null, (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve(result || {})
          }
        })
      } else {
        // 降级到 localStorage
        try {
          const allData = {}
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key) {
              try {
                allData[key] = JSON.parse(localStorage.getItem(key))
              } catch {
                allData[key] = localStorage.getItem(key)
              }
            }
          }
          resolve(allData)
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

  /**
   * 从 GitHub Gist 同步数据并合并
   */
  async syncFromGithub() {
    if (!this.strategy.githubGist) {
      throw new Error('GitHub Gist 未启用，请先在设置中启用')
    }

    console.log('[Storage] 开始从 GitHub Gist 同步数据')
    const now = Date.now()

    try {
      // 从 GitHub Gist 获取数据
      const remoteShortcuts = await this.strategy.githubGist.get('shortcuts')
      const remoteTodos = await this.strategy.githubGist.get('todos')
      const remoteLogs = await this.strategy.githubGist.get('operation_logs')

      // 获取本地数据
      const localShortcuts = await this.get('shortcuts') || []
      const localTodos = await this.get('todos') || []
      const localLogs = await this.get('operation_logs') || []

      // 合并快捷方式
      const mergedShortcuts = this.mergeShortcuts(localShortcuts, remoteShortcuts || [], now)
      
      // 合并待办事项
      const mergedTodos = this.mergeTodos(localTodos, remoteTodos || [], now)

      // 合并操作日志
      const mergedLogs = this.mergeOperationLogs(localLogs, remoteLogs || [])

      // 保存合并后的数据
      await this.set('shortcuts', mergedShortcuts)
      await this.set('todos', mergedTodos)
      await this.set('operation_logs', mergedLogs)

      console.log('[Storage] 同步完成')
      console.log('[Storage] 快捷方式: 本地', localShortcuts.length, '远程', remoteShortcuts?.length || 0, '合并后', mergedShortcuts.length)
      console.log('[Storage] 待办事项: 本地', localTodos.length, '远程', remoteTodos?.length || 0, '合并后', mergedTodos.length)
      console.log('[Storage] 操作日志: 本地', localLogs.length, '远程', remoteLogs?.length || 0, '合并后', mergedLogs.length)

      return {
        shortcuts: {
          local: localShortcuts.length,
          remote: remoteShortcuts?.length || 0,
          merged: mergedShortcuts.length
        },
        todos: {
          local: localTodos.length,
          remote: remoteTodos?.length || 0,
          merged: mergedTodos.length
        },
        logs: {
          local: localLogs.length,
          remote: remoteLogs?.length || 0,
          merged: mergedLogs.length
        }
      }
    } catch (error) {
      console.error('[Storage] 从 GitHub Gist 同步失败:', error)
      throw error
    }
  }

  /**
   * 合并快捷方式数据
   * 使用软删除策略：删除操作标记 deleted: true，合并时比较 deletedAt 时间戳
   */
  mergeShortcuts(local, remote, now) {
    const mergedMap = new Map()

    // 先添加本地数据（包括已删除的）
    local.forEach(item => {
      mergedMap.set(item.id, {
        ...item,
        updatedAt: item.updatedAt || now
      })
    })

    // 合并远程数据
    remote.forEach(item => {
      const localItem = mergedMap.get(item.id)
      
      if (!localItem) {
        // 本地没有，直接添加（包括已删除的）
        mergedMap.set(item.id, {
          ...item,
          updatedAt: item.updatedAt || now
        })
      } else {
        // 两端都有，需要合并
        const localDeleted = localItem.deleted === true
        const remoteDeleted = item.deleted === true
        
        if (localDeleted && remoteDeleted) {
          // 两端都删除了，比较删除时间，保留最新的删除状态
          const localDeletedAt = localItem.deletedAt || 0
          const remoteDeletedAt = item.deletedAt || 0
          if (remoteDeletedAt > localDeletedAt) {
            mergedMap.set(item.id, {
              ...item,
              updatedAt: now
            })
          } else {
            mergedMap.set(item.id, {
              ...localItem,
              updatedAt: now
            })
          }
        } else if (localDeleted && !remoteDeleted) {
          // 本地删除了，远程没删除，比较删除时间和更新时间
          const localDeletedAt = localItem.deletedAt || 0
          const remoteUpdatedAt = item.updatedAt || 0
          if (remoteUpdatedAt > localDeletedAt) {
            // 远程更新比本地删除新，恢复项目
            mergedMap.set(item.id, {
              ...item,
              deleted: false,
              deletedAt: undefined,
              updatedAt: now
            })
          } else {
            // 保留删除状态
            mergedMap.set(item.id, {
              ...localItem,
              updatedAt: now
            })
          }
        } else if (!localDeleted && remoteDeleted) {
          // 远程删除了，本地没删除，比较删除时间和更新时间
          const remoteDeletedAt = item.deletedAt || 0
          const localUpdatedAt = localItem.updatedAt || 0
          if (localUpdatedAt > remoteDeletedAt) {
            // 本地更新比远程删除新，保留项目
            mergedMap.set(item.id, {
              ...localItem,
              updatedAt: now
            })
          } else {
            // 应用删除状态
            mergedMap.set(item.id, {
              ...item,
              updatedAt: now
            })
          }
        } else {
          // 两端都没删除，正常合并内容
          const localContent = JSON.stringify({ ...localItem, updatedAt: undefined, deleted: undefined, deletedAt: undefined })
          const remoteContent = JSON.stringify({ ...item, updatedAt: undefined, deleted: undefined, deletedAt: undefined })
          
          if (localContent !== remoteContent) {
            // 内容不同，比较时间戳
            const localTime = localItem.updatedAt || 0
            const remoteTime = item.updatedAt || 0
            
            if (remoteTime > localTime) {
              mergedMap.set(item.id, {
                ...item,
                updatedAt: now
              })
            } else {
              mergedMap.set(item.id, {
                ...localItem,
                updatedAt: now
              })
            }
          } else {
            // 内容相同，保留本地版本
            mergedMap.set(item.id, {
              ...localItem,
              updatedAt: now
            })
          }
        }
      }
    })

    return Array.from(mergedMap.values())
  }

  /**
   * 合并待办事项数据
   * 使用软删除策略：删除操作标记 deleted: true，合并时比较 deletedAt 时间戳
   */
  mergeTodos(local, remote, now) {
    const mergedMap = new Map()

    // 先添加本地数据（包括已删除的）
    local.forEach(item => {
      mergedMap.set(item.id, {
        ...item,
        updatedAt: item.updatedAt || now
      })
    })

    // 合并远程数据
    remote.forEach(item => {
      const localItem = mergedMap.get(item.id)
      
      if (!localItem) {
        // 本地没有，直接添加（包括已删除的）
        mergedMap.set(item.id, {
          ...item,
          updatedAt: item.updatedAt || now
        })
      } else {
        // 两端都有，需要合并
        const localDeleted = localItem.deleted === true
        const remoteDeleted = item.deleted === true
        
        if (localDeleted && remoteDeleted) {
          // 两端都删除了，比较删除时间，保留最新的删除状态
          const localDeletedAt = localItem.deletedAt || 0
          const remoteDeletedAt = item.deletedAt || 0
          if (remoteDeletedAt > localDeletedAt) {
            mergedMap.set(item.id, {
              ...item,
              updatedAt: now
            })
          } else {
            mergedMap.set(item.id, {
              ...localItem,
              updatedAt: now
            })
          }
        } else if (localDeleted && !remoteDeleted) {
          // 本地删除了，远程没删除，比较删除时间和更新时间
          const localDeletedAt = localItem.deletedAt || 0
          const remoteUpdatedAt = item.updatedAt || 0
          if (remoteUpdatedAt > localDeletedAt) {
            // 远程更新比本地删除新，恢复待办
            mergedMap.set(item.id, {
              ...item,
              deleted: false,
              deletedAt: undefined,
              updatedAt: now
            })
          } else {
            // 保留删除状态
            mergedMap.set(item.id, {
              ...localItem,
              updatedAt: now
            })
          }
        } else if (!localDeleted && remoteDeleted) {
          // 远程删除了，本地没删除，比较删除时间和更新时间
          const remoteDeletedAt = item.deletedAt || 0
          const localUpdatedAt = localItem.updatedAt || 0
          if (localUpdatedAt > remoteDeletedAt) {
            // 本地更新比远程删除新，保留待办
            mergedMap.set(item.id, {
              ...localItem,
              updatedAt: now
            })
          } else {
            // 应用删除状态
            mergedMap.set(item.id, {
              ...item,
              updatedAt: now
            })
          }
        } else {
          // 两端都没删除，正常合并内容
          const localContent = JSON.stringify({ ...localItem, updatedAt: undefined, deleted: undefined, deletedAt: undefined })
          const remoteContent = JSON.stringify({ ...item, updatedAt: undefined, deleted: undefined, deletedAt: undefined })
          
          if (localContent !== remoteContent) {
            // 内容不同，比较时间戳
            const localTime = localItem.updatedAt || 0
            const remoteTime = item.updatedAt || 0
            
            if (remoteTime > localTime) {
              mergedMap.set(item.id, {
                ...item,
                updatedAt: now
              })
            } else {
              mergedMap.set(item.id, {
                ...localItem,
                updatedAt: now
              })
            }
          } else {
            // 内容相同，保留本地版本
            mergedMap.set(item.id, {
              ...localItem,
              updatedAt: now
            })
          }
        }
      }
    })

    return Array.from(mergedMap.values())
  }

  /**
   * 合并操作日志数据
   * 操作日志采用追加式合并：按时间戳排序，去重（基于id），保留最新的1000条
   */
  mergeOperationLogs(local, remote) {
    const MAX_LOG_ENTRIES = 1000
    const logMap = new Map()

    // 先添加本地日志
    local.forEach(log => {
      if (log.id) {
        logMap.set(log.id, log)
      }
    })

    // 添加远程日志（如果ID不存在或时间戳更新）
    remote.forEach(log => {
      if (log.id) {
        const existingLog = logMap.get(log.id)
        if (!existingLog || (log.timestamp && log.timestamp > (existingLog.timestamp || 0))) {
          logMap.set(log.id, log)
        }
      }
    })

    // 转换为数组并按时间戳降序排序
    const mergedLogs = Array.from(logMap.values())
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, MAX_LOG_ENTRIES)

    return mergedLogs
  }

  /**
   * 调试方法：输出所有存储数据
   */
  async debug() {
    try {
      console.group('[Storage Debug] 存储数据调试信息')
      
      // 获取所有存储数据
      const chromeStorage = new ChromeStorageStrategy()
      const allData = await chromeStorage.getAll()
      
      console.log('[Storage Debug] 所有存储的键值对:', allData)
      console.table(allData)
      
      // 显示存储配置
      const config = await this.getStorageConfig()
      console.log('[Storage Debug] 存储配置:', config)
      
      // 显示 GitHub Gist 状态
      if (this.strategy.githubGist) {
        console.log('[Storage Debug] GitHub Gist 已启用')
        console.log('[Storage Debug] Gist ID:', this.strategy.githubGist.gistId)
        console.log('[Storage Debug] 待同步队列大小:', this.strategy.syncQueue.size)
        if (this.strategy.syncQueue.size > 0) {
          console.log('[Storage Debug] 待同步队列:', Array.from(this.strategy.syncQueue.entries()))
        }
      } else {
        console.log('[Storage Debug] GitHub Gist 未启用')
      }
      
      // 显示常用数据
      const shortcuts = await this.get('shortcuts')
      const todos = await this.get('todos')
      const bgSettings = await this.get('background_settings')
      
      console.log('[Storage Debug] 快捷方式数量:', shortcuts?.length || 0)
      console.log('[Storage Debug] 待办事项数量:', todos?.length || 0)
      console.log('[Storage Debug] 背景设置:', bgSettings)
      
      console.groupEnd()
      
      return {
        allData,
        config,
        githubGistEnabled: !!this.strategy.githubGist,
        gistId: this.strategy.githubGist?.gistId || null,
        syncQueueSize: this.strategy.syncQueue.size,
        shortcutsCount: shortcuts?.length || 0,
        todosCount: todos?.length || 0,
        bgSettings
      }
    } catch (error) {
      console.error('[Storage Debug] 调试失败:', error)
      throw error
    }
  }
}

// 导出单例
export const storageManager = new StorageManager()

// 在开发环境下将 storageManager 挂载到 window 对象，方便调试
if (typeof window !== 'undefined') {
  window.storageManager = storageManager
  console.log('[Storage Debug] 存储管理器已挂载到 window.storageManager，可在控制台使用 storageManager.debug() 查看所有存储数据')
}

// 导出策略类（用于测试或扩展）
export { StorageStrategy, ChromeStorageStrategy, GitHubGistStrategy, CombinedStorageStrategy, StorageManager }
