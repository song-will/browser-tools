import { useState, useEffect } from 'react'
import { Input, Segmented } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { storageManager } from '../utils/storage'

export default function SearchBox() {
  const [searchEngine, setSearchEngine] = useState('google')

  const saveSearchEngine = async (engine) => {
    try {
      await storageManager.set('search_engine', engine)
    } catch (error) {
      console.error('[SearchBox] Save search engine error:', error)
    }
  }

  const handleEngineChange = (value) => {
    setSearchEngine(value)
    saveSearchEngine(value)
  }

  useEffect(() => {
    const loadSearchEngine = async () => {
      try {
        await storageManager.init()
        const saved = await storageManager.get('search_engine')
        if (saved === 'bing' || saved === 'google') {
          setSearchEngine(saved)
        }
      } catch (error) {
        console.error('[SearchBox] Load search engine error:', error)
      }
    }
    loadSearchEngine()
  }, [])

  const handleSubmit = (e) => {
    const input = e.target.querySelector('input').value.trim()
    
    if (!input) {
      e.preventDefault()
      return
    }

    // 如果是网址格式，直接跳转
    if (/^https?:\/\//i.test(input)) {
      e.preventDefault()
      window.open(input, '_blank')
    } else if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/i.test(input)) {
      e.preventDefault()
      window.open('https://' + input, '_blank')
    }
  }

  const getSearchUrl = () => {
    return searchEngine === 'bing' 
      ? 'https://www.bing.com/search'
      : 'https://www.google.com/search'
  }

  const getPlaceholder = () => {
    return searchEngine === 'bing'
      ? '搜索 Bing 或输入网址...'
      : '搜索 Google 或输入网址...'
  }

  return (
    <div className="w-full max-w-[600px] flex flex-col items-center gap-3">
      <Segmented
        options={[
          { label: 'Google', value: 'google' },
          { label: 'Bing', value: 'bing' },
        ]}
        value={searchEngine}
        onChange={handleEngineChange}
        size="large"
      />
      <form
        id="search-form"
        action={getSearchUrl()}
        method="GET"
        target="_blank"
        onSubmit={handleSubmit}
        className="w-full"
      >
        <Input
          size="large"
          prefix={<SearchOutlined />}
          placeholder={getPlaceholder()}
          name="q"
          autoComplete="off"
          style={{
            borderRadius: 50,
            height: 56,
            fontSize: 16,
          }}
        />
      </form>
    </div>
  )
}
