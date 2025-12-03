import { useState } from 'react'

const initialTodos = [
  { id: 1, text: '完成新标签页开发', completed: false },
  { id: 2, text: '测试天气API', completed: false }
]

export default function TodoList() {
  const [todos, setTodos] = useState(initialTodos)
  const [inputValue, setInputValue] = useState('')

  const handleAdd = () => {
    const text = inputValue.trim()
    if (text) {
      setTodos([...todos, { id: Date.now(), text, completed: false }])
      setInputValue('')
    }
  }

  const handleToggle = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  return (
    <div className="rounded-2xl p-5 shadow-md col-span-1" style={{ backgroundColor: 'var(--card-dark)' }}>
      <h2 className="text-xl mb-4 flex items-center gap-2" style={{ color: 'var(--accent-color)' }}>
        待办事项
      </h2>
      <ul className="list-none">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center py-2 border-b"
            style={{ borderBottomColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <input
              type="checkbox"
              className="mr-2.5"
              checked={todo.completed}
              onChange={() => handleToggle(todo.id)}
            />
            <span className={`flex-1 ${todo.completed ? 'line-through opacity-60' : ''}`}>
              {todo.text}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex mt-2.5">
        <input
          type="text"
          className="flex-1 px-3 py-2 border-0 rounded"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'var(--text-primary)',
          }}
          placeholder="添加新任务..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAdd()
            }
          }}
        />
        <button
          onClick={handleAdd}
          className="ml-2 px-4 py-2 border-0 rounded text-white cursor-pointer"
          style={{ backgroundColor: 'var(--accent-color)' }}
        >
          添加
        </button>
      </div>
    </div>
  )
}

