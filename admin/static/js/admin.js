/**
 * XYBotV2 管理后台主要JavaScript文件
 */

// 全局变量
let ws = null;
let notificationTimeout = null;
const DEFAULT_AVATAR = '/static/img/favicon.ico'; // 默认头像图片

// 当文档加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化侧边栏
    initSidebar();
    
    // 初始化WebSocket连接
    initWebSocket();
    
    // 检查bot状态
    checkBotStatus();
    
    // 定期检查bot状态（每5秒）
    setInterval(checkBotStatus, 5000);
    
    // 检查登录状态
    checkLoginStatus();
    
    // 初始化刷新状态按钮
    const refreshStatusBtn = document.getElementById('refresh-status');
    if (refreshStatusBtn) {
        refreshStatusBtn.addEventListener('click', function() {
            // 显示加载提示
            const statusElements = document.querySelectorAll('.robot-status');
            statusElements.forEach(el => {
                el.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> 刷新中...';
            });
            
            // 刷新状态
            checkBotStatus();
            
            // 显示通知
            showNotification('刷新状态', '正在刷新机器人状态信息...', 'info');
        });
    }
});

/**
 * 初始化侧边栏
 */
function initSidebar() {
    const sidebarToggler = document.getElementById('sidebar-toggler');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebarToggler) {
        sidebarToggler.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
            
            // 保存侧边栏状态
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebar-collapsed', isCollapsed);
        });
    }
    
    // 恢复侧边栏状态
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState === 'true') {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }
    
    // 在移动设备上添加侧边栏展开/收起功能
    if (window.innerWidth < 768) {
        document.addEventListener('click', function(e) {
            if (sidebar.classList.contains('mobile-expanded') && 
                !sidebar.contains(e.target) &&
                e.target !== sidebarToggler) {
                sidebar.classList.remove('mobile-expanded');
            }
        });
        
        if (sidebarToggler) {
            sidebarToggler.addEventListener('click', function() {
                sidebar.classList.toggle('mobile-expanded');
            });
        }
    }
    
    // 高亮当前页面的导航项
    highlightActiveNavItem();
}

/**
 * 高亮当前页面的导航项
 */
function highlightActiveNavItem() {
    const currentPath = window.location.pathname;
    
    // 选择所有侧边栏导航链接
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || 
            (currentPath.includes(href) && href !== '/')) {
            link.classList.add('active');
        } else if (currentPath === '/' && href === '/') {
            link.classList.add('active');
        }
    });
}

/**
 * 初始化WebSocket连接
 */
function initWebSocket() {
    // 确定WebSocket协议
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const wsUrl = `${protocol}${window.location.host}/ws`;
    
    try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = function(e) {
            console.log('WebSocket连接已建立');
        };
        
        ws.onmessage = function(event) {
            handleWebSocketMessage(event.data);
        };
        
        ws.onclose = function(event) {
            if (event.wasClean) {
                console.log(`WebSocket连接已关闭，代码=${event.code} 原因=${event.reason}`);
            } else {
                console.error('WebSocket连接意外断开');
                
                // 尝试在一段时间后重新连接
                setTimeout(initWebSocket, 5000);
            }
        };
        
        ws.onerror = function(error) {
            console.error(`WebSocket错误: ${error.message}`);
        };
    } catch (error) {
        console.error('初始化WebSocket失败:', error);
    }
}

/**
 * 处理WebSocket消息
 */
function handleWebSocketMessage(data) {
    try {
        const message = JSON.parse(data);
        
        // 根据消息类型处理
        switch (message.type) {
            case 'notification':
                showNotification(message.title, message.message, message.level);
                break;
                
            case 'status_update':
                updateStatusInfo(message.data);
                break;
                
            case 'log_update':
                appendLogMessage(message.data);
                break;
                
            case 'event':
                handleEvent(message.event, message.data);
                break;
                
            default:
                console.log('收到未知类型的WebSocket消息:', message);
        }
    } catch (error) {
        console.error('处理WebSocket消息时出错:', error);
    }
}

/**
 * 发送WebSocket消息
 */
function sendWebSocketMessage(type, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const message = {
            type: type,
            data: data
        };
        
        ws.send(JSON.stringify(message));
    } else {
        console.error('WebSocket未连接，无法发送消息');
    }
}

/**
 * 显示通知
 */
