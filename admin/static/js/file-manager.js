/**
 * XYBotV2 文件管理器脚本
 * 实现文件浏览、创建、编辑、删除等功能
 */

// 当前路径
let currentPath = '/';
// 当前选中的文件/文件夹
let selectedItem = null;
// 添加分页相关变量
let currentPage = 1;
let totalPages = 1;
let pageSize = 100;
// 添加全局错误恢复标志
let isRecovering = false;
// 添加加载状态标志
let isLoading = false;

// 全局超时计时器
let globalTimeoutTimer = null;

// DOM元素引用
const elements = {
    fileList: document.getElementById('file-list'),
    fileListContainer: document.getElementById('file-list-container'),
    folderTree: document.getElementById('folder-tree'),
    pathBreadcrumb: document.getElementById('path-breadcrumb'),
    btnNewFile: document.getElementById('btn-new-file'),
    btnNewFileHeader: document.getElementById('btn-new-file-header'),
    btnNewFolder: document.getElementById('btn-new-folder'),
    btnNewFolderHeader: document.getElementById('btn-new-folder-header'),
    btnRefreshFiles: document.getElementById('btn-refresh-files'),
    btnRefreshFilesHeader: document.getElementById('btn-refresh-files-header'),
    btnGoUp: document.getElementById('btn-go-up'),
    fileEditor: document.getElementById('file-editor'),
    fileEditorContainer: document.getElementById('file-editor-container'),
    editorFilename: document.getElementById('editor-filename'),
    btnSaveFile: document.getElementById('btn-save-file'),
    btnCloseEditor: document.getElementById('btn-close-editor'),
    fileCount: document.getElementById('file-count'),
    selectionInfo: document.getElementById('selection-info'),
    statusInfo: document.getElementById('status-info'),
    newFileNameInput: document.getElementById('new-file-name'),
    newFileContentInput: document.getElementById('new-file-content'),
    btnCreateFile: document.getElementById('btn-create-file'),
    newFolderNameInput: document.getElementById('new-folder-name'),
    btnCreateFolder: document.getElementById('btn-create-folder'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete'),
    deleteItemName: document.getElementById('delete-item-name'),
    deleteWarningMessage: document.getElementById('delete-warning-message'),
    renameItemName: document.getElementById('rename-item-name'),
    btnConfirmRename: document.getElementById('btn-confirm-rename'),
    lineNumbers: document.getElementById('line-numbers'),
    loadingFiles: document.getElementById('loading-files'),
    emptyFolderMessage: document.getElementById('empty-folder-message'),
    errorMessage: document.getElementById('error-message'),
    errorDetails: document.getElementById('error-details'),
    btnRefreshAddress: document.getElementById('btn-refresh-address'),
    newFileModal: document.getElementById('new-file-modal'),
    newFolderModal: document.getElementById('new-folder-modal'),
    deleteConfirmModal: document.getElementById('delete-confirm-modal'),
    renameModal: document.getElementById('rename-modal'),
    uploadFileModal: document.getElementById('upload-file-modal'),
    uploadPath: document.getElementById('upload-path'),
    uploadFiles: document.getElementById('upload-files'),
    btnStartUpload: document.getElementById('btn-start-upload'),
    uploadProgressContainer: document.getElementById('upload-progress-container'),
    uploadProgressBar: document.getElementById('upload-progress-bar'),
    uploadStatus: document.getElementById('upload-status'),
    btnUploadFile: document.getElementById('btn-upload-file')
};

// 模态框实例
const modals = {
    newFile: elements.newFileModal ? new bootstrap.Modal(elements.newFileModal) : null,
    newFolder: elements.newFolderModal ? new bootstrap.Modal(elements.newFolderModal) : null,
    deleteConfirm: elements.deleteConfirmModal ? new bootstrap.Modal(elements.deleteConfirmModal) : null,
    rename: elements.renameModal ? new bootstrap.Modal(elements.renameModal) : null,
    uploadFile: elements.uploadFileModal ? new bootstrap.Modal(elements.uploadFileModal) : null
};

// 页面上下文和状态管理
// let pageContext = {
//     currentPath: '/',
//     fileCount: 0,
//     selectedItem: null,
//     isLoading: false,
//     lastRefresh: Date.now(),
//     timeoutId: null,
//     pagination: {
//         currentPage: 1,
//         totalPages: 1,
//         totalItems: 0,
//         limit: 100
//     }
// };

// 初始化函数
function init() {
    console.log('初始化文件管理器...版本 1.0.3');
    console.log('当前页面路径:', window.location.pathname);
    console.log('DOM元素检查开始');
    
    // 检查必要元素是否存在
    if (!elements.fileList) {
        console.error('缺少必要的DOM元素: file-list');
        document.body.innerHTML = '<div class="alert alert-danger m-3">文件管理器加载失败：缺少必要的DOM元素</div>';
        return;
    }
    
    console.log('DOM元素检查完成，关键元素存在');
    
    // 初始化模态框
    console.log('开始初始化模态框');
    initModals();
    
    // 设置编辑器UI
    console.log('设置编辑器UI');
    setupEditorUI();
    
    // 注册事件处理程序
    console.log('注册事件处理程序');
    registerEventHandlers();
    
    // 加载首页文件
    console.log('加载首页文件:', currentPath);
    loadFiles(currentPath);
    
    // 加载文件夹树
    console.log('加载文件夹树');
    loadFolderTree();
    
    // 设置初始化标志
    window.fileManagerInitialized = true;
    
    // 触发加载完成事件
    window.dispatchEvent(new Event('fileManagerLoaded'));
    
    console.log('文件管理器初始化完成');
}

// 初始化模态框
function initModals() {
    try {
        // 使用延迟初始化，避免在DOM未完全加载时初始化
        setTimeout(() => {
            // 新建文件模态框
            if (elements.newFileModal) {
                try {
                    modals.newFile = new bootstrap.Modal(elements.newFileModal);
                    console.log('新建文件模态框初始化成功');
                } catch (e) {
                    console.error('初始化新建文件模态框失败:', e);
                }
            }
            
            // 新建文件夹模态框
            if (elements.newFolderModal) {
                try {
                    modals.newFolder = new bootstrap.Modal(elements.newFolderModal);
                    console.log('新建文件夹模态框初始化成功');
                } catch (e) {
                    console.error('初始化新建文件夹模态框失败:', e);
                }
            }
            
            // 删除确认模态框
            if (elements.deleteConfirmModal) {
                try {
                    modals.deleteConfirm = new bootstrap.Modal(elements.deleteConfirmModal);
                    console.log('删除确认模态框初始化成功');
                } catch (e) {
                    console.error('初始化删除确认模态框失败:', e);
                }
            }
            
            // 重命名模态框
            if (elements.renameModal) {
                try {
                    modals.rename = new bootstrap.Modal(elements.renameModal);
                    console.log('重命名模态框初始化成功');
                } catch (e) {
                    console.error('初始化重命名模态框失败:', e);
                }
            }
        }, 500);
    } catch (e) {
        console.error('模态框初始化过程中发生异常:', e);
    }
}

// 注册所有事件处理程序
function registerEventHandlers() {
    console.log('注册事件处理程序');
    
    // 文件操作事件
    try {
        // 新建文件按钮 - 兼容两个不同的按钮ID
        if (elements.btnNewFile) {
            elements.btnNewFile.addEventListener('click', showNewFileModal);
        }
        if (elements.btnNewFileHeader) {
            elements.btnNewFileHeader.addEventListener('click', showNewFileModal);
        }
        
        // 新建文件夹按钮 - 兼容两个不同的按钮ID
        if (elements.btnNewFolder) {
            elements.btnNewFolder.addEventListener('click', showNewFolderModal);
        }
        if (elements.btnNewFolderHeader) {
            elements.btnNewFolderHeader.addEventListener('click', showNewFolderModal);
        }
        
        // 刷新按钮 - 兼容两个不同的按钮ID
        if (elements.btnRefreshFiles) {
            elements.btnRefreshFiles.addEventListener('click', () => loadFiles(currentPath));
        }
        if (elements.btnRefreshFilesHeader) {
            elements.btnRefreshFilesHeader.addEventListener('click', () => loadFiles(currentPath));
        }
        
        // 上一级按钮
        if (elements.btnGoUp) {
            elements.btnGoUp.addEventListener('click', navigateUp);
        }
        
        // 刷新地址栏按钮
        if (elements.btnRefreshAddress) {
            elements.btnRefreshAddress.addEventListener('click', () => loadFiles(currentPath));
        }
        
        // 创建文件按钮
        if (elements.btnCreateFile) {
            elements.btnCreateFile.addEventListener('click', createNewFile);
        }
        
        // 创建文件夹按钮
        if (elements.btnCreateFolder) {
            elements.btnCreateFolder.addEventListener('click', createNewFolder);
        }
        
        // 确认删除按钮
        if (elements.btnConfirmDelete) {
            elements.btnConfirmDelete.addEventListener('click', deleteItem);
        }
        
        // 确认重命名按钮
        if (elements.btnConfirmRename) {
            elements.btnConfirmRename.addEventListener('click', renameItem);
        }
        
        // 保存文件按钮
        if (elements.btnSaveFile) {
            elements.btnSaveFile.addEventListener('click', saveFile);
        }
        
        // 关闭编辑器按钮
        if (elements.btnCloseEditor) {
            elements.btnCloseEditor.addEventListener('click', closeEditor);
        }
        
        // 文件编辑器输入事件
        if (elements.fileEditor) {
            elements.fileEditor.addEventListener('input', () => {
                // 启用保存按钮
                if (elements.btnSaveFile) {
                    elements.btnSaveFile.disabled = false;
                }
                
                // 更新行号
                updateLineNumbers();
            });
            
            // 编辑器滚动同步行号
            elements.fileEditor.addEventListener('scroll', () => {
                if (elements.lineNumbers) {
                    elements.lineNumbers.scrollTop = elements.fileEditor.scrollTop;
                }
            });
        }
        
        // 处理新建文件模态框输入事件
        if (elements.newFileNameInput) {
            elements.newFileNameInput.addEventListener('keyup', function(event) {
                if (event.key === 'Enter') {
                    createNewFile();
                }
            });
        }
        
        // 处理新建文件夹模态框输入事件
        if (elements.newFolderNameInput) {
            elements.newFolderNameInput.addEventListener('keyup', function(event) {
                if (event.key === 'Enter') {
                    createNewFolder();
                }
            });
        }
        
        // 处理重命名模态框输入事件
        if (elements.renameItemName) {
            elements.renameItemName.addEventListener('keyup', function(event) {
                if (event.key === 'Enter') {
                    renameItem();
                }
            });
        }
        
        console.log('事件处理程序注册完成');
    } catch (error) {
        console.error('注册事件处理程序失败:', error);
    }
    
    // 文件上传相关事件
    if (elements.btnUploadFile) {
        elements.btnUploadFile.addEventListener('click', function() {
            // 设置上传路径为当前路径
            if (elements.uploadPath) {
                elements.uploadPath.value = currentPath;
            }
            // 显示上传模态框
            if (modals.uploadFile) {
                modals.uploadFile.show();
            } else {
                console.error('上传模态框实例未创建');
                showToast('错误', '无法打开上传窗口，请刷新页面后重试', 'error');
            }
        });
    }
    
    if (elements.btnStartUpload) {
        elements.btnStartUpload.addEventListener('click', uploadFiles);
    }
}

// 设置全局错误处理
window.addEventListener('error', function(event) {
    console.error('全局错误:', event.error);
    handleGlobalError(event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('未处理的Promise拒绝:', event.reason);
    handleGlobalError(event.reason);
});

// 全局错误处理函数
function handleGlobalError(error) {
    if (isRecovering) return; // 防止重复恢复
    
    isRecovering = true;
    console.warn('触发错误恢复机制');
    
    try {
        showToast('系统错误', '发生意外错误，正在尝试恢复...', 'warning');
        
        // 清除任何可能的超时计时器
        if (globalTimeoutTimer) {
            clearTimeout(globalTimeoutTimer);
            globalTimeoutTimer = null;
        }
        
        // 重设UI状态
        resetUIState();
        
        // 重新加载当前路径，但重置到第一页
        currentPage = 1;
        setTimeout(() => {
            loadFiles(currentPath);
            isRecovering = false;
        }, 1000);
    } catch (e) {
        console.error('恢复过程中出错:', e);
        showToast('致命错误', '无法恢复应用状态，请刷新页面', 'danger');
    }
}

// 重设UI状态
function resetUIState() {
    // 隐藏所有可能的加载和错误指示器
    if (elements.loadingFiles) elements.loadingFiles.style.display = 'none';
    if (elements.emptyFolderMessage) elements.emptyFolderMessage.style.display = 'none';
    if (elements.errorMessage) elements.errorMessage.style.display = 'none';
    
    // 重置选择状态
    selectedItem = null;
    if (elements.selectionInfo) elements.selectionInfo.textContent = '';
    
    // 清空文件列表
    if (elements.fileList) {
        while (elements.fileList.firstChild) {
            if (elements.fileList.firstChild === elements.loadingFiles ||
                elements.fileList.firstChild === elements.emptyFolderMessage ||
                elements.fileList.firstChild === elements.errorMessage) {
                elements.fileList.firstChild.style.display = 'none';
            } else {
                elements.fileList.removeChild(elements.fileList.firstChild);
            }
        }
    }
    
    // 更新状态信息
    if (elements.statusInfo) {
        elements.statusInfo.textContent = '正在恢复...';
        elements.statusInfo.className = 'text-warning';
    }
}

// 设置全局超时处理
function setupGlobalTimeout(milliseconds = 30000) {
    // 清除现有计时器
    if (globalTimeoutTimer) {
        clearTimeout(globalTimeoutTimer);
    }
    
    // 设置新计时器
    globalTimeoutTimer = setTimeout(() => {
        console.warn(`操作超时 (${milliseconds}ms)`);
        handleGlobalError(new Error('操作超时'));
    }, milliseconds);
}

// 清除全局超时
function clearGlobalTimeout() {
    if (globalTimeoutTimer) {
        clearTimeout(globalTimeoutTimer);
        globalTimeoutTimer = null;
    }
}

// 加载文件
function loadFiles(path, page = 1) {
    // 更新当前路径
    currentPath = path;
    console.log(`加载文件夹: ${path}, 页码: ${page}`);
    
    // 显示加载状态
    showLoading();
    
    // 标记为加载中
    isLoading = true;
    
    // 发送请求获取文件列表
    fetch(`/api/files/list?path=${encodeURIComponent(path)}&page=${page}`)
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || `HTTP错误! 状态: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            isLoading = false;
            // 隐藏加载状态
            hideLoading();
            
            console.log('文件数据加载成功:', data);
            
            if (data.success) {
                // 更新当前路径（防止异步请求返回时路径已变）
                if (currentPath === path) {
                    // 更新面包屑导航
                    updateBreadcrumb(path);
                    
                    // 检查items数组是否有效
                    if (!data.items || !Array.isArray(data.items)) {
                        console.error('API返回无效文件列表:', data);
                        showError('服务器返回的文件列表格式无效');
                        return;
                    }
                    
                    // 显示文件列表
                    displayFiles(data.items);
                    
                    // 更新文件计数
                    updateFileCount(data.items.length);
                    
                    // 更新分页信息
                    if (data.pagination) {
                        updatePagination(data.pagination);
                    }
                }
            } else {
                throw new Error(data.message || '加载文件失败');
            }
        })
        .catch(error => {
            isLoading = false;
            // 隐藏加载状态
            hideLoading();
            
            console.error('加载文件失败:', error);
            showError(error.message);
        });
}

// 显示文件列表
function displayFiles(files) {
    if (!elements.fileList) return;
    
    // 确保加载指示器被隐藏
    hideLoading();
    
    // 确保files是数组类型
    if (!files || !Array.isArray(files)) {
        console.error('文件列表数据无效:', files);
        showError('文件列表数据格式无效');
        return;
    }
    
    // 清空现有内容
    while (elements.fileList.firstChild) {
        if (elements.fileList.firstChild === elements.loadingFiles ||
            elements.fileList.firstChild === elements.emptyFolderMessage ||
            elements.fileList.firstChild === elements.errorMessage) {
            elements.fileList.firstChild.style.display = 'none';
        } else {
            elements.fileList.removeChild(elements.fileList.firstChild);
        }
    }
    
    // 文件列表为空
    if (files.length === 0) {
        if (elements.emptyFolderMessage) elements.emptyFolderMessage.style.display = 'flex';
        return;
    }
    
    // 创建文件列表项
    files.forEach(file => {
        const itemEl = document.createElement('div');
        itemEl.className = 'file-list-item';
        itemEl.dataset.path = file.path;
        itemEl.dataset.name = file.name;
        itemEl.dataset.type = file.type;
        
        // 图标类
        let iconClass;
        if (file.type === 'directory') {
            iconClass = 'bi-folder-fill file-icon-folder';
        } else {
            // 根据文件扩展名选择图标
            const extension = file.name.split('.').pop().toLowerCase();
            switch (extension) {
                case 'py': iconClass = 'bi-filetype-py file-icon-py'; break;
                case 'js': iconClass = 'bi-filetype-js file-icon-js'; break;
                case 'html': iconClass = 'bi-filetype-html file-icon-html'; break;
                case 'css': iconClass = 'bi-filetype-css file-icon-css'; break;
                case 'json': iconClass = 'bi-filetype-json file-icon-json'; break;
                case 'md': iconClass = 'bi-filetype-md file-icon-md'; break;
                case 'txt': iconClass = 'bi-filetype-txt file-icon-txt'; break;
                default: iconClass = 'bi-file-earmark file-icon-txt';
            }
        }
        
        itemEl.innerHTML = `
            <div class="file-info">
                <i class="bi ${iconClass}"></i>
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
                <div class="file-date">${formatDate(file.modified)}</div>
            </div>
            <div class="file-actions">
                <button class="btn btn-sm btn-outline-primary action-edit" title="编辑" ${file.type === 'directory' ? 'disabled' : ''}>
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-success action-rename" title="重命名">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger action-delete" title="删除">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        // 添加事件处理程序
        itemEl.addEventListener('click', (e) => {
            // 忽略点击操作按钮的情况
            if (e.target.closest('.file-actions')) return;
            
            selectItem(itemEl);
            
            // 如果是文件夹，导航到该文件夹
            if (file.type === 'directory') {
                loadFiles(file.path);
            }
        });
        
        // 编辑按钮
        const editBtn = itemEl.querySelector('.action-edit');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (file.type !== 'directory') {
                    openEditor(file.path, file.name);
                }
            });
        }
        
        // 重命名按钮
        const renameBtn = itemEl.querySelector('.action-rename');
        if (renameBtn) {
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showRenameModal(file.path, file.name);
            });
        }
        
        // 删除按钮
        const deleteBtn = itemEl.querySelector('.action-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showDeleteModal(file.path, file.name, file.type === 'directory');
            });
        }
        
        elements.fileList.appendChild(itemEl);
    });
}

