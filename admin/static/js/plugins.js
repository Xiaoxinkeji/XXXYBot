// 全局变量
let plugins = [];
let currentPluginId = null;
let currentFilter = 'all';
let configModal = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 加载插件列表
    loadPlugins();
    
    // 初始化模态框
    configModal = new bootstrap.Modal(document.getElementById('plugin-config-modal'), {
        backdrop: true,
        keyboard: true
    });
    
    // 绑定模态框关闭事件
    document.getElementById('plugin-config-modal').addEventListener('hidden.bs.modal', function() {
        // 清理模态框状态
        document.getElementById('plugin-config-form').innerHTML = '';
        document.getElementById('plugin-config-error').style.display = 'none';
        document.getElementById('plugin-config-loading').style.display = 'none';
        currentPluginId = null;
        
        // 额外清理
        clearModalBackdrops();
    });
    
    // 手动绑定关闭按钮事件
    document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(button => {
        button.addEventListener('click', function() {
            const modalId = this.closest('.modal').id;
            if (modalId === 'plugin-config-modal') {
                closeConfigModal();
            }
        });
    });
    
    // 监听原生配置界面的出现和消失
    setupConfigContainerObserver();
    
    // 绑定事件
    document.querySelectorAll('.plugin-filter button').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.plugin-filter button').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const filter = this.getAttribute('data-filter');
            currentFilter = filter;
            filterPlugins(filter);
        });
    });
    
    // 监听ESC键，强制清除模态框
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' || event.keyCode === 27) {
            clearModalBackdrops();
        }
    });
    
    // 添加一个全局点击事件来检测和清除"孤立"的背景蒙层
    document.addEventListener('click', function(event) {
        // 检查是否点击的是.modal-backdrop元素
        if (event.target.classList.contains('modal-backdrop')) {
            // 检查是否有可见的模态框
            const visibleModals = document.querySelectorAll('.modal.show');
            if (visibleModals.length === 0) {
                // 如果没有可见的模态框但有backdrop，则清除它们
                clearModalBackdrops();
            }
        }
    });
    
    // 添加紧急清除按钮到body
    const clearButton = document.createElement('button');
    clearButton.id = 'emergency-clear-modals';
    clearButton.innerHTML = '清除遮罩';
    clearButton.style.position = 'fixed';
    clearButton.style.bottom = '10px';
    clearButton.style.right = '10px';
    clearButton.style.zIndex = '9999';
    clearButton.style.padding = '5px 10px';
    clearButton.style.backgroundColor = '#f44336';
    clearButton.style.color = 'white';
    clearButton.style.border = 'none';
    clearButton.style.borderRadius = '4px';
    clearButton.style.cursor = 'pointer';
    clearButton.addEventListener('click', clearModalBackdrops);
    document.body.appendChild(clearButton);
    
    document.getElementById('plugin-search-input').addEventListener('input', function() {
        searchPlugins(this.value);
    });
    
    document.getElementById('btn-refresh-plugins').addEventListener('click', function() {
        loadPlugins();
    });
});

// 加载插件列表
async function loadPlugins() {
    const pluginList = document.getElementById('plugin-list');
    
    try {
        pluginList.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">加载插件中...</p>
            </div>
        `;
        
        const response = await fetch('/api/plugins');
        const data = await response.json();
        
        if (data.success) {
            plugins = data.data.plugins;
            document.getElementById('plugin-count').textContent = plugins.length;
            filterPlugins(currentFilter);
        } else {
            throw new Error(data.error || '加载插件失败');
        }
    } catch (error) {
        console.error('加载插件列表失败:', error);
        pluginList.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                加载插件列表失败: ${error.message}
            </div>
        `;
    }
}

// 过滤插件
function filterPlugins(filter) {
    let filteredPlugins = [];
    
    if (filter === 'all') {
        filteredPlugins = plugins;
    } else if (filter === 'enabled') {
        filteredPlugins = plugins.filter(plugin => plugin.enabled);
    } else if (filter === 'disabled') {
        filteredPlugins = plugins.filter(plugin => !plugin.enabled);
    }
    
    renderPluginList(filteredPlugins);
}

