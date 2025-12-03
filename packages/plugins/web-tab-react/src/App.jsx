import { ThemeProvider } from './contexts/ThemeContext'
import Header from './components/Header'
import SearchBox from './components/SearchBox'
import Shortcuts from './components/Shortcuts'
import TodoList from './components/TodoList'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col transition-all" style={{ backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)' }}>
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-5 gap-8">
          <SearchBox />
          <div className="grid grid-cols-3 gap-5 max-w-[1000px] w-full">
            <Shortcuts />
            <TodoList />
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App
