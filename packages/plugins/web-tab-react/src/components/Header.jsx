import { useState, useEffect } from 'react'
import { theme } from 'antd'

const { useToken } = theme

export default function Header() {
  const { token } = useToken()
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
      <div style={{ fontSize: 60, fontWeight: 300, marginBottom: 8, color: token.colorText }}>
        {time}
      </div>
      <div style={{ fontSize: 20, opacity: 0.9, color: token.colorTextSecondary }}>
        {date}
      </div>
    </header>
  )
}
