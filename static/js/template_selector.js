/**
 * 模板选择器 - 增强版
 * 提供美观的模板选择界面和交互功能
 */

(function() {
    'use strict';

    let templateGrid = null;
    let isTemplateGridVisible = false;

    // 初始化模板选择器
    function initTemplateSelector() {
        templateGrid = document.getElementById('templateGrid');
        if (!templateGrid) {
            console.warn('[TemplateSelector] Template grid element not found');
            return;
        }

        // 创建模板选择器的HTML结构
        templateGrid.innerHTML = `
            <div class="template-selector-overlay">
                <div class="template-selector-container">
                    <div class="template-selector-header">
                        <h2>选择数字人角色</h2>
                        <button class="close-btn" aria-label="关闭">&times;</button>
                    </div>
                    <div class="template-selector-content">
                        <div class="templates-container">
                            <!-- 模板卡片将在这里动态生成 -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 绑定关闭按钮事件
        const closeBtn = templateGrid.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideTemplateSelector);
        }

        // 点击遮罩层关闭
        const overlay = templateGrid.querySelector('.template-selector-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    hideTemplateSelector();
                }
            });
        }

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isTemplateGridVisible) {
                hideTemplateSelector();
            }
        });

        console.log('[TemplateSelector] Initialized successfully');
    }

    // 显示模板选择器
    function showTemplateSelector() {
        if (!templateGrid) return;
        
        templateGrid.style.display = 'flex';
        templateGrid.setAttribute('aria-hidden', 'false');
        isTemplateGridVisible = true;
        
        // 添加显示动画
        setTimeout(() => {
            templateGrid.classList.add('visible');
        }, 10);

        console.log('[TemplateSelector] Shown');
    }

    // 隐藏模板选择器
    function hideTemplateSelector() {
        if (!templateGrid) return;
        
        templateGrid.classList.remove('visible');
        
        setTimeout(() => {
            templateGrid.style.display = 'none';
            templateGrid.setAttribute('aria-hidden', 'true');
            isTemplateGridVisible = false;
        }, 300);

        console.log('[TemplateSelector] Hidden');
    }

    // 创建模板卡片
    function createTemplateCard(template) {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.setAttribute('data-template-id', template.id);
        
        card.innerHTML = `
            <div class="template-cover">
                <img src="${template.cover || template.avatar || '/static/covers/default.jpg'}" 
                     alt="${template.name}" 
                     onerror="this.src='/static/covers/default.jpg'">
                <div class="template-overlay">
                    <div class="template-play-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="template-info">
                <h3 class="template-name">${template.name}</h3>
                <p class="template-description">${template.description}</p>
                <div class="template-tags">
                    ${(template.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;

        // 添加点击事件
        card.addEventListener('click', () => {
            selectTemplateCard(template, card);
        });

        // 添加悬停效果
        card.addEventListener('mouseenter', () => {
            card.classList.add('hovered');
        });

        card.addEventListener('mouseleave', () => {
            card.classList.remove('hovered');
        });

        return card;
    }

    // 选择模板卡片
    function selectTemplateCard(template, cardElement) {
        // 移除其他卡片的选中状态
        const allCards = templateGrid.querySelectorAll('.template-card');
        allCards.forEach(card => card.classList.remove('selected'));

        // 添加当前卡片的选中状态
        cardElement.classList.add('selected');

        // 调用全局的模板选择函数
        if (window.selectTemplate) {
            window.selectTemplate(template);
        }

        // 延迟关闭选择器
        setTimeout(() => {
            hideTemplateSelector();
        }, 1000);
    }

    // 更新模板列表
    function updateTemplateList(templates) {
        if (!templateGrid) return;

        const container = templateGrid.querySelector('.templates-container');
        if (!container) return;

        container.innerHTML = '';

        if (!templates || templates.length === 0) {
            container.innerHTML = `
                <div class="no-templates">
                    <p>暂无可用模板</p>
                </div>
            `;
            return;
        }

        templates.forEach(template => {
            const card = createTemplateCard(template);
            container.appendChild(card);
        });

        console.log(`[TemplateSelector] Updated with ${templates.length} templates`);
    }

    // 添加样式
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .template-selector-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .template-grid.visible .template-selector-overlay {
                opacity: 1;
            }

            .template-selector-container {
                background: white;
                border-radius: 12px;
                max-width: 90vw;
                max-height: 90vh;
                width: 800px;
                overflow: hidden;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            .template-grid.visible .template-selector-container {
                transform: scale(1);
            }

            .template-selector-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border-bottom: 1px solid #eee;
                background: #f8f9fa;
            }

            .template-selector-header h2 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #333;
            }

            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }

            .close-btn:hover {
                background-color: #e9ecef;
                color: #333;
            }

            .template-selector-content {
                padding: 24px;
                max-height: 60vh;
                overflow-y: auto;
            }

            .templates-container {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 20px;
            }

            .template-card {
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
            }

            .template-card:hover,
            .template-card.hovered {
                transform: translateY(-4px);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            }

            .template-card.selected {
                border: 2px solid #007bff;
                box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.25);
            }

            .template-cover {
                position: relative;
                width: 100%;
                height: 120px;
                overflow: hidden;
            }

            .template-cover img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.3s ease;
            }

            .template-card:hover .template-cover img {
                transform: scale(1.05);
            }

            .template-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .template-card:hover .template-overlay {
                opacity: 1;
            }

            .template-play-btn {
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #333;
                transform: scale(0.8);
                transition: transform 0.3s ease;
            }

            .template-card:hover .template-play-btn {
                transform: scale(1);
            }

            .template-play-btn svg {
                width: 16px;
                height: 16px;
            }

            .template-info {
                padding: 16px;
            }

            .template-name {
                margin: 0 0 8px 0;
                font-size: 16px;
                font-weight: 600;
                color: #333;
                line-height: 1.2;
            }

            .template-description {
                margin: 0 0 12px 0;
                font-size: 14px;
                color: #666;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .template-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .tag {
                background: #e9ecef;
                color: #495057;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }

            .no-templates {
                text-align: center;
                padding: 40px 20px;
                color: #666;
            }

            @media (max-width: 768px) {
                .template-selector-container {
                    width: 95vw;
                    margin: 20px;
                }

                .templates-container {
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 16px;
                }

                .template-selector-content {
                    padding: 16px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 暴露全局函数
    window.TemplateSelector = {
        init: initTemplateSelector,
        show: showTemplateSelector,
        hide: hideTemplateSelector,
        updateTemplates: updateTemplateList
    };

    // 页面加载完成后初始化
    document.addEventListener('DOMContentLoaded', () => {
        addStyles();
        initTemplateSelector();
    });

})();