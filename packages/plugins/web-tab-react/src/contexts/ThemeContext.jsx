import { createContext, useContext, useEffect, useMemo } from 'react'
import { theme } from 'antd'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  useEffect(() => {
    // 设置主题类为明亮主题
    document.documentElement.classList.add('light-theme')
    document.documentElement.classList.remove('dark-theme')
  }, [])

  // Ant Design 主题配置 - 固定为明亮主题
  const antdTheme = useMemo(() => {
    return {
      algorithm: theme.defaultAlgorithm,
      token: {
        colorBgContainer: '#ffffff',
        colorBgElevated: '#ffffff',
        colorText: 'rgba(0, 0, 0, 0.87)',
        colorTextSecondary: 'rgba(0, 0, 0, 0.6)',
        colorBorder: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 8,
      },
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ antdTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
