/* eslint-env browser */
import { storageManager } from './storage'

const MAX_LOG_ENTRIES = 1000
const LOG_KEY = 'operation_logs'

/**
 * 获取客户端信息
 */
function getClientInfo() {
  const info = {
    userAgent: navigator.userAgent || '未知',
    platform: navigator.platform || '未知',
    language: navigator.language || '未知',
    screenResolution: `${window.screen.width}x${window.screen.height}` || '未知',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '未知'
  }
  
  // 尝试检测浏览器类型
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('chrome') && !ua.includes('edg')) {
    info.browser = 'Chrome'
  } else if (ua.includes('firefox')) {
    info.browser = 'Firefox'
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    info.browser = 'Safari'
  } else if (ua.includes('edg')) {
    info.browser = 'Edge'
  } else {
    info.browser = '未知'
  }
  
  return info
}

/**
 * 获取IP地址（异步）
 */
async function getIPAddress() {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      timeout: 5000
    })
    if (response.ok) {
      const data = await response.json()
      return data.ip || '未知'
    }
  } catch (error) {
    console.log('[OperationLog] 获取IP失败:', error)
  }
  
  // 如果获取失败，返回未知
  return '未知'
}

/**
 * 记录操作日志
 * @param {string} type - 操作类型
 * @param {string|object} content - 操作内容
 * @param {object} metadata - 额外元数据
 */
export async function logOperation(type, content, metadata = {}) {
  try {
    const timestamp = Date.now()
    const clientInfo = getClientInfo()
    
    // 异步获取IP（不阻塞日志记录）
    const ipPromise = getIPAddress()
    
    const logEntry = {
      id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      timestamp,
      client: clientInfo,
      metadata
    }
    
    // 获取IP（设置超时，避免阻塞太久）
    const ipTimeout = new Promise((resolve) => {
      setTimeout(() => resolve('未知'), 3000)
    })
    logEntry.ip = await Promise.race([ipPromise, ipTimeout])
    
    // 获取现有日志
    const existingLogs = await storageManager.get(LOG_KEY) || []
    
    // 添加新日志
    const newLogs = [logEntry, ...existingLogs]
    
    // 限制日志数量
    if (newLogs.length > MAX_LOG_ENTRIES) {
      newLogs.splice(MAX_LOG_ENTRIES)
    }
    
    // 保存日志
    await storageManager.set(LOG_KEY, newLogs)
    
    console.log('[OperationLog] 操作已记录:', type, content)
  } catch (error) {
    console.error('[OperationLog] 记录操作日志失败:', error)
  }
}

/**
 * 获取操作日志
 */
export async function getOperationLogs() {
  try {
    return await storageManager.get(LOG_KEY) || []
  } catch (error) {
    console.error('[OperationLog] 获取操作日志失败:', error)
    return []
  }
}

/**
 * 清空操作日志
 */
export async function clearOperationLogs() {
  try {
    await storageManager.set(LOG_KEY, [])
    console.log('[OperationLog] 操作日志已清空')
  } catch (error) {
    console.error('[OperationLog] 清空操作日志失败:', error)
    throw error
  }
}

