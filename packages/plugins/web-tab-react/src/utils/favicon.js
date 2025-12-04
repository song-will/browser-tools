/**
 * 获取网站图标的工具函数
 * 支持多种方案，确保在中国可用
 */

/**
 * 从 URL 中提取域名
 */
function extractDomain(url) {
  try {
    // 如果已经是完整 URL，直接解析
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url)
      return urlObj.hostname
    }
    // 如果只是域名，添加协议
    const urlObj = new URL(`https://${url}`)
    return urlObj.hostname
  } catch (error) {
    console.error('[Favicon] 提取域名失败:', error)
    return null
  }
}

/**
 * 构建完整的 URL
 */
function buildFullUrl(url) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `https://${url}`
}

/**
 * 创建带超时的 AbortController
 */
function createTimeoutSignal(timeout) {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeout)
  return controller.signal
}

/**
 * 方案1: 直接获取网站的 favicon.ico
 */
async function tryDirectFavicon(url) {
  try {
    const domain = extractDomain(url)
    if (!domain) return null

    const faviconUrl = `https://${domain}/favicon.ico`
    console.log('[Favicon] 尝试直接获取:', faviconUrl)
    
    const response = await fetch(faviconUrl, {
      method: 'HEAD',
      mode: 'cors',
      signal: createTimeoutSignal(3000) // 3秒超时
    })

    if (response.ok) {
      console.log('[Favicon] 直接获取成功:', faviconUrl)
      return faviconUrl
    }
  } catch (error) {
    console.log('[Favicon] 直接获取失败:', error.message)
  }
  return null
}

/**
 * 方案2: 从 HTML 中解析 favicon 链接
 */
async function tryParseFromHtml(url) {
  try {
    const fullUrl = buildFullUrl(url)
    console.log('[Favicon] 尝试从 HTML 解析:', fullUrl)
    
    const response = await fetch(fullUrl, {
      mode: 'cors',
      signal: createTimeoutSignal(5000) // 5秒超时
    })

    if (!response.ok) return null

    const html = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    // 查找 favicon 链接
    const faviconSelectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="apple-touch-icon-precomposed"]'
    ]

    for (const selector of faviconSelectors) {
      const link = doc.querySelector(selector)
      if (link && link.href) {
        let faviconUrl = link.href
        
        // 如果是相对路径，转换为绝对路径
        if (faviconUrl.startsWith('//')) {
          faviconUrl = `https:${faviconUrl}`
        } else if (faviconUrl.startsWith('/')) {
          const urlObj = new URL(fullUrl)
          faviconUrl = `${urlObj.origin}${faviconUrl}`
        } else if (!faviconUrl.startsWith('http')) {
          const urlObj = new URL(fullUrl)
          faviconUrl = `${urlObj.origin}/${faviconUrl}`
        }

        console.log('[Favicon] 从 HTML 解析成功:', faviconUrl)
        return faviconUrl
      }
    }
  } catch (error) {
    console.log('[Favicon] HTML 解析失败:', error.message)
  }
  return null
}

/**
 * 方案3: 使用 DuckDuckGo Favicon API（在中国可能可用）
 */
async function tryDuckDuckGoApi(url) {
  try {
    const domain = extractDomain(url)
    if (!domain) return null

    const duckDuckGoUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`
    console.log('[Favicon] 尝试 DuckDuckGo API:', duckDuckGoUrl)
    
    const response = await fetch(duckDuckGoUrl, {
      method: 'HEAD',
      mode: 'cors',
      signal: createTimeoutSignal(3000)
    })

    if (response.ok) {
      console.log('[Favicon] DuckDuckGo API 成功:', duckDuckGoUrl)
      return duckDuckGoUrl
    }
  } catch (error) {
    console.log('[Favicon] DuckDuckGo API 失败:', error.message)
  }
  return null
}

/**
 * 方案4: 使用国内可用的第三方服务
 * 这里使用一个通用的 favicon 服务
 */
async function tryThirdPartyApi(url) {
  try {
    const domain = extractDomain(url)
    if (!domain) return null

    // 尝试使用 favicon.io API（如果可用）
    const faviconIoUrl = `https://favicon.io/api/favicon?domain=${domain}`
    console.log('[Favicon] 尝试第三方 API:', faviconIoUrl)
    
    const response = await fetch(faviconIoUrl, {
      method: 'HEAD',
      mode: 'cors',
      signal: createTimeoutSignal(3000)
    })

    if (response.ok) {
      console.log('[Favicon] 第三方 API 成功:', faviconIoUrl)
      return faviconIoUrl
    }
  } catch (error) {
    console.log('[Favicon] 第三方 API 失败:', error.message)
  }
  return null
}

/**
 * 验证图标 URL 是否有效
 */
async function validateIconUrl(iconUrl) {
  try {
    const response = await fetch(iconUrl, {
      method: 'HEAD',
      mode: 'cors',
      signal: createTimeoutSignal(3000)
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * 获取网站图标（主函数）
 * 按优先级尝试多种方案
 */
export async function getFavicon(url) {
  if (!url || !url.trim()) {
    return null
  }

  console.log('[Favicon] 开始获取图标，URL:', url)

  // 方案1: 直接获取 favicon.ico
  let iconUrl = await tryDirectFavicon(url)
  if (iconUrl && await validateIconUrl(iconUrl)) {
    return iconUrl
  }

  // 方案2: 从 HTML 解析
  iconUrl = await tryParseFromHtml(url)
  if (iconUrl && await validateIconUrl(iconUrl)) {
    return iconUrl
  }

  // 方案3: DuckDuckGo API
  iconUrl = await tryDuckDuckGoApi(url)
  if (iconUrl && await validateIconUrl(iconUrl)) {
    return iconUrl
  }

  // 方案4: 第三方 API
  iconUrl = await tryThirdPartyApi(url)
  if (iconUrl && await validateIconUrl(iconUrl)) {
    return iconUrl
  }

  console.log('[Favicon] 所有方案都失败，返回 null')
  return null
}

