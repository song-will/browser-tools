const shortcutsData = [
  { name: "GitHub", url: "https://github.com", icon: "https://github.githubassets.com/favicons/favicon.svg" },
  { name: "Gmail", url: "https://mail.google.com", icon: "https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png" },
  { name: "YouTube", url: "https://youtube.com", icon: "https://www.youtube.com/s/desktop/d5c6f5f4/img/favicon_48x48.png" },
  { name: "Twitter", url: "https://twitter.com", icon: "https://abs.twimg.com/favicons/twitter.ico" },
  { name: "Reddit", url: "https://reddit.com", icon: "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-48x48.png" },
  { name: "知乎", url: "https://zhihu.com", icon: "https://static.zhihu.com/heifetz/favicon.ico" },
  { name: "B站", url: "https://bilibili.com", icon: "https://www.bilibili.com/favicon.ico" },
  { name: "V2EX", url: "https://v2ex.com", icon: "https://www.v2ex.com/favicon.ico" }
]

const defaultIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAxLjVjLTEuNzQgMC0zLjI3LjgxLTQuMyAyLjA1bC0uMTcuMTljLS40My40OC0uNzMgMS4wNS0uODggMS42N0M2LjQ0IDUuODQgNiA3LjM0IDYgOXMyLjAxIDYgNiA2IDYtMi42OSA2LTZjMC0xLjY2LS40NC0zLjE2LTEuMTctNC4zMy0uMTUtLjYyLS40NS0xLjE5LS44OC0xLjY3bC0uMTctLjE5QzE1LjI3IDIuMzEgMTMuNzQgMS41IDEyIDEuNXptMCAxOGMtMi4yMSAwLTQtMS43OS00LTRzMS43OS00IDQtNCA0IDEuNzkgNCA0LTEuNzkgNC00IDR6Ii8+PC9zdmc+'

export default function Shortcuts() {
  return (
    <div className="rounded-2xl p-5 shadow-md col-span-2" style={{ backgroundColor: 'var(--card-dark)' }}>
      <h2 className="text-xl mb-4 flex items-center gap-2" style={{ color: 'var(--accent-color)' }}>
        快捷方式
      </h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-4">
        {shortcutsData.map((item) => (
          <a
            key={item.name}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center no-underline transition-transform hover:-translate-y-1"
            style={{ color: 'var(--text-primary)' }}
          >
            <div className="w-12 h-12 rounded-full bg-[#333] flex items-center justify-center mb-2 overflow-hidden">
              <img
                src={item.icon}
                alt={item.name}
                className="w-8 h-8"
                onError={(e) => {
                  e.target.src = defaultIcon
                }}
              />
            </div>
            <div className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              {item.name}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

