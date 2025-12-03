export default function SearchBox() {
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

  return (
    <div className="w-full max-w-[600px]">
      <form
        id="search-form"
        action="https://www.google.com/search"
        method="GET"
        target="_blank"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          className="w-full px-6 py-4 text-base border-0 rounded-full shadow-lg outline-none text-left transition-all placeholder:opacity-60"
          style={{
            backgroundColor: 'var(--card-dark)',
            color: 'var(--text-primary)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
          name="q"
          placeholder="搜索 Google 或输入网址..."
          autoComplete="off"
          onFocus={(e) => {
            e.target.style.boxShadow = '0 4px 20px rgba(187, 134, 252, 0.3)'
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}
        />
      </form>
    </div>
  )
}

