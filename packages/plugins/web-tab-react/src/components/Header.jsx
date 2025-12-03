import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const [time, setTime] = useState('00:00')
  const [date, setDate] = useState('加载中...')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false }
      const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }

      setTime(now.toLocaleTimeString('zh-CN', timeOptions))
      setDate(now.toLocaleDateString('zh-CN', dateOptions))
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <header className="text-center pt-10 pb-5 px-5 relative">
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-all hover:scale-110"
        style={{ backgroundColor: 'var(--card-dark)' }}
      >
        <i className={`fas ${theme === 'light-theme' ? 'fa-sun' : 'fa-moon'} text-xl`} style={{ color: 'var(--text-primary)' }}></i>
      </button>
      
      <div className="text-6xl font-light mb-2" style={{ color: 'var(--text-primary)' }}>
        {time}
      </div>
      <div className="text-xl opacity-90" style={{ color: 'var(--text-secondary)' }}>
        {date}
      </div>
    </header>
  )
}