// 渲染插件列表
function renderPluginList(pluginsList) {
    const pluginList = document.getElementById('plugin-list');
    
    if (pluginsList.length === 0) {
        pluginList.innerHTML = `
            <div class="alert alert-info text-center">
                <i class="bi bi-info-circle-fill me-2"></i>
                未找到匹配的插件
            </div>
        `;
        return;
    }
    
    let html = '';
    
    pluginsList.forEach(plugin => {
        const statusClass = plugin.enabled ? 'success' : 'secondary';
        const statusText = plugin.enabled ? '已启用' : '已禁用';
        
        html += `
            <div class="plugin-card card ${plugin.enabled ? '' : 'disabled'}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="card-title mb-0">${plugin.name}</h5>
                        <span class="badge bg-${statusClass}">${statusText}</span>
                    </div>
                    <p class="card-text">${plugin.description || '暂无描述'}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="text-muted small">
                            ${plugin.author || '未知作者'} | v${plugin.version || '1.0.0'}
                        </div>
                        <div class="plugin-actions">
                            <button class="btn btn-sm btn-outline-primary btn-config" data-plugin-id="${plugin.id}" ${!plugin.enabled ? 'disabled' : ''}>
                                <i class="bi bi-gear-fill me-1"></i>配置
                            </button>
                            <div class="form-check form-switch ms-2">
                                <input class="form-check-input plugin-toggle" type="checkbox" id="toggle-${plugin.id}" ${plugin.enabled ? 'checked' : ''} data-plugin-id="${plugin.id}">
                                <label class="form-check-label" for="toggle-${plugin.id}"></label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    pluginList.innerHTML = html;
    
    // 绑定事件
    document.querySelectorAll('.plugin-toggle').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const pluginId = this.getAttribute('data-plugin-id');
            togglePlugin(pluginId);
        });
    });
    
    document.querySelectorAll('.btn-config').forEach(button => {
        button.addEventListener('click', function() {
            const pluginId = this.getAttribute('data-plugin-id');
            loadPluginConfig(pluginId);
        });
    });
}

// 切换插件状态
async function togglePlugin(pluginId) {
    const plugin = plugins.find(p => p.id === pluginId);
    if (!plugin) return;
    
    try {
        const action = plugin.enabled ? 'disable' : 'enable';
        const response = await fetch(`/api/plugins/${pluginId}/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 更新本地状态
            plugin.enabled = !plugin.enabled;
            
            // 刷新UI
            filterPlugins(currentFilter);
            
            // 显示提示
            showToast(`插件已${action === 'enable' ? '启用' : '禁用'}`, 'success');
        } else {
            throw new Error(result.error || `操作失败`);
        }
    } catch (error) {
        console.error('切换插件状态失败:', error);
        showToast(`操作失败: ${error.message}`, 'danger');
    }
}