// 加载文件夹树
function loadFolderTree() {
    if (!elements.folderTree) return;
    
    // 显示加载中
    elements.folderTree.innerHTML = `
        <div class="d-flex align-items-center">
            <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                <span class="visually-hidden">加载中...</span>
            </div>
            <span>加载文件夹...</span>
        </div>
    `;
    
    fetch('/api/files/tree')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.tree) {
                console.log('成功加载文件夹树');
                
                // 创建根文件夹
                elements.folderTree.innerHTML = '';
                const rootLi = document.createElement('li');
                rootLi.className = 'folder-item';
                rootLi.dataset.path = '/';
                
                rootLi.innerHTML = `
                    <span class="folder-toggle"><i class="bi bi-chevron-right"></i></span>
                    <i class="bi bi-folder-fill file-icon-folder"></i>
                    <span>根目录</span>
                `;
                
                // 点击根目录
                rootLi.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectFolderTreeItem(rootLi);
                    loadFiles('/');
                });
                
                elements.folderTree.appendChild(rootLi);
                
                // 构建子文件夹
                if (data.tree.children && data.tree.children.length > 0) {
                    rootLi.classList.add('expanded');
                    
                    const ul = document.createElement('ul');
                    data.tree.children.forEach(child => {
                        if (child.type === 'directory') {
                            const li = createFolderTreeItem(child);
                            ul.appendChild(li);
                        }
                    });
                    
                    rootLi.appendChild(ul);
                }
            } else {
                console.error('加载文件夹树失败，无效的响应数据:', data);
                elements.folderTree.innerHTML = `
                    <div class="text-danger">
                        <i class="bi bi-exclamation-triangle me-1"></i>
                        加载文件夹失败
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('加载文件夹树失败:', error);
            elements.folderTree.innerHTML = `
                <div class="text-danger">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    加载文件夹失败: ${error.message}
                </div>
            `;
        });
}

// 创建文件夹树项
function createFolderTreeItem(folder) {
    const li = document.createElement('li');
    li.className = 'folder-item';
    li.dataset.path = folder.path;
    
    li.innerHTML = `
        <span class="folder-toggle"><i class="bi bi-chevron-right"></i></span>
        <i class="bi bi-folder-fill file-icon-folder"></i>
        <span>${folder.name}</span>
    `;
    
    // 如果有子文件夹，添加展开/折叠功能
    if (folder.children && folder.children.length > 0) {
        // 创建子文件夹列表
        const ul = document.createElement('ul');
        
        // 修复递归问题：防止无限递归
        const maxDepth = 10; // 最大递归深度
        function addChildrenWithDepthLimit(children, parent, depth) {
            if (depth > maxDepth) return; // 防止过深递归
            
            children.forEach(child => {
                if (child.type === 'directory') {
                    const childLi = document.createElement('li');
                    childLi.className = 'folder-item';
                    childLi.dataset.path = child.path;
                    
                    childLi.innerHTML = `
                        <span class="folder-toggle"><i class="bi bi-chevron-right"></i></span>
                        <i class="bi bi-folder-fill file-icon-folder"></i>
                        <span>${child.name}</span>
                    `;
                    
                    // 点击文件夹项导航到该文件夹
                    childLi.addEventListener('click', (e) => {
                        e.stopPropagation();
                        selectFolderTreeItem(childLi);
                        loadFiles(child.path);
                    });
                    
                    // 如果有子文件夹，递归添加（有深度限制）
                    if (child.children && child.children.length > 0) {
                        const childUl = document.createElement('ul');
                        addChildrenWithDepthLimit(child.children, childUl, depth + 1);
                        childLi.appendChild(childUl);
                        
                        // 添加展开/折叠事件
                        const toggler = childLi.querySelector('.folder-toggle');
                        if (toggler) {
                            toggler.addEventListener('click', (e) => {
                                e.stopPropagation();
                                childLi.classList.toggle('expanded');
                            });
                        }
                    }
                    
                    parent.appendChild(childLi);
                }
            });
        }
        
        // 使用有深度限制的函数添加子文件夹
        addChildrenWithDepthLimit(folder.children, ul, 1);
        li.appendChild(ul);
        
        // 添加展开/折叠事件
        const toggler = li.querySelector('.folder-toggle');
        if (toggler) {
            toggler.addEventListener('click', (e) => {
                e.stopPropagation();
                li.classList.toggle('expanded');
            });
        }
    }
    
    // 点击文件夹项导航到该文件夹
    li.addEventListener('click', (e) => {
        e.stopPropagation();
        selectFolderTreeItem(li);
        loadFiles(folder.path);
    });
    
    return li;
}

// 选择文件夹树项
function selectFolderTreeItem(item) {
    // 移除之前选中的项
    const activeItems = elements.folderTree.querySelectorAll('.active');
    activeItems.forEach(el => el.classList.remove('active'));
    
    // 添加新的选中项
    item.classList.add('active');
}

// 更新面包屑导航
function updateBreadcrumb(path) {
    if (!elements.pathBreadcrumb) return;
    
    // 清空现有内容
    elements.pathBreadcrumb.innerHTML = '';
    
    // 添加根目录
    const rootLi = document.createElement('li');
    rootLi.className = 'breadcrumb-item';
    rootLi.innerHTML = '<a href="#">根目录</a>';
    rootLi.addEventListener('click', (e) => {
        e.preventDefault();
        loadFiles('/');
    });
    elements.pathBreadcrumb.appendChild(rootLi);
    
    // 如果是根目录，直接返回
    if (path === '/') {
        rootLi.classList.add('active');
        return;
    }
    
    // 分割路径
    const parts = path.split('/').filter(part => part);
    let currentPath = '';
    
    // 添加每一部分
    parts.forEach((part, index) => {
        currentPath += '/' + part;
        
        const li = document.createElement('li');
        li.className = 'breadcrumb-item';
        
        if (index === parts.length - 1) {
            li.classList.add('active');
            li.textContent = part;
        } else {
            li.innerHTML = `<a href="#">${part}</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                loadFiles(currentPath);
            });
        }
        
        elements.pathBreadcrumb.appendChild(li);
    });
}

