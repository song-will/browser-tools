import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { ConfigProvider, Button, Spin } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import Header from './components/Header'
import SearchBox from './components/SearchBox'
import Shortcuts from './components/Shortcuts'
import TodoList from './components/TodoList'
import { storageManager } from './utils/storage'
import './App.css'

// 按需加载 Settings 组件（非首屏必需）
const Settings = lazy(() => import('./components/Settings'))

function AppContent() {
  const { antdTheme } = useTheme()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [backgroundStyle, setBackgroundStyle] = useState({})
  const [backgroundVideo, setBackgroundVideo] = useState('')

  const applyBackground = useCallback((bgSettings) => {
    const style = {}
    
    if (bgSettings.type === 'image' && bgSettings.image) {
      style.backgroundImage = `url(${bgSettings.image})`
      style.backgroundSize = 'cover'
      style.backgroundPosition = 'center'
      style.backgroundRepeat = 'no-repeat'
      setBackgroundVideo('')
    } else if (bgSettings.type === 'video' && bgSettings.video) {
      // 视频背景通过单独的 video 元素处理
      style.backgroundColor = 'transparent'
      setBackgroundVideo(bgSettings.video)
    } else {
      style.backgroundColor = antdTheme.token?.colorBgContainer || '#ffffff'
      setBackgroundVideo('')
    }
    
    setBackgroundStyle(style)
  }, [antdTheme])

  const loadBackground = useCallback(async () => {
    try {
      await storageManager.init()
      const bgSettings = await storageManager.get('background_settings')
      if (bgSettings) {
        applyBackground(bgSettings)
      } else {
        // 默认背景
        setBackgroundStyle({ backgroundColor: antdTheme.token?.colorBgContainer || '#ffffff' })
        setBackgroundVideo('')
      }
    } catch (error) {
      console.error('[App] Load background error:', error)
      setBackgroundStyle({ backgroundColor: antdTheme.token?.colorBgContainer || '#ffffff' })
      setBackgroundVideo('')
    }
  }, [applyBackground, antdTheme])

  useEffect(() => {
    // 禁用默认右键菜单
    const handleContextMenu = (e) => {
      e.preventDefault()
    }
    document.addEventListener('contextmenu', handleContextMenu)

    // 异步加载背景
    ;(async () => {
      await loadBackground()
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
          >
            <source src={backgroundVideo} type="video/mp4" />
          </video>
        )}
        
        {/* 内容层 */}
        <div className="relative z-10 flex flex-col h-full overflow-hidden">
          <Header />
          <main className="flex-1 flex flex-col items-center justify-center px-5 gap-8 overflow-hidden">
            <SearchBox />
            <div className="grid grid-cols-3 gap-5 max-w-[1000px] w-full">
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