// 加载插件配置
async function loadPluginConfig(pluginId) {
    try {
        // 先清除可能存在的背景蒙层
        clearModalBackdrops();
        
        // 使用原生配置界面而不是我们的模态框
        const plugin = plugins.find(p => p.id === pluginId);
        if (!plugin) {
            showToast('插件不存在', 'danger');
            return;
        }
        
        // 使用新的配置方式 - 直接对原生按钮点击
        const configBtn = document.querySelector(`.config-btn[data-id="${pluginId}"]`);
        if (configBtn) {
            configBtn.click();
            return;
        }
        
        // 如果找不到原生按钮，使用我们的备用方案
        // 检查是否已有配置界面正在显示
        const existingConfig = document.querySelector('#config-container');
        if (existingConfig && existingConfig.style.display !== 'none') {
            // 如果原生配置界面已打开，请先关闭它
            console.log('已有配置界面正在显示，请先关闭它');
            showToast('请先关闭当前已打开的配置界面', 'warning');
            return;
        }
        
        // 继续处理我们的配置模态框，此部分仅作为备用
        currentPluginId = pluginId;
        
        // 显示加载状态
        document.getElementById('plugin-config-loading').style.display = 'block';
        document.getElementById('plugin-config-content').style.display = 'block';
        document.getElementById('plugin-config-error').style.display = 'none';
        document.getElementById('plugin-config-form').innerHTML = '';
        
        // 设置标题
        document.getElementById('plugin-config-title').textContent = `${plugin.name} 配置`;
        
        // 强制移除任何现有的背景遮罩
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // 确保模态框的样式重置
        const modalEl = document.getElementById('plugin-config-modal');
        modalEl.style.display = 'none';
        modalEl.style.paddingRight = '';
        modalEl.classList.remove('show');
        
        // 使用setTimeout确保DOM已经更新
        setTimeout(() => {
            // 重新初始化并显示模态框
            if (configModal) {
                try {
                    configModal.dispose();
                } catch (e) {
                    console.error('无法销毁旧模态框:', e);
                }
            }
            
            // 创建一个新的模态框实例
            configModal = new bootstrap.Modal(modalEl, {
                backdrop: true,
                keyboard: true,
                focus: true
            });
            
            // 显示模态框
            configModal.show();
            
            // 强制添加必要的类和样式
            setTimeout(() => {
                modalEl.classList.add('show');
                modalEl.style.display = 'block';
                document.body.classList.add('modal-open');
                
                // 确保模态框可见
                modalEl.style.zIndex = '2000';
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.style.zIndex = '1999';
                } else {
                    // 如果没有backdrop，手动创建一个
                    const newBackdrop = document.createElement('div');
                    newBackdrop.className = 'modal-backdrop fade show';
                    newBackdrop.style.zIndex = '1999';
                    document.body.appendChild(newBackdrop);
                }
            }, 50);
            
            // 获取配置
            fetch(`/api/plugin_config?plugin_id=${pluginId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        renderConfigForm(data.config);
                        
                        // 隐藏加载状态
                        document.getElementById('plugin-config-loading').style.display = 'none';
                    } else {
                        throw new Error(data.error || '获取配置失败');
                    }
                })
                .catch(error => {
                    console.error('加载插件配置失败:', error);
                    
                    // 显示错误
                    document.getElementById('plugin-config-loading').style.display = 'none';
                    document.getElementById('plugin-config-error').style.display = 'block';
                    document.getElementById('plugin-config-error').textContent = `加载配置失败: ${error.message}`;
                });
        }, 100);
    } catch (error) {
        console.error('初始化配置界面失败:', error);
        showToast(`配置界面加载失败: ${error.message}`, 'danger');
    }
}

// 渲染配置表单
function renderConfigForm(config) {
    const formContainer = document.getElementById('plugin-config-form');
    formContainer.innerHTML = '';
    
    if (Object.keys(config).length === 0) {
        formContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle-fill me-2"></i>
                此插件没有可配置的选项
            </div>
        `;
        return;
    }
    
    for (const section in config) {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'plugin-config-section mb-4';
        
        const sectionTitle = document.createElement('h5');
        sectionTitle.className = 'mb-3';
        sectionTitle.textContent = section;
        sectionEl.appendChild(sectionTitle);
        
        for (const key in config[section]) {
            const value = config[section][key];
            const formGroup = document.createElement('div');
            formGroup.className = 'mb-3';
            
            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = key;
            formGroup.appendChild(label);
            
            let input;
            
            if (typeof value === 'boolean') {
                // 布尔值使用开关
                const switchDiv = document.createElement('div');
                switchDiv.className = 'form-check form-switch';
                
                input = document.createElement('input');
                input.className = 'form-check-input';
                input.type = 'checkbox';
                input.checked = value;
                input.setAttribute('data-section', section);
                input.setAttribute('data-key', key);
                input.setAttribute('data-type', 'boolean');
                
                switchDiv.appendChild(input);
                formGroup.appendChild(switchDiv);
            } else if (typeof value === 'number') {
                // 数字使用数字输入框
                input = document.createElement('input');
                input.className = 'form-control';
                input.type = 'number';
                input.value = value;
                input.setAttribute('data-section', section);
                input.setAttribute('data-key', key);
                input.setAttribute('data-type', 'number');
                formGroup.appendChild(input);
            } else {
                // 字符串使用文本输入框
                input = document.createElement('input');
                input.className = 'form-control';
                input.type = 'text';
                input.value = value;
                input.setAttribute('data-section', section);
                input.setAttribute('data-key', key);
                input.setAttribute('data-type', 'string');
                formGroup.appendChild(input);
            }
            
            // 保持只读，不可修改
            if (input) {
                input.setAttribute('readonly', 'readonly');
                input.classList.add('disabled');
                input.style.opacity = '0.7';
                input.style.cursor = 'not-allowed';
            }
            
            sectionEl.appendChild(formGroup);
        }
        
        formContainer.appendChild(sectionEl);
    }
}

// 清除所有模态框背景
function clearModalBackdrops() {
    // 移除所有backdrop
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
    });
    
    // 移除body上的相关样式
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // 恢复#config-container的可见性
    const configContainer = document.querySelector('#config-container');
    if (configContainer) {
        configContainer.style.zIndex = '';
        configContainer.style.visibility = '';
        configContainer.style.display = '';
    }
    
    // 确保所有灰色遮罩层都被移除
    const overlays = document.querySelectorAll('.modal-backdrop, .fade.show');
    overlays.forEach(overlay => {
        if (overlay.classList.contains('modal-backdrop')) {
            overlay.remove();
        }
    });
}