// 导航到上一级目录
function navigateUp() {
    // 如果已经在根目录，不进行操作
    if (currentPath === '/' || isLoading) {
        return;
    }
    
    // 获取上一级路径
    const path = currentPath;
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    const parentPath = parts.length > 0 ? '/' + parts.join('/') : '/';
    
    // 加载上一级目录
    loadFiles(parentPath);
}

// 选择文件/文件夹
function selectItem(item) {
    // 移除之前选中的项
    const activeItems = elements.fileList.querySelectorAll('.active');
    activeItems.forEach(el => el.classList.remove('active'));
    
    // 添加新的选中项
    item.classList.add('active');
    selectedItem = item;
    
    // 更新选中信息
    updateSelectionInfo(item.dataset.name, item.dataset.type);
}

// 更新选中信息
function updateSelectionInfo(name, type) {
    if (!elements.selectionInfo) return;
    
    elements.selectionInfo.textContent = `已选中: ${name} (${type === 'directory' ? '文件夹' : '文件'})`;
}

// 更新文件计数
function updateFileCount(count) {
    if (!elements.fileCount) return;
    
    elements.fileCount.textContent = count;
}

// 显示加载状态
function showLoading() {
    if (!elements.loadingFiles) return;
    
    // 隐藏其他消息
    if (elements.emptyFolderMessage) elements.emptyFolderMessage.style.display = 'none';
    if (elements.errorMessage) elements.errorMessage.style.display = 'none';
    
    // 显示加载消息
    elements.loadingFiles.style.display = 'flex';
}

