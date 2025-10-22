// 独立模板选择模块（IIFE，全局导出 window.TemplateSelector）
(function(){
    'use strict';

    const PANEL_ID = 'templateGrid';
    let container = null;
    let options = { onSelect: null };
    let currentTemplate = null;
    let isLoading = false;

    function ensureContainer() {
        if (!container) {
            container = document.getElementById(PANEL_ID);
        }
        if (!container) {
            console.warn('[TemplateSelector] 未找到容器 #' + PANEL_ID);
            return false;
        }
        return true;
    }

    function normalizeTemplatesPayload(data) {
        // 兼容返回：
        // 1) { templates: [...] } 或 { templates: { name: info, ... } }
        // 2) 直接数组 [...]
        // 3) 直接字典 { name: info, ... }
        let templates = [];
        let current = data?.current?.name 
            || data?.current_name 
            || data?.current 
            || data?.current_template 
            || null;

        if (Array.isArray(data?.templates)) {
            templates = data.templates;
        } else if (data?.templates && typeof data.templates === 'object') {
            templates = Object.values(data.templates);
        } else if (Array.isArray(data)) {
            templates = data;
        } else if (data && typeof data === 'object') {
            // /templates 返回的字典：{ name: info, ... }
            templates = Object.values(data);
        }
        return { templates, current };
    }

    // 等待模板列表响应的辅助函数
    function waitForTemplatesResponse(timeout = 10000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                console.warn('[TemplateSelector] Templates response timeout after', timeout, 'ms');
                reject(new Error('Templates response timeout'));
            }, timeout);
            
            // 监听全局模板响应事件
            const handler = (event) => {
                console.log('[TemplateSelector] Received event:', event.detail);
                if (event.detail && event.detail.type === 'templates.list') {
                    clearTimeout(timeoutId);
                    document.removeEventListener('livekit-response', handler);
                    console.log('[TemplateSelector] Templates response received:', event.detail.data);
                    resolve(event.detail.data || []);
                }
            };
            
            document.addEventListener('livekit-response', handler);
            console.log('[TemplateSelector] Waiting for templates response...');
        });
    }

    function safeStr(x){ try { return String(x||'').trim(); } catch(e){ return ''; } }
    function resolvePreview(item){
        const keys = ['preview_image','preview','image','cover','thumb'];
        for (const k of keys) {
            const v = item && item[k];
            if (v) return safeStr(v);
        }
        // 兜底：没有预览则用透明占位
        return '';
    }

    function setLoading(loading){
        isLoading = !!loading;
        if (!ensureContainer()) return;
        container.innerHTML = `
            <div class="tpl-header">选择模板开始播放</div>
            <div class="tpl-list ${loading ? 'loading' : ''}">
                ${loading ? '<div class="tpl-loading">正在加载模板...</div>' : ''}
            </div>
        `;
    }

    function renderTemplates(items, currentName){
        if (!ensureContainer()) return;
        currentTemplate = currentName || null;
        const listEl = container.querySelector('.tpl-list');
        if (!listEl) return;
        listEl.classList.remove('loading');
        listEl.innerHTML = '';

        if (!items || !items.length) {
            listEl.innerHTML = `<div class="tpl-empty">暂无可用模板</div>`;
            return;
        }

        // 新增：统一设置当前高亮卡片的工具函数
        function setCurrentCard(cardEl, name){
            try {
                const cards = container.querySelectorAll('.tpl-card');
                cards.forEach(c => c.classList.remove('current'));
                if (cardEl) cardEl.classList.add('current');
                currentTemplate = name;
            } catch(e) {}
        }

        for (const t of items) {
            const name = safeStr(t.name || t.template || t.id);
            const title = safeStr(t.title || t.display_name || name);
            const desc = safeStr(t.description || t.desc || '');
            const thumb = resolvePreview(t);
            const card = document.createElement('div');
            card.className = 'tpl-card' + (name && name === currentTemplate ? ' current' : '');

            card.innerHTML = `
                <div class="thumb">${thumb ? `<img src="${thumb}" alt="${title}"/>` : `<div class="no-thumb"></div>`}</div>
                <div class="meta">
                    <div class="name">${title}</div>
                    ${desc ? `<div class="desc">${desc}</div>` : ''}
                    <div class="actions">
                        <button class="play-btn">选择模板</button>
                    </div>
                </div>
            `;

            const playBtn = card.querySelector('.play-btn');

            // 点击卡片高亮当前
            card.addEventListener('click', () => {
                setCurrentCard(card, name);
                // 记录待发送模板名
                window._pendingTemplateSelect = name;
                
                // 如果已连接LiveKit，直接发送模板选择命令
                if (window._lkRoom && window._lkRoom.state === 'connected' && window.sendCommandViaLiveKit) {
                    window.sendCommandViaLiveKit({
                        cmd: 'template.select',
                        template_name: name
                    }).then(() => {
                        console.log('[TemplateSelector] Template selection sent via DataChannel:', name);
                        // 清除待发送状态
                        window._pendingTemplateSelect = null;
                    }).catch(e => {
                        console.warn('[TemplateSelector] Failed to send template selection via DataChannel:', e);
                    });
                }
                
                // 调用回调
                if (typeof options.onSelect === 'function') {
                    options.onSelect(name);
                }
            });

            playBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    playBtn.disabled = true;
                    setCurrentCard(card, name);
                    hide();

                    // 记录待发送模板名（房间未连时在连接成功后发送）
                    window._pendingTemplateSelect = name;

                    // 移除：未连接时直接 publishData 的逻辑；由 main.js 的 onSelect 决定握手或指令
                    // 触发外部回调：未连接则启动握手；已连接则走 DataChannel
                    if (options.onSelect && typeof options.onSelect === 'function') {
                        options.onSelect(name);
                    }
                } catch(e) {
                    console.warn('[TemplateSelector] 选择失败', e);
                    try { playBtn.disabled = false; playBtn.textContent = '重试选择并播放'; } catch(_) {}
                }
            });

            listEl.appendChild(card);
        }
    }

    async function loadTemplates(){
        try {
            setLoading(true);
            console.log('[TemplateSelector] Loading templates...');
            
            // 如果已经连接到LiveKit，通过DataChannel请求模板列表
            if (window._lkRoom && window._lkRoom.state === 'connected' && window.sendCommandViaLiveKit) {
                console.log('[TemplateSelector] Using DataChannel to fetch templates');
                try {
                    // 通过DataChannel请求模板列表
                    await window.sendCommandViaLiveKit({ cmd: 'templates.list' });
                    // 等待响应（通过全局事件处理）
                    const templates = await waitForTemplatesResponse();
                    const current = (templates.find(t => t.is_current) || {}).name || null;
                    renderTemplates(templates, current);
                    setLoading(false);
                    console.log('[TemplateSelector] Templates loaded via DataChannel:', templates.length);
                    return;
                } catch (e) {
                    console.warn('[TemplateSelector] DataChannel获取模板失败，尝试HTTP请求', e);
                }
            } else {
                console.log('[TemplateSelector] LiveKit not connected, using HTTP request');
            }
            
            // 降级到HTTP请求（用于初始连接前或DataChannel失败时）
            console.log('[TemplateSelector] Fetching templates via HTTP from cloud_gateway');
            const resp = await fetch('/templates', { method: 'GET', cache: 'no-store' });
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
            }
            const data = await resp.json();
            console.log('[TemplateSelector] HTTP response data:', data);
            // cloud_gateway返回的是字典格式 { name: info, ... }
            const templates = Object.values(data || {});
            const current = (templates.find(t => t.is_current) || {}).name || null;
            renderTemplates(templates, current);
            console.log('[TemplateSelector] Templates loaded via HTTP:', templates.length);
        } catch(e) {
            console.error('[TemplateSelector] 加载模板失败', e);
            if (ensureContainer()) {
                const listEl = container.querySelector('.tpl-list');
                if (listEl) listEl.innerHTML = `<div class="tpl-error">加载模板失败: ${e.message}</div>`;
            }
        } finally {
            isLoading = false;
        }
    }

    function show(){
        if (!ensureContainer()) return;
        container.classList.add('visible');
        container.setAttribute('aria-hidden', 'false');
        // 新增：复位所有卡片按钮，避免一次点击后永久禁用
        try {
            const btns = container.querySelectorAll('.tpl-card .play-btn');
            btns.forEach(btn => {
                btn.disabled = false;
                btn.textContent = '选择模板';
            });
        } catch(e) {}
    }

    function hide(){
        if (!ensureContainer()) return;
        container.classList.remove('visible');
        container.setAttribute('aria-hidden', 'true');
    }

    function init(opts){
        options = Object.assign({ onSelect: null }, opts || {});
        if (!ensureContainer()) return;
        container.innerHTML = `
            <div class="tpl-header">选择模板开始播放</div>
            <div class="tpl-list"></div>
        `;
    }

    async function loadAndShow(){
        await loadTemplates();
        show();
    }

    // 导出
    window.TemplateSelector = {
        init,
        loadTemplates,
        loadAndShow,
        show,
        hide,
    };
})();