function showNotification(title, message, level = 'info') {
    // 如果已有通知，先移除
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 清除原有的超时
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
    
    // 创建新的通知元素
    const notification = document.createElement('div');
    notification.className = 'notification fade-in';
    
    // 设置通知类型
    let bgClass = 'bg-info';
    if (level === 'success') bgClass = 'bg-success';
    if (level === 'warning') bgClass = 'bg-warning';
    if (level === 'error') bgClass = 'bg-danger';
    
    // 通知内容
    notification.innerHTML = `
        <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header ${bgClass} text-white">
                <strong class="me-auto">${title}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    // 添加到文档中
    document.body.appendChild(notification);
    
    // 绑定关闭按钮事件
    const closeBtn = notification.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            notification.remove();
        });
    }
    
    // 自动关闭通知
    notificationTimeout = setTimeout(() => {
        notification.classList.remove('fade-in');
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 5000);
}

/**
 * 更新状态信息
 */
function updateStatusInfo(data) {
    // 这个函数会根据WebSocket发送的状态更新信息来更新页面
    // 具体实现取决于页面结构，这里仅为示例
    if (data.cpu_usage !== undefined && document.getElementById('cpu-usage-text')) {
        updateResourceUsage({
            cpu: data.cpu_usage,
            memory: data.memory_usage,
            disk: data.disk_usage
        });
    }
    
    // 更新状态指示器
    if (data.bot_status !== undefined && document.getElementById('bot-status-indicator')) {
        const statusIndicator = document.getElementById('bot-status-indicator');
        const statusText = document.getElementById('bot-status-text');
        
        if (data.bot_status === 'online') {
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = '在线';
        } else if (data.bot_status === 'offline') {
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = '离线';
        } else {
            statusIndicator.className = 'status-indicator unknown';
            statusText.textContent = '未知';
        }
    }
}

/**
 * 添加日志消息
 */
function appendLogMessage(logData) {
    const logsContainer = document.getElementById('system-logs');
    if (!logsContainer) return;
    
    const logLine = document.createElement('div');
    let levelClass = '';
    
    if (logData.level === 'ERROR' || logData.level === 'CRITICAL') {
        levelClass = 'text-danger';
    } else if (logData.level === 'WARNING') {
        levelClass = 'text-warning';
    } else if (logData.level === 'INFO') {
        levelClass = 'text-info';
    }
    
    logLine.className = levelClass;
    logLine.textContent = `[${logData.timestamp}] [${logData.level}] ${logData.message}`;
    logsContainer.appendChild(logLine);
    
    // 滚动到底部
    logsContainer.scrollTop = logsContainer.scrollHeight;
    
    // 限制日志数量
    const maxLogs = 500;
    while (logsContainer.childElementCount > maxLogs) {
        logsContainer.removeChild(logsContainer.firstChild);
    }
}

/**
 * 处理特定事件
 */
function handleEvent(event, data) {
    switch (event) {
        case 'login_required':
            window.location.href = '/login';
            break;
            
        case 'reload_page':
            window.location.reload();
            break;
            
        case 'redirect':
            if (data && data.url) {
                window.location.href = data.url;
            }
            break;
            
        case 'contact_update':
            // 联系人列表更新，如果在联系人页面则刷新列表
            if (window.location.pathname.includes('/contacts') && typeof loadContacts === 'function') {
                loadContacts();
            }
            break;
            
        case 'plugin_update':
            // 插件列表更新，如果在插件页面则刷新列表
            if (window.location.pathname.includes('/plugins') && typeof loadPlugins === 'function') {
                loadPlugins();
            }
            break;
            
        default:
            console.log('未处理的事件:', event, data);
    }
}

/**
 * 检查登录状态
 */
function checkLoginStatus() {
    // 登录页面不需要检查
    if (window.location.pathname === '/login') {
        return;
    }
    
    fetch('/api/auth/status')
        .then(response => response.json())
        .then(data => {
            if (!data.logged_in) {
                window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
            }
        })
        .catch(error => {
            console.error('检查登录状态失败:', error);
        });
}

/**
 * 格式化日期时间
 */
function formatDateTime(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 转义HTML特殊字符
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 检查bot状态
function checkBotStatus() {
    fetch('/api/bot/status')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const status = data.data;
                updateBotStatusUI(status);
            }
        })
        .catch(error => console.error('获取bot状态失败:', error));
}

// 更新UI上的bot状态
function updateBotStatusUI(status) {
    console.log("收到状态更新:", status); // 添加调试日志
    
    // 查找所有显示bot状态的元素
    const statusElements = document.querySelectorAll('.bot-status');
    if (statusElements.length === 0) return;
    
    // 设置状态文本和样式
    let statusText = '未知';
    let statusClass = 'text-secondary';
    
    switch (status.status) {
        case 'online':
            statusText = '在线';
            statusClass = 'text-success';
            break;
        case 'offline':
            statusText = '离线';
            statusClass = 'text-danger';
            break;
        case 'waiting_login':
            statusText = '等待登录';
            statusClass = 'text-warning';
            break;
        case 'initializing':
            statusText = '初始化中';
            statusClass = 'text-info';
            break;
        default:
            statusText = status.status || '未知';
            statusClass = 'text-secondary';
    }
    
    // 更新所有状态元素
    statusElements.forEach(element => {
        element.textContent = statusText;
        element.className = 'bot-status'; // 重置类
        element.classList.add(statusClass);
    });
    
    // 如果有详细信息，更新详情元素
    const detailElements = document.querySelectorAll('.bot-status-detail');
    if (detailElements.length > 0 && status.details) {
        detailElements.forEach(element => {
            element.textContent = status.details;
        });
    }

    // 更新微信个人信息 - 无论什么状态都尝试更新
    // 更新头像 - 如果有头像URL则使用，否则使用默认头像
    const avatarElem = document.getElementById('bot-avatar');
    if (avatarElem) {
        // 微信头像暂时使用默认图标，后续可从API获取真实头像
        avatarElem.src = status.avatar_url || DEFAULT_AVATAR;
    }
    
    // 更新昵称
    const nicknameElem = document.getElementById('bot-nickname');
    if (nicknameElem) {
        nicknameElem.textContent = `昵称: ${status.nickname || '加载中...'}`;
        nicknameElem.style.display = 'block'; // 确保显示
    }
    
    // 更新微信ID
    const wxidElem = document.getElementById('bot-wxid');
    if (wxidElem) {
        wxidElem.textContent = `微信ID: ${status.wxid || '加载中...'}`;
        wxidElem.style.display = 'block'; // 确保显示
    }
    
    // 更新微信号
    const aliasElem = document.getElementById('bot-alias');
    if (aliasElem) {
        aliasElem.textContent = `微信号: ${status.alias || '未设置'}`;
        aliasElem.style.display = 'block'; // 确保显示
    }
    
    // 添加调试信息
    console.log("个人信息更新:", {
        nickname: status.nickname,
        wxid: status.wxid,
        alias: status.alias
    });
} 