// 隐藏加载状态
function hideLoading() {
    if (!elements.loadingFiles) return;
    
    // 隐藏加载消息
    elements.loadingFiles.style.display = 'none';
}

// 显示错误消息
function showError(message) {
    console.error('文件管理器错误:', message);
    
    // 隐藏加载中动画
    if (elements.loadingFiles) {
        elements.loadingFiles.style.display = 'none';
    }
    
    // 显示错误消息
    if (elements.errorMessage) {
        elements.errorMessage.style.display = 'block';
        if (elements.errorDetails) {
            elements.errorDetails.textContent = message || '未知错误';
        }
    }
    
    // 显示Toast消息
    try {
        showToast('错误', message || '操作失败', 'danger');
    } catch (e) {
        console.error('显示Toast失败:', e);
    }
    
    // 确保空文件夹提示被隐藏
    if (elements.emptyFolderMessage) {
        elements.emptyFolderMessage.style.display = 'none';
    }
}

// 显示新建文件模态框
function showNewFileModal() {
    console.log('尝试显示新建文件模态框');
    
    if (!modals.newFile) {
        console.error('新建文件模态框未初始化!');
        
        // 尝试重新初始化
        if (elements.newFileModal) {
            try {
                console.log('尝试重新初始化新建文件模态框');
                modals.newFile = new bootstrap.Modal(elements.newFileModal);
            } catch (error) {
                console.error('重新初始化模态框失败:', error);
                alert('显示新建文件窗口失败，请查看控制台以获取详细信息');
                return;
            }
        } else {
            console.error('找不到新建文件模态框元素!');
            alert('找不到新建文件窗口元素，请刷新页面再试');
            return;
        }
    }
    
    // 重置输入
    if (elements.newFileNameInput) elements.newFileNameInput.value = '';
    if (elements.newFileContentInput) elements.newFileContentInput.value = '';
    
    // 显示模态框
    try {
        console.log('显示新建文件模态框');
        modals.newFile.show();
    } catch (error) {
        console.error('显示模态框失败:', error);
        
        // 尝试使用原生方法显示
        if (elements.newFileModal) {
            console.log('尝试使用原生方法显示模态框');
            elements.newFileModal.classList.add('show');
            elements.newFileModal.style.display = 'block';
            document.body.classList.add('modal-open');
            
            // 创建背景遮罩
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
        }
    }
}

// 显示新建文件夹模态框
function showNewFolderModal() {
    console.log('尝试显示新建文件夹模态框');
    
    if (!modals.newFolder) {
        console.error('新建文件夹模态框未初始化!');
        
        // 尝试重新初始化
        if (elements.newFolderModal) {
            try {
                console.log('尝试重新初始化新建文件夹模态框');
                modals.newFolder = new bootstrap.Modal(elements.newFolderModal);
            } catch (error) {
                console.error('重新初始化模态框失败:', error);
                alert('显示新建文件夹窗口失败，请查看控制台以获取详细信息');
                return;
            }
        } else {
            console.error('找不到新建文件夹模态框元素!');
            alert('找不到新建文件夹窗口元素，请刷新页面再试');
            return;
        }
    }
    
    // 重置输入
    if (elements.newFolderNameInput) elements.newFolderNameInput.value = '';
    
    // 显示模态框
    try {
        console.log('显示新建文件夹模态框');
        modals.newFolder.show();
    } catch (error) {
        console.error('显示模态框失败:', error);
        
        // 尝试使用原生方法显示
        if (elements.newFolderModal) {
            console.log('尝试使用原生方法显示模态框');
            elements.newFolderModal.classList.add('show');
            elements.newFolderModal.style.display = 'block';
            document.body.classList.add('modal-open');
            
            // 创建背景遮罩
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
        }
    }
}