// 关闭配置模态框
function closeConfigModal() {
    if (configModal) {
        try {
            configModal.hide();
            
            // 立即清除背景蒙层而不等待
            clearModalBackdrops();
        } catch (e) {
            console.error('关闭模态框失败:', e);
            
            // 如果常规方法失败，使用直接的DOM操作
            const modalEl = document.getElementById('plugin-config-modal');
            modalEl.classList.remove('show');
            modalEl.style.display = 'none';
            modalEl.setAttribute('aria-hidden', 'true');
            
            // 清除所有背景蒙层
            clearModalBackdrops();
        }
    }
}

// 显示提示
function showToast(message, type = 'info') {
    // 查找或创建toast容器
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // 创建toast
    const id = 'toast-' + Date.now();
    const html = `
        <div id="${id}" class="toast align-items-center text-white bg-${type}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', html);
    
    // 显示toast
    const toastEl = document.getElementById(id);
    const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 3000 });
    toast.show();
    
    // 清理
    toastEl.addEventListener('hidden.bs.toast', function() {
        this.remove();
    });
}

// 搜索插件
function searchPlugins(keyword) {
    if (!keyword.trim()) {
        filterPlugins(currentFilter);
        return;
    }
    
    const lowerKeyword = keyword.toLowerCase().trim();
    const results = plugins.filter(plugin => {
        return (
            plugin.name.toLowerCase().includes(lowerKeyword) ||
            (plugin.description && plugin.description.toLowerCase().includes(lowerKeyword)) ||
            (plugin.author && plugin.author.toLowerCase().includes(lowerKeyword))
        );
    });
    
    renderPluginList(results);
}

// 监听原生配置界面
function setupConfigContainerObserver() {
    // 创建一个观察器实例
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const configContainer = document.querySelector('#config-container');
                if (configContainer && configContainer.style.display !== 'none') {
                    // 如果原生配置界面显示，则关闭我们的模态框
                    if (configModal) {
                        try {
                            closeConfigModal();
                        } catch (e) {
                            console.error('关闭模态框失败', e);
                        }
                    }
                }
            }
        });
    });
    
    // 监听配置容器的变化
    const configContainer = document.querySelector('#config-container');
    if (configContainer) {
        observer.observe(configContainer, { attributes: true });
        console.log('已设置配置容器观察器');
    }
    
    // 监听body上模态框状态的变化
    const bodyObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (document.body.classList.contains('modal-open')) {
                    // 如果模态框打开，确保原生配置界面隐藏
                    const configContainer = document.querySelector('#config-container');
                    if (configContainer) {
                        configContainer.style.display = 'none';
                    }
                }
            }
        });
    });
    
    // 监听body的类变化
    bodyObserver.observe(document.body, { attributes: true });
    
    // 添加全局事件拦截
    document.body.addEventListener('click', function(e) {
        // 检查是否是配置按钮
        if (e.target.classList.contains('config-btn') || e.target.closest('.config-btn')) {
            // 延迟检查原生配置界面是否已打开
            setTimeout(() => {
                const configContainer = document.querySelector('#config-container');
                if (configContainer && configContainer.style.display !== 'none') {
                    // 添加关闭按钮的点击事件
                    const closeBtn = configContainer.querySelector('.close');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', function() {
                            configContainer.style.display = 'none';
                        });
                    }
                }
            }, 100);
        }
    }, true);
} 