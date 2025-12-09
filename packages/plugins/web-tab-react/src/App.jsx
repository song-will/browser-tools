import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { ConfigProvider, Button, Spin } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import Header from './components/Header'
import SearchBox from './components/SearchBox'
import Shortcuts from './components/Shortcuts'
import TodoList from './components/TodoList'
import { storageManager } from './utils/storage'
import nyBg from './assets/ny.png'
import defaultVideo from './assets/video.mp4'
import './App.css'

// 按需加载 Settings 组件（非首屏必需）
const Settings = lazy(() => import('./components/Settings'))

function AppContent() {
  const { antdTheme } = useTheme()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [backgroundStyle, setBackgroundStyle] = useState({})
  const [backgroundVideo, setBackgroundVideo] = useState('')
  const [videoError, setVideoError] = useState(false)

  // 检查图片是否有效
  const checkImageValid = useCallback((url) => {
    return new Promise((resolve) => {
      if (!url || !url.trim()) {
        resolve(false)
        return
      }
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = url
    })
  }, [])


  const applyBackground = useCallback(async (bgSettings) => {
    const style = {}
    setVideoError(false)
    
    if (bgSettings.type === 'image') {
      // 图片类型：如果有 URL 且有效，使用 URL；否则使用默认图片
      const imageUrl = bgSettings.image?.trim()
      let finalImageUrl = nyBg // 默认图片
      
      if (imageUrl) {
        const isValid = await checkImageValid(imageUrl)
        if (isValid) {
          finalImageUrl = imageUrl
        }
      }
      
      style.backgroundImage = `url(${finalImageUrl})`
      style.backgroundSize = 'cover'
      style.backgroundPosition = 'center'
      style.backgroundRepeat = 'no-repeat'
      setBackgroundVideo('')
    } else if (bgSettings.type === 'video') {
      // 视频类型：如果有 URL，使用 URL；否则使用默认视频
      // 如果 URL 无效，视频元素会触发 onerror，然后回退到默认视频
      const videoUrl = bgSettings.video?.trim()
      const finalVideoUrl = videoUrl || defaultVideo
      
      style.backgroundColor = 'transparent'
      setBackgroundVideo(finalVideoUrl)
    } else {
      // 默认使用图片背景
      style.backgroundImage = `url(${nyBg})`
      style.backgroundSize = 'cover'
      style.backgroundPosition = 'center'
      style.backgroundRepeat = 'no-repeat'
      setBackgroundVideo('')
    }
    
    setBackgroundStyle(style)
  }, [checkImageValid])

  const loadBackground = useCallback(async () => {
    try {
      await storageManager.init()
      const bgSettings = await storageManager.get('background_settings')
      if (bgSettings) {
        await applyBackground(bgSettings)
      } else {
        // 默认背景：使用视频
        const defaultBgSettings = {
          type: 'video',
          video: ''
        }
        await applyBackground(defaultBgSettings)
      }
    } catch (error) {
      console.error('[App] Load background error:', error)
      // 出错时也使用默认背景视频
      const defaultBgSettings = {
        type: 'video',
        video: ''
      }
      await applyBackground(defaultBgSettings)
    }
  }, [applyBackground])

  useEffect(() => {
    // 禁用默认右键菜单
    const handleContextMenu = (e) => {
      e.preventDefault()
    }
    document.addEventListener('contextmenu', handleContextMenu)

    // 异步加载背景和自动同步
    ;(async () => {
      await loadBackground()
      
      // 检查同步功能是否开启，如果开启则自动同步
      try {
        await storageManager.init()
        const config = await storageManager.getStorageConfig()
        if (config?.enableGithub && config?.token && config?.gistId) {
          console.log('[App] 检测到同步功能已开启，开始自动同步...')
          try {
            await storageManager.syncFromGithub()
            console.log('[App] 自动同步完成')
            // 触发页面刷新（通过事件）
            window.dispatchEvent(new CustomEvent('dataSynced'))
          } catch (error) {
            console.error('[App] 自动同步失败:', error)
          }
        }
      } catch (error) {
        console.error('[App] 检查同步配置失败:', error)
      }
    })()
    
    // 监听背景变化事件
    const handleBackgroundChange = (event) => {
      applyBackground(event.detail)
    }
    window.addEventListener('backgroundChanged', handleBackgroundChange)
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('backgroundChanged', handleBackgroundChange)
    }
  }, [loadBackground, applyBackground])

  return (
    <ConfigProvider theme={antdTheme}>
      <div 
        className="h-screen w-screen flex flex-col transition-all relative overflow-hidden" 
        style={{ ...backgroundStyle }}
      >
        {/* 视频背景 */}
        {backgroundVideo && (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="fixed inset-0 w-full h-full object-cover z-0"
            style={{ pointerEvents: 'none' }}
            onError={() => {
              // 如果视频加载失败，且当前不是默认视频，则切换到默认视频
              if (backgroundVideo !== defaultVideo && !videoError) {
                setVideoError(true)
                setBackgroundVideo(defaultVideo)
              }
            }}
          >
            <source src={backgroundVideo} type="video/mp4" />
          </video>
        )}
        
        {/* 内容层 */}
        <div className="relative z-10 flex flex-col h-full overflow-hidden">
          <Header />
          <main className="flex-1 flex flex-col items-center justify-center px-5 gap-8 overflow-hidden">
            <SearchBox />
            <div className="flex flex-row gap-5 max-w-[1260px] w-full">
              <Shortcuts />
              <TodoList />
            </div>
          </main>
        </div>

        {/* 设置按钮 */}
        <Button
          type="primary"
          shape="circle"
          icon={<SettingOutlined />}
          size="large"
          onClick={() => setIsSettingsOpen(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            left: 24,
            width: 48,
            height: 48,
            zIndex: 1000,
          }}
        />

        {/* 设置面板 */}
        {isSettingsOpen && (
          <Suspense fallback={
            <div style={{ 
              position: 'fixed', 
              inset: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              zIndex: 1000
            }}>
              <Spin size="large" />
            </div>
          }>
            <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
          </Suspense>
        )}
      </div>
    </ConfigProvider>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