// 显示删除确认模态框
function showDeleteModal(path, name, isDirectory) {
    if (!modals.deleteConfirm) return;
    
    // 设置项目信息
    if (elements.deleteItemName) elements.deleteItemName.textContent = name;
    
    // 设置特殊警告
    if (elements.deleteWarningMessage) {
        if (isDirectory) {
            elements.deleteWarningMessage.textContent = '此操作将永久删除该文件夹及其中的所有内容，且无法恢复。';
        } else {
            elements.deleteWarningMessage.textContent = '此操作将永久删除该文件，且无法恢复。';
        }
    }
    
    // 保存路径到按钮
    if (elements.btnConfirmDelete) {
        elements.btnConfirmDelete.dataset.path = path;
        elements.btnConfirmDelete.dataset.isDirectory = isDirectory;
    }
    
    // 显示模态框
    modals.deleteConfirm.show();
}

// 显示重命名模态框
function showRenameModal(path, name) {
    if (!modals.rename) return;
    
    // 设置输入值
    if (elements.renameItemName) elements.renameItemName.value = name;
    
    // 保存路径到按钮
    if (elements.btnConfirmRename) {
        elements.btnConfirmRename.dataset.path = path;
        elements.btnConfirmRename.dataset.oldName = name;
    }
    
    // 显示模态框
    modals.rename.show();
}

// 创建新文件
function createNewFile() {
    if (!elements.newFileNameInput || !elements.newFileContentInput) return;
    
    const fileName = elements.newFileNameInput.value.trim();
    const fileContent = elements.newFileContentInput.value;
    
    if (!fileName) {
        alert('请输入文件名');
        return;
    }
    
    // 构建完整路径
    let filePath = currentPath;
    if (filePath !== '/' && !filePath.endsWith('/')) filePath += '/';
    filePath += fileName;
    
    // 发送请求创建文件
    fetch('/api/files/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            path: filePath,
            content: fileContent,
            type: 'file'
        }),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.message || `HTTP错误! 状态: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // 关闭模态框
            if (modals.newFile) {
                modals.newFile.hide();
            }
            
            // 重新加载文件
            loadFiles(currentPath);
            
            // 显示成功消息
            showToast('成功', `文件 ${fileName} 已创建`, 'success');
        } else {
            throw new Error(data.message || '创建文件失败');
        }
    })
    .catch(error => {
        console.error('创建文件失败:', error);
        alert(`创建文件失败: ${error.message}`);
    });
}

// 创建新文件夹
function createNewFolder() {
    if (!elements.newFolderNameInput) return;
    
    const folderName = elements.newFolderNameInput.value.trim();
    
    if (!folderName) {
        alert('请输入文件夹名');
        return;
    }
    
    // 构建完整路径
    let folderPath = currentPath;
    if (folderPath !== '/' && !folderPath.endsWith('/')) folderPath += '/';
    folderPath += folderName;
    
    // 发送请求创建文件夹
    fetch('/api/files/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            path: folderPath,
            content: '',
            type: 'directory'
        }),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.message || `HTTP错误! 状态: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // 关闭模态框
            if (modals.newFolder) {
                modals.newFolder.hide();
            }
            
            // 重新加载文件和文件夹树
            loadFiles(currentPath);
            loadFolderTree();
            
            // 显示成功消息
            showToast('成功', `文件夹 ${folderName} 已创建`, 'success');
        } else {
            throw new Error(data.message || '创建文件夹失败');
        }
    })
    .catch(error => {
        console.error('创建文件夹失败:', error);
        alert(`创建文件夹失败: ${error.message}`);
    });
}

// 删除文件/文件夹
function deleteItem() {
    if (!elements.btnConfirmDelete) return;
    
    const path = elements.btnConfirmDelete.dataset.path;
    const isDirectory = elements.btnConfirmDelete.dataset.isDirectory === 'true';
    
    // 发送请求删除文件/文件夹
    fetch('/api/files/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            path: path
        }),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.message || `HTTP错误! 状态: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // 关闭模态框
            if (modals.deleteConfirm) {
                modals.deleteConfirm.hide();
            }
            
            // 重新加载文件和文件夹树
            loadFiles(currentPath);
            if (isDirectory) {
                loadFolderTree();
            }
            
            // 显示成功消息
            showToast('删除成功', `已成功删除 ${isDirectory ? '文件夹' : '文件'}`, 'success');
        } else {
            throw new Error(data.message || '删除失败');
        }
    })
    .catch(error => {
        console.error('删除失败:', error);
        alert(`删除失败: ${error.message}`);
    });
}

// 重命名文件/文件夹
function renameItem() {
    if (!elements.btnConfirmRename || !elements.renameItemName) return;
    
    const path = elements.btnConfirmRename.dataset.path;
    const oldName = elements.btnConfirmRename.dataset.oldName;
    const newName = elements.renameItemName.value.trim();
    
    if (!newName) {
        alert('请输入新名称');
        return;
    }
    
    // 构建新路径
    const pathParts = path.split('/');
    pathParts.pop();
    let newPath = pathParts.join('/');
    if (newPath !== '/' && !newPath.endsWith('/')) newPath += '/';
    newPath += newName;
    
    // 发送请求重命名文件/文件夹
    fetch('/api/files/rename', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            old_path: path,
            new_path: newPath
        }),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.message || `HTTP错误! 状态: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // 关闭模态框
            if (modals.rename) {
                modals.rename.hide();
            }
            
            // 重新加载文件和文件夹树
            loadFiles(currentPath);
            const isDirectory = path.split('.').length === 1;
            if (isDirectory) {
                loadFolderTree();
            }
            
            // 显示成功消息
            showToast('成功', `已将 ${oldName} 重命名为 ${newName}`, 'success');
        } else {
            throw new Error(data.message || '重命名失败');
        }
    })
    .catch(error => {
        console.error('重命名失败:', error);
        alert(`重命名失败: ${error.message}`);
    });
}

