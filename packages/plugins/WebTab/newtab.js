// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', function() {
  // 1. 时间更新功能
  function updateTime() {
    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    const dateOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };

    document.getElementById('time').textContent = now.toLocaleTimeString('zh-CN', timeOptions);
    document.getElementById('date').textContent = now.toLocaleDateString('zh-CN', dateOptions);
  }

  // 2. 搜索功能（支持直接输入网址跳转）
  document.getElementById('search-form').addEventListener('submit', function(e) {
    const input = document.getElementById('search-input').value.trim();
    
    // 如果是网址格式，直接跳转
    if (/^https?:\/\//i.test(input)) {
      e.preventDefault();
      window.open(input, '_blank');
    } else if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/i.test(input)) {
      e.preventDefault();
      window.open('https://' + input, '_blank');
    }
  });

  // 3. 快捷方式数据
  const shortcutsData = [
    { name: "GitHub", url: "https://github.com", icon: "https://github.githubassets.com/favicons/favicon.svg" },
    { name: "Gmail", url: "https://mail.google.com", icon: "https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png" },
    { name: "YouTube", url: "https://youtube.com", icon: "https://www.youtube.com/s/desktop/d5c6f5f4/img/favicon_48x48.png" },
    { name: "Twitter", url: "https://twitter.com", icon: "https://abs.twimg.com/favicons/twitter.ico" },
    { name: "Reddit", url: "https://reddit.com", icon: "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-48x48.png" },
    { name: "知乎", url: "https://zhihu.com", icon: "https://static.zhihu.com/heifetz/favicon.ico" },
    { name: "B站", url: "https://bilibili.com", icon: "https://www.bilibili.com/favicon.ico" },
    { name: "V2EX", url: "https://v2ex.com", icon: "https://www.v2ex.com/favicon.ico" }
  ];

  // 渲染快捷方式
  const shortcutsContainer = document.getElementById('shortcuts');
  shortcutsData.forEach(item => {
    const shortcut = document.createElement('a');
    shortcut.className = 'shortcut-item';
    shortcut.href = item.url;
    shortcut.target = '_blank';
    shortcut.innerHTML = `
      <div class="shortcut-icon">
        <img src="${item.icon}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAxLjVjLTEuNzQgMC0zLjI3LjgxLTQuMyAyLjA1bC0uMTcuMTljLS40My40OC0uNzMgMS4wNS0uODggMS42N0M2LjQ0IDUuODQgNiA3LjM0IDYgOXMyLjAxIDYgNiA2IDYtMi42OSA2LTZjMC0xLjY2LS40NC0zLjE2LTEuMTctNC4zMy0uMTUtLjYyLS40NS0xLjE5LS44OC0xLjY3bC0uMTctLjE5QzE1LjI3IDIuMzEgMTMuNzQgMS41IDEyIDEuNXptMCAxOGMtMi4yMSAwLTQtMS43OS00LTRzMS43OS00IDQtNCA0IDEuNzkgNCA0LTEuNzkgNC00IDR6Ii8+PC9zdmc+'">
      </div>
      <div class="shortcut-label">${item.name}</div>
    `;
    shortcutsContainer.appendChild(shortcut);
  });

  // 4. 模拟天气数据（实际项目中可接入天气API）
  function loadWeather() {
    const weatherContainer = document.getElementById('weather');
    
    // 模拟API请求延迟
    setTimeout(() => {
      weatherContainer.innerHTML = `
        <div class="weather-current">
          <div>
            <div class="weather-temp">23°C</div>
            <div class="weather-desc">晴朗</div>
          </div>
          <div style="font-size: 3rem;">☀️</div>
        </div>
        <div class="weather-forecast">
          <div class="weather-day">
            <div>今天</div>
            <div>☀️</div>
            <div>22-26°C</div>
          </div>
          <div class="weather-day">
            <div>明天</div>
            <div>⛅</div>
            <div>21-25°C</div>
          </div>
          <div class="weather-day">
            <div>周三</div>
            <div>🌧️</div>
            <div>20-24°C</div>
          </div>
          <div class="weather-day">
            <div>周四</div>
            <div>☀️</div>
            <div>22-27°C</div>
          </div>
        </div>
      `;
    }, 1000);
  }

  // 5. 待办事项功能
  document.getElementById('todo-add').addEventListener('click', function() {
    const input = document.getElementById('todo-input');
    const text = input.value.trim();
    
    if (text) {
      const todoList = document.getElementById('todo-list');
      const newItem = document.createElement('li');
      newItem.className = 'todo-item';
      newItem.innerHTML = `
        <input type="checkbox" class="todo-checkbox">
        <span class="todo-text">${text}</span>
      `;
      todoList.appendChild(newItem);
      input.value = '';
    }
  });

  // 6. 主题切换功能
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;
  
  // 更新主题图标
  function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    if (theme === 'light-theme') {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
    } else {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
    }
  }
  
  // 检查本地存储的主题偏好
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    body.classList.add(savedTheme);
    updateThemeIcon(savedTheme);
  }
  
  // 切换主题
  themeToggle.addEventListener('click', function() {
    if (body.classList.contains('light-theme')) {
      body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark-theme');
      updateThemeIcon('dark-theme');
    } else {
      body.classList.add('light-theme');
      localStorage.setItem('theme', 'light-theme');
      updateThemeIcon('light-theme');
    }
  });

  // 初始化
  updateTime();
  setInterval(updateTime, 1000);
  loadWeather();
});
