import { useState, useEffect, useRef } from 'react'
import { Card, Input, Checkbox, Space, theme, Spin, Button, Popconfirm } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { storageManager } from '../utils/storage'

const { useToken } = theme

export default function TodoList() {
  const { token } = useToken()
  const [todos, setTodos] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const scrollRef = useRef(null)
  const scrollTimeoutRef = useRef(null)

  useEffect(() => {
    loadTodos()
  }, [])

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    const handleScroll = () => {
      scrollElement.classList.add('scrolling')
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = setTimeout(() => {
        scrollElement.classList.remove('scrolling')
      }, 1000)
    }

    scrollElement.addEventListener('scroll', handleScroll)
    return () => {
      scrollElement.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const loadTodos = async () => {
    try {
      await storageManager.init()
      const saved = await storageManager.get('todos')
      if (saved && Array.isArray(saved)) {
        setTodos(saved)
      } else {
        setTodos([])
      }
    } catch (error) {
      console.error('[TodoList] Load error:', error)
      setTodos([])
    } finally {
      setLoading(false)
    }
  }

  const saveTodos = async (newTodos) => {
    try {
      await storageManager.set('todos', newTodos)
      setTodos(newTodos)
    } catch (error) {
      console.error('[TodoList] Save error:', error)
    }
  }

  const handleAdd = async () => {
    const text = inputValue.trim()
    if (text) {
      const now = Date.now()
      const newTodos = [{ 
        id: now, 
        text, 
        completed: false,
        createdAt: now
      }, ...todos]
      await saveTodos(newTodos)
      setInputValue('')
    }
  }

  const handleToggle = async (id) => {
    const newTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
    await saveTodos(newTodos)
  }

  const handleDelete = async (id) => {
    const newTodos = todos.filter(todo => todo.id !== id)
    await saveTodos(newTodos)
    setDeleteConfirmId(null)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    // 如果是今天，显示时间
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    // 如果是今年，显示月日和时间
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    }
    // 否则显示完整日期
    return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card 
      title="待办事项" 
      className="col-span-1"
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
        }
      }}
    >
      <Spin spinning={loading}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Input
            placeholder="输入任务后按回车添加..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleAdd}
            style={{ width: '100%', flexShrink: 0, marginBottom: 16 }}
          />
          <div
            ref={scrollRef}
            className="custom-scrollbar"
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="todo-item"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    paddingBottom: 8,
                    paddingTop: 8,
                    paddingLeft: 12,
                    paddingRight: 12,
                    marginLeft: -12,
                    marginRight: -12,
                    borderBottom: `1px solid ${token.colorBorder}`,
                    borderRadius: 8,
                  }}
                  onMouseEnter={(e) => {
                    const deleteBtn = e.currentTarget.querySelector('.todo-delete-btn')
                    if (deleteBtn) deleteBtn.style.display = 'block'
                  }}
                  onMouseLeave={(e) => {
                    const deleteBtn = e.currentTarget.querySelector('.todo-delete-btn')
                    if (deleteBtn) deleteBtn.style.display = 'none'
                  }}
                >
                  <Checkbox
                    checked={todo.completed}
                    onChange={() => handleToggle(todo.id)}
                    style={{ marginTop: 2 }}
                  />
                  <div style={{ flex: 1, marginLeft: 8 }}>
                    <div
                      style={{
                        textDecoration: todo.completed ? 'line-through' : 'none',
                        opacity: todo.completed ? 0.6 : 1,
                        color: token.colorText,
                      }}
                    >
                      {todo.text}
                    </div>
                    {todo.createdAt && (
                      <div
                        style={{
                          fontSize: 11,
                          color: token.colorTextSecondary,
                          marginTop: 4,
                          opacity: 0.7,
                        }}
                      >
                        {formatTime(todo.createdAt)}
                      </div>
                    )}
                  </div>
                  <Popconfirm
                    title="确定要删除这个待办事项吗？"
                    open={deleteConfirmId === todo.id}
                    onConfirm={() => handleDelete(todo.id)}
                    onCancel={() => setDeleteConfirmId(null)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      className="todo-delete-btn"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      onClick={() => setDeleteConfirmId(todo.id)}
                      style={{
                        display: 'none',
                        opacity: 0.7,
                      }}
                    />
                  </Popconfirm>
                </div>
              ))}
            </Space>
          </div>
        </div>
      </Spin>
    </Card>
  )
}