// 打开文件编辑器 - 修复编辑功能
function openEditor(path, name) {
    if (!elements.fileEditorContainer || !elements.fileEditor || !elements.editorFilename) {
        console.error('文件编辑器DOM元素不存在!');
        alert('文件编辑器加载失败，请刷新页面再试');
        return;
    }
    
    // 设置正在加载的提示
    elements.editorFilename.textContent = `加载中: ${name}`;
    elements.fileEditor.value = '加载文件内容中，请稍候...';
    elements.fileEditor.disabled = true;
    
    // 显示编辑器
    elements.fileEditorContainer.style.display = 'flex';
    
    // 请求文件内容
    fetch(`/api/files/read?path=${encodeURIComponent(path)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // 设置编辑器内容
                elements.editorFilename.textContent = name;
                elements.fileEditor.value = data.content;
                elements.fileEditor.disabled = false;
                
                // 设置文件路径到编辑器和保存按钮
                elements.fileEditor.dataset.path = path;
                elements.fileEditor.dataset.name = name;
                if (elements.btnSaveFile) {
                    elements.btnSaveFile.dataset.path = path;
                    elements.btnSaveFile.disabled = false;
                }
                
                // 更新行号
                updateLineNumbers();
                
                // 聚焦编辑器
                elements.fileEditor.focus();
            } else {
                throw new Error(data.message || '读取文件失败');
            }
        })
        .catch(error => {
            console.error('读取文件失败:', error);
            alert(`无法读取文件: ${error.message}`);
            closeEditor();
        });
}

// 关闭编辑器
function closeEditor() {
    if (!elements.fileEditorContainer) return;
    
    // 隐藏编辑器
    elements.fileEditorContainer.style.display = 'none';
    
    // 清空编辑器内容
    if (elements.fileEditor) elements.fileEditor.value = '';
    
    // 清空行号
    if (elements.lineNumbers) elements.lineNumbers.innerHTML = '';
}

// 保存文件
function saveFile() {
    if (!elements.fileEditor || !elements.btnSaveFile) return;
    
    const path = elements.btnSaveFile.dataset.path;
    const content = elements.fileEditor.value;
    
    // 禁用保存按钮，防止重复点击
    elements.btnSaveFile.disabled = true;
    
    // 发送请求保存文件
    fetch('/api/files/write', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            path: path,
            content: content
        }),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.message || `HTTP错误! 状态: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // 显示成功消息
            showToast('成功', '文件已保存', 'success');
        } else {
            throw new Error(data.message || '保存文件失败');
        }
    })
    .catch(error => {
        console.error('保存文件失败:', error);
        alert(`保存文件失败: ${error.message}`);
    })
    .finally(() => {
        // 恢复保存按钮
        elements.btnSaveFile.disabled = false;
    });
}

// 更新行号 - 修复长文件显示问题
function updateLineNumbers() {
    if (!elements.lineNumbers || !elements.fileEditor) return;
    
    const content = elements.fileEditor.value;
    const lines = content.split('\n');
    const lineCount = lines.length;
    
    // 生成行号HTML
    let lineNumbersHTML = '';
    for (let i = 1; i <= lineCount; i++) {
        lineNumbersHTML += `${i}<br>`;
    }
    
    // 设置行号
    elements.lineNumbers.innerHTML = lineNumbersHTML;
    
    // 改进编辑器高度计算方式
    // 不再使用行高乘以行数，而是使用自适应高度
    const editorContainer = elements.fileEditorContainer;
    if (editorContainer) {
        // 计算编辑器容器高度，减去其他UI元素高度
        const containerHeight = window.innerHeight - 100; // 为顶部导航和底部留出空间
        const toolbarHeight = editorContainer.querySelector('.editor-toolbar')?.offsetHeight || 0;
        
        // 设置编辑器主区域高度
        const editorMainArea = editorContainer.querySelector('.editor-main');
        if (editorMainArea) {
            editorMainArea.style.height = `${containerHeight - toolbarHeight}px`;
            
            // 编辑器和行号区高度自适应
            elements.fileEditor.style.height = '100%';
            elements.lineNumbers.style.height = '100%';
        }
    }
    
    // 确保滚动同步
    elements.fileEditor.addEventListener('scroll', () => {
        if (elements.lineNumbers) {
            elements.lineNumbers.scrollTop = elements.fileEditor.scrollTop;
        }
    });
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === null || bytes === undefined) return 'N/A';
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
}

// 格式化日期
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 显示通知
function showToast(title, message, type = 'success') {
    try {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            console.error('找不到toast容器元素');
            return;
        }
        
        const toastId = 'toast-' + Date.now();
        const toastEl = document.createElement('div');
        toastEl.className = 'toast';
        toastEl.id = toastId;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        
        toastEl.innerHTML = `
            <div class="toast-header">
                <strong class="me-auto">${title}</strong>
                <small class="text-muted">刚刚</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        
        if (type === 'success') {
            toastEl.classList.add('bg-success', 'text-white');
        } else if (type === 'error') {
            toastEl.classList.add('bg-danger', 'text-white');
        } else if (type === 'warning') {
            toastEl.classList.add('bg-warning', 'text-white');
        } else {
            toastEl.classList.add('bg-info', 'text-white');
        }
        
        toastContainer.appendChild(toastEl);
        
        const toast = new bootstrap.Toast(toastEl, {
            autohide: true,
            delay: 5000
        });
        
        toast.show();
        
        // 自动删除
        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    } catch (error) {
        console.error('显示通知失败:', error);
    }
}

// 更新分页控件
function updatePagination(pagination) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    // 清空现有分页控件
    paginationContainer.innerHTML = '';
    
    // 如果只有一页，不显示分页
    if (pagination.total_pages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    // 创建分页控件
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', '文件列表分页');
    
    const ul = document.createElement('ul');
    ul.className = 'pagination pagination-sm mb-0';
    
    // 添加"上一页"按钮
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${pagination.page <= 1 ? 'disabled' : ''}`;
    
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.innerHTML = '&laquo;';
    prevLink.setAttribute('aria-label', '上一页');
    
    if (pagination.page > 1) {
        prevLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadFiles(currentPath, pagination.page - 1);
        });
    }
    
    prevLi.appendChild(prevLink);
    ul.appendChild(prevLi);
    
    // 添加页码按钮（最多显示5个页码）
    const maxVisiblePages = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.total_pages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 添加第一页和省略号（如果需要）
    if (startPage > 1) {
        const firstPageLi = document.createElement('li');
        firstPageLi.className = 'page-item';
        
        const firstPageLink = document.createElement('a');
        firstPageLink.className = 'page-link';
        firstPageLink.href = '#';
        firstPageLink.textContent = '1';
        
        firstPageLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadFiles(currentPath, 1);
        });
        
        firstPageLi.appendChild(firstPageLink);
        ul.appendChild(firstPageLi);
        
        if (startPage > 2) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            
            const ellipsisSpan = document.createElement('span');
            ellipsisSpan.className = 'page-link';
            ellipsisSpan.innerHTML = '&hellip;';
            
            ellipsisLi.appendChild(ellipsisSpan);
            ul.appendChild(ellipsisLi);
        }
    }
    
    // 添加页码
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === pagination.page ? 'active' : ''}`;
        
        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = '#';
        pageLink.textContent = i;
        
        if (i !== pagination.page) {
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                loadFiles(currentPath, i);
            });
        }
        
        pageLi.appendChild(pageLink);
        ul.appendChild(pageLi);
    }
    
    // 添加最后一页和省略号（如果需要）
    if (endPage < pagination.total_pages) {
        if (endPage < pagination.total_pages - 1) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            
            const ellipsisSpan = document.createElement('span');
            ellipsisSpan.className = 'page-link';
            ellipsisSpan.innerHTML = '&hellip;';
            
            ellipsisLi.appendChild(ellipsisSpan);
            ul.appendChild(ellipsisLi);
        }
        
        const lastPageLi = document.createElement('li');
        lastPageLi.className = 'page-item';
        
        const lastPageLink = document.createElement('a');
        lastPageLink.className = 'page-link';
        lastPageLink.href = '#';
        lastPageLink.textContent = pagination.total_pages;
        
        lastPageLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadFiles(currentPath, pagination.total_pages);
        });
        
        lastPageLi.appendChild(lastPageLink);
        ul.appendChild(lastPageLi);
    }
    
    // 添加"下一页"按钮
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${pagination.page >= pagination.total_pages ? 'disabled' : ''}`;
    
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.innerHTML = '&raquo;';
    nextLink.setAttribute('aria-label', '下一页');
    
    if (pagination.page < pagination.total_pages) {
        nextLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadFiles(currentPath, pagination.page + 1);
        });
    }
    
    nextLi.appendChild(nextLink);
    ul.appendChild(nextLi);
    
    nav.appendChild(ul);
    paginationContainer.appendChild(nav);
}

// 编辑器UI调整
function setupEditorUI() {
    const editorContainer = elements.fileEditorContainer;
    if (!editorContainer) return;
    
    // 设置编辑器容器样式
    editorContainer.style.position = 'fixed';
    editorContainer.style.top = '60px'; // 导航栏下方
    editorContainer.style.left = '0';
    editorContainer.style.right = '0';
    editorContainer.style.bottom = '0';
    editorContainer.style.backgroundColor = '#fff';
    editorContainer.style.zIndex = '1050';
    editorContainer.style.display = 'none';
    
    // 设置编辑器工具栏样式
    const toolbar = editorContainer.querySelector('.editor-toolbar');
    if (toolbar) {
        toolbar.style.padding = '10px';
        toolbar.style.borderBottom = '1px solid #dee2e6';
        toolbar.style.backgroundColor = '#f8f9fa';
    }
    
    // 设置编辑器主区域样式
    const editorMain = editorContainer.querySelector('.editor-main');
    if (editorMain) {
        editorMain.style.display = 'flex';
        editorMain.style.height = 'calc(100% - 60px)'; // 减去工具栏高度
        editorMain.style.overflow = 'hidden';
    }
    
    // 设置行号区域样式
    if (elements.lineNumbers) {
        elements.lineNumbers.style.width = '50px';
        elements.lineNumbers.style.padding = '10px 5px';
        elements.lineNumbers.style.overflow = 'hidden';
        elements.lineNumbers.style.textAlign = 'right';
        elements.lineNumbers.style.color = '#6c757d';
        elements.lineNumbers.style.backgroundColor = '#f8f9fa';
        elements.lineNumbers.style.borderRight = '1px solid #dee2e6';
        elements.lineNumbers.style.userSelect = 'none';
    }
    
    // 设置编辑器样式
    if (elements.fileEditor) {
        elements.fileEditor.style.flex = '1';
        elements.fileEditor.style.padding = '10px';
        elements.fileEditor.style.border = 'none';
        elements.fileEditor.style.resize = 'none';
        elements.fileEditor.style.outline = 'none';
        elements.fileEditor.style.fontSize = '1rem';
        elements.fileEditor.style.lineHeight = '1.5';
        elements.fileEditor.style.fontFamily = 'monospace';
        elements.fileEditor.style.whiteSpace = 'pre';
        elements.fileEditor.style.overflowX = 'auto';
    }
}

// 添加文件上传函数
function uploadFiles() {
    if (!elements.uploadFiles || !elements.uploadFiles.files.length) {
        showToast('上传失败', '请选择要上传的文件', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('path', currentPath);
    
    // 添加所有选择的文件
    for (let i = 0; i < elements.uploadFiles.files.length; i++) {
        formData.append('files', elements.uploadFiles.files[i]);
    }
    
    // 显示更详细的信息
    console.log('准备上传文件:', {
        路径: currentPath,
        文件数量: elements.uploadFiles.files.length,
        文件列表: Array.from(elements.uploadFiles.files).map(f => f.name)
    });
    
    // 显示进度条
    elements.uploadProgressContainer.classList.remove('d-none');
    elements.uploadStatus.classList.remove('d-none');
    elements.uploadStatus.classList.remove('alert-success', 'alert-danger');
    elements.uploadStatus.classList.add('alert-info');
    elements.uploadStatus.textContent = '正在上传文件...';
    
    // 设置上传按钮为禁用状态
    elements.btnStartUpload.disabled = true;
    
    // 根据文件管理器其他API调用模式，扩展尝试的URL列表
    const possibleUrls = [
        // 优先尝试新添加的简化上传API路径
        '/upload',
        '/api/upload',
        // 然后是其他可能的路径
        '/api/files/upload',
        '../api/files/upload',
        'api/files/upload',
        '/file-manager/api/files/upload',
        '/apis/files/upload',
        `${window.location.protocol}//${window.location.host}/upload`,
        `${window.location.protocol}//${window.location.host}/api/upload`,
        `/api/files/upload?path=${encodeURIComponent(currentPath)}`
    ];
    
    // 将本地存储的成功URL放在最前面尝试
    const lastSuccessfulUrl = localStorage.getItem('lastSuccessfulUploadUrl');
    if (lastSuccessfulUrl) {
        possibleUrls.unshift(lastSuccessfulUrl);
        console.log('使用之前成功的URL:', lastSuccessfulUrl);
    }
    
    // 尝试所有可能的URL
    tryUploadWithUrls(formData, possibleUrls, 0);
}

// 逐个尝试所有可能的URL进行上传
function tryUploadWithUrls(formData, urlList, index) {
    if (index >= urlList.length) {
        // 所有URL都已尝试且失败
        elements.uploadStatus.classList.remove('alert-info');
        elements.uploadStatus.classList.add('alert-danger');
        elements.uploadStatus.textContent = '所有上传尝试均失败，可能原因: 服务器上传API未启用或路径不匹配';
        elements.btnStartUpload.disabled = false;
        
        // 显示详细错误信息和建议
        console.error('所有上传URL尝试均失败', {
            尝试的URL列表: urlList,
            可能的原因: [
                '服务器上的上传API未正确实现或注册',
                'API路径与尝试的所有路径都不匹配',
                '服务器配置问题或防火墙限制',
                '会话验证失败或权限问题'
            ],
            建议解决方案: [
                '检查服务器日志以确定确切的上传端点路径',
                '在服务器中实现一个简单的上传API进行测试',
                '使用开发者工具检查网络请求，查看其他API的确切路径'
            ]
        });
        
        showToast('上传失败', '无法找到有效的上传API，请联系管理员检查服务器日志', 'error');
        return;
    }
    
    const currentUrl = urlList[index];
    console.log(`尝试使用URL(${index + 1}/${urlList.length}): ${currentUrl}`);
    elements.uploadStatus.textContent = `尝试API路径 ${index + 1}/${urlList.length}...`;
    
    // 创建新的XMLHttpRequest对象
    const xhr = new XMLHttpRequest();
    
    // 监听上传进度
    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            elements.uploadProgressBar.style.width = percentComplete + '%';
            elements.uploadProgressBar.setAttribute('aria-valuenow', percentComplete);
            console.log(`上传进度: ${percentComplete}%`);
        }
    });
    
    // 上传完成事件
    xhr.addEventListener('load', function() {
        console.log('上传请求完成:', {
            URL: currentUrl,
            状态码: xhr.status,
            状态文本: xhr.statusText,
            响应文本: xhr.responseText.substring(0, 200) + (xhr.responseText.length > 200 ? '...' : '')
        });
        
        if (xhr.status === 404) {
            // 404错误，尝试下一个URL
            console.warn(`URL ${currentUrl} 返回404，尝试下一个URL`);
            elements.uploadStatus.textContent = `API路径 ${index + 1}/${urlList.length} 不存在，尝试其他路径...`;
            tryUploadWithUrls(formData, urlList, index + 1);
            return;
        }
        
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                const response = JSON.parse(xhr.responseText);
                console.log('解析响应成功:', response);
                
                // 保存成功的URL以供将来使用
                localStorage.setItem('lastSuccessfulUploadUrl', currentUrl);
                console.log('已保存成功的上传URL:', currentUrl);
                
                if (response.success) {
                    elements.uploadStatus.classList.remove('alert-info');
                    elements.uploadStatus.classList.add('alert-success');
                    elements.uploadStatus.textContent = response.message;
                    
                    // 重新加载当前目录
                    setTimeout(function() {
                        loadFiles(currentPath);
                        
                        // 在上传成功后1.5秒关闭模态框
                        setTimeout(function() {
                            const uploadModal = bootstrap.Modal.getInstance(elements.uploadFileModal);
                            if (uploadModal) {
                                uploadModal.hide();
                            }
                            
                            // 重置上传表单
                            resetUploadForm();
                        }, 1500);
                    }, 500);
                    
                    showToast('上传成功', response.message, 'success');
                } else {
                    elements.uploadStatus.classList.remove('alert-info');
                    elements.uploadStatus.classList.add('alert-danger');
                    elements.uploadStatus.textContent = response.message || '上传失败';
                    showToast('上传失败', response.message || '上传失败', 'error');
                }
            } catch (e) {
                console.error('解析响应失败:', e, '原始响应:', xhr.responseText);
                elements.uploadStatus.classList.remove('alert-info');
                elements.uploadStatus.classList.add('alert-danger');
                elements.uploadStatus.textContent = '解析响应失败: ' + e.message;
                showToast('上传失败', '解析响应失败: ' + e.message, 'error');
            }
        } else {
            console.error('上传失败，HTTP状态码:', xhr.status, xhr.statusText);
            elements.uploadStatus.classList.remove('alert-info');
            elements.uploadStatus.classList.add('alert-danger');
            elements.uploadStatus.textContent = '上传失败: ' + xhr.status + ' ' + xhr.statusText;
            
            // 如果是服务器错误(5xx)，尝试下一个URL
            if (xhr.status >= 500) {
                console.warn(`URL ${currentUrl} 返回服务器错误，尝试下一个URL`);
                tryUploadWithUrls(formData, urlList, index + 1);
                return;
            }
            
            // 如果是认证错误(401/403)，可能需要登录
            if (xhr.status === 401 || xhr.status === 403) {
                console.warn(`URL ${currentUrl} 返回认证错误，可能需要重新登录`);
                elements.uploadStatus.textContent = '认证失败，请重新登录后再试';
                showToast('上传失败', '认证失败，请重新登录后再试', 'error');
                return;
            }
            
            showToast('上传失败', '状态码: ' + xhr.status + ' - ' + xhr.statusText, 'error');
        }
        
        // 重置上传按钮状态
        elements.btnStartUpload.disabled = false;
    });
    
    // 上传错误事件
    xhr.addEventListener('error', function(e) {
        console.error('网络错误:', e);
        elements.uploadStatus.classList.remove('alert-info');
        elements.uploadStatus.classList.add('alert-danger');
        elements.uploadStatus.textContent = '网络错误，尝试其他URL...';
        
        // 网络错误，尝试下一个URL
        console.warn(`URL ${currentUrl} 发生网络错误，尝试下一个URL`);
        tryUploadWithUrls(formData, urlList, index + 1);
    });
    
    // 上传被中止
    xhr.addEventListener('abort', function() {
        console.warn('上传已中止');
        elements.uploadStatus.classList.remove('alert-info');
        elements.uploadStatus.classList.add('alert-danger');
        elements.uploadStatus.textContent = '上传已中止';
        
        // 重置上传按钮状态
        elements.btnStartUpload.disabled = false;
    });
    
    // 发送请求
    try {
        xhr.open('POST', currentUrl, true);
        // 设置可能需要的跨域相关头部
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.send(formData);
    } catch (e) {
        console.error('发送请求时出错:', e);
        elements.uploadStatus.classList.remove('alert-info');
        elements.uploadStatus.classList.add('alert-danger');
        elements.uploadStatus.textContent = '发送请求失败，尝试其他URL...';
        
        // 发送失败，尝试下一个URL
        tryUploadWithUrls(formData, urlList, index + 1);
    }
}

// 重置上传表单
function resetUploadForm() {
    if (elements.uploadFiles) {
        elements.uploadFiles.value = '';
    }
    
    elements.uploadProgressContainer.classList.add('d-none');
    elements.uploadStatus.classList.add('d-none');
    elements.uploadProgressBar.style.width = '0%';
    elements.uploadProgressBar.setAttribute('aria-valuenow', 0);
    elements.btnStartUpload.disabled = false;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('文件管理器DOM加载完成，准备初始化...');
    
    setTimeout(() => {
        try {
            // 检查Bootstrap是否存在
            if (typeof bootstrap === 'undefined') {
                console.error('Bootstrap未加载！模态框将无法正常工作');
                alert('系统错误：Bootstrap未加载，部分功能可能无法正常工作。请刷新页面或联系管理员。');
                
                // 尝试重新加载Bootstrap
                const scriptEl = document.createElement('script');
                scriptEl.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js';
                document.body.appendChild(scriptEl);
                
                scriptEl.onload = () => {
                    console.log('Bootstrap重新加载成功，尝试初始化...');
                    init();
                };
                
                return;
            }
            
            // 检查关键DOM元素是否存在
            const elementCheck = {
                'fileList': elements.fileList,
                'folderTree': elements.folderTree,
                'newFileModal': elements.newFileModal,
                'newFolderModal': elements.newFolderModal,
                'btnNewFile': elements.btnNewFile,
                'btnNewFolder': elements.btnNewFolder
            };
            
            // 记录缺失的元素
            const missingElements = Object.entries(elementCheck)
                .filter(([_, element]) => !element || (Array.isArray(element) && element.length === 0))
                .map(([name]) => name);
            
            if (missingElements.length > 0) {
                console.error('以下DOM元素未找到:', missingElements.join(', '));
                
                // 特别检查按钮选择器
                if (missingElements.includes('btnNewFile') || missingElements.includes('btnNewFolder')) {
                    console.info('尝试使用类选择器重新获取按钮元素...');
                    
                    // 尝试通过类选择器重新获取按钮
                    elements.btnNewFile = document.querySelectorAll('.btn-new-file'); 
                    elements.btnNewFolder = document.querySelectorAll('.btn-new-folder');
                    
                    console.log('通过类选择器找到的新建文件按钮:', elements.btnNewFile?.length || 0);
                    console.log('通过类选择器找到的新建文件夹按钮:', elements.btnNewFolder?.length || 0);
                }
            }
            
            // 初始化
            init();
            
            // 添加全局调试函数
            window.debugFileManager = {
                showNewFileModal: () => {
                    console.log('手动调用显示新建文件模态框');
                    showNewFileModal();
                },
                showNewFolderModal: () => {
                    console.log('手动调用显示新建文件夹模态框');
                    showNewFolderModal();
                },
                getElements: () => {
                    console.log('当前文件管理器元素状态:', elements);
                    return elements;
                },
                getModals: () => {
                    console.log('当前模态框状态:', modals);
                    return modals;
                },
                reinitModals: () => {
                    console.log('尝试重新初始化所有模态框');
                    if (elements.newFileModal) modals.newFile = new bootstrap.Modal(elements.newFileModal);
                    if (elements.newFolderModal) modals.newFolder = new bootstrap.Modal(elements.newFolderModal);
                    if (elements.deleteConfirmModal) modals.deleteConfirm = new bootstrap.Modal(elements.deleteConfirmModal);
                    if (elements.renameModal) modals.rename = new bootstrap.Modal(elements.renameModal);
                    return modals;
                }
            };
            
            console.log('文件管理器初始化完成，可以通过window.debugFileManager访问调试功能');
        } catch (error) {
            console.error('文件管理器初始化失败:', error);
            alert(`文件管理器初始化失败: ${error.message}`);
        }
    }, 500); // 延迟500毫秒确保DOM完全加载
}); 