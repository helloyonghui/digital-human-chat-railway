const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { AccessToken } = require('livekit-server-sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "wss:", "ws:"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https:", "wss:", "ws:", "*"],
            mediaSrc: ["'self'", "https:", "blob:", "*"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            frameSrc: ["'self'", "https:"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS配置
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'https://localhost:3000'];

app.use(cors({
    origin: function (origin, callback) {
        // 允许没有origin的请求（如移动应用）
        if (!origin) return callback(null, true);
        
        // 开发环境允许所有localhost
        if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
            return callback(null, true);
        }
        
        // 生产环境检查白名单
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// 压缩中间件
app.use(compression());

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查端点
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// LiveKit相关API - 增强版，参考server代码的优秀实现
app.post('/api/livekit/join', async (req, res) => {
    try {
        const { roomName, participantName } = req.body;
        
        if (!roomName || !participantName) {
            return res.status(400).json({ 
                error: 'Missing required parameters',
                required: ['roomName', 'participantName'],
                received: { roomName, participantName }
            });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        let wsUrl = process.env.LIVEKIT_WS_URL || 'wss://motabay.com';

        if (!apiKey || !apiSecret) {
            console.error('Missing LiveKit credentials');
            return res.status(500).json({ 
                error: 'Server configuration error',
                message: 'LiveKit credentials not configured'
            });
        }

        // URL格式转换 - 参考server代码的优秀实现
        if (wsUrl.startsWith('https://')) {
            wsUrl = wsUrl.replace('https://', 'wss://');
        } else if (wsUrl.startsWith('http://')) {
            wsUrl = wsUrl.replace('http://', 'ws://');
        }
        
        // 确保URL格式正确
        if (!wsUrl.startsWith('wss://') && !wsUrl.startsWith('ws://')) {
            wsUrl = 'wss://' + wsUrl;
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: participantName,
            ttl: '1h', // 增加TTL时间
        });

        // 更精确的权限控制
        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
            canUpdateOwnMetadata: true,
        });

        const token = at.toJwt();
        
        console.log('Generated LiveKit token for:', participantName, 'in room:', roomName);
        console.log('LiveKit URL:', wsUrl);
        
        res.json({
            success: true,
            token,
            wsUrl,
            roomName,
            participantName,
            timestamp: new Date().toISOString(),
            config: {
                autoSubscribe: true,
                dynacast: true,
                adaptiveStream: true,
                publishDefaults: {
                    videoSimulcastLayers: [
                        { resolution: { width: 640, height: 360 }, encoding: { maxBitrate: 200000 } },
                        { resolution: { width: 1280, height: 720 }, encoding: { maxBitrate: 500000 } }
                    ]
                }
            }
        });
    } catch (error) {
        console.error('LiveKit join error:', error);
        res.status(500).json({ 
            error: 'Failed to generate LiveKit token',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// 兼容旧版本的LiveKit API - 增强版
app.post('/lk/join', async (req, res) => {
    try {
        const { roomName, participantName } = req.body;
        
        if (!roomName || !participantName) {
            return res.status(400).json({ 
                error: 'Missing required parameters',
                required: ['roomName', 'participantName'],
                received: { roomName, participantName }
            });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        let wsUrl = process.env.LIVEKIT_WS_URL || 'wss://motabay.com';

        if (!apiKey || !apiSecret) {
            console.error('Missing LiveKit credentials');
            return res.status(500).json({ 
                error: 'Server configuration error',
                message: 'LiveKit credentials not configured'
            });
        }

        // URL格式转换
        if (wsUrl.startsWith('https://')) {
            wsUrl = wsUrl.replace('https://', 'wss://');
        } else if (wsUrl.startsWith('http://')) {
            wsUrl = wsUrl.replace('http://', 'ws://');
        }
        
        if (!wsUrl.startsWith('wss://') && !wsUrl.startsWith('ws://')) {
            wsUrl = 'wss://' + wsUrl;
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: participantName,
            ttl: '1h',
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
            canUpdateOwnMetadata: true,
        });

        const token = at.toJwt();
        
        console.log('Generated LiveKit token for:', participantName, 'in room:', roomName);
        console.log('LiveKit URL:', wsUrl);
        
        res.json({
            success: true,
            token,
            wsUrl,
            roomName,
            participantName,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('LiveKit join error:', error);
        res.status(500).json({ 
            error: 'Failed to generate LiveKit token',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// LiveKit停止接口 - 增强版
app.post('/lk/stop', (req, res) => {
    try {
        const { roomName, participantName } = req.body;
        console.log('LiveKit stop request received:', { roomName, participantName });
        
        // 这里可以添加清理逻辑，比如通知其他服务
        
        res.json({ 
            success: true,
            status: 'stopped',
            message: 'LiveKit session stopped successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('LiveKit stop error:', error);
        res.status(500).json({ 
            error: 'Failed to stop LiveKit session',
            message: error.message
        });
    }
});

// RTC验证接口 - 增强版
app.post('/rtc/validate', (req, res) => {
    try {
        const { roomName, participantName, token } = req.body;
        console.log('RTC validate request:', { roomName, participantName, hasToken: !!token });
        
        // 基本验证
        if (!roomName || !participantName) {
            return res.status(400).json({
                valid: false,
                error: 'Missing required parameters',
                required: ['roomName', 'participantName']
            });
        }
        
        res.json({ 
            success: true,
            valid: true,
            status: 'validated',
            message: 'RTC connection validated successfully',
            timestamp: new Date().toISOString(),
            config: {
                roomName,
                participantName,
                validated: true
            }
        });
    } catch (error) {
        console.error('RTC validate error:', error);
        res.status(500).json({ 
            valid: false,
            error: 'RTC validation failed',
            message: error.message
        });
    }
});

// 加载配置文件
let promptsConfig = {};
let templatesConfig = {};

try {
    const promptsPath = path.join(__dirname, 'config', 'prompts.json');
    const templatesPath = path.join(__dirname, 'config', 'templates.json');
    
    if (fs.existsSync(promptsPath)) {
        promptsConfig = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
        console.log('Loaded prompts config:', Object.keys(promptsConfig).length, 'roles');
    }
    
    if (fs.existsSync(templatesPath)) {
        templatesConfig = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
        console.log('Loaded templates config:', Object.keys(templatesConfig).length, 'templates');
    }
} catch (error) {
    console.error('Error loading config files:', error);
    // 使用默认配置
    templatesConfig = {
        "xinyao0319": {
            name: "心瑶",
            description: "专业银行顾问",
            role: "bank_expert",
            voice_id: "zf_001"
        },
        "kwn_003": {
            name: "凯文", 
            description: "直播带货专家",
            role: "live_streaming_expert",
            voice_id: "zf_001"
        }
    };
}

// 模板相关API - 增强版
app.get('/templates', (req, res) => {
    try {
        // 返回完整的模板配置
        const templatesWithPrompts = {};
        
        for (const [templateId, template] of Object.entries(templatesConfig)) {
            const roleConfig = promptsConfig[template.role] || {};
            templatesWithPrompts[templateId] = {
                ...template,
                prompt: roleConfig.prompt || '',
                fullRoleConfig: roleConfig
            };
        }
        
        res.json(templatesWithPrompts);
    } catch (error) {
        console.error('Error in /templates:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.get('/templates/current', (req, res) => {
    try {
        // 返回当前默认模板（第一个模板）
        const templateIds = Object.keys(templatesConfig);
        const defaultTemplateId = templateIds[0] || 'xinyao0319';
        const defaultTemplate = templatesConfig[defaultTemplateId];
        
        if (!defaultTemplate) {
            return res.status(404).json({ error: 'No templates available' });
        }
        
        const roleConfig = promptsConfig[defaultTemplate.role] || {};
        
        const currentTemplate = {
            id: defaultTemplateId,
            ...defaultTemplate,
            prompt: roleConfig.prompt || '',
            fullRoleConfig: roleConfig
        };
        
        res.json(currentTemplate);
    } catch (error) {
        console.error('Error in /templates/current:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.post('/templates/select', (req, res) => {
    try {
        const { templateId } = req.body;
        console.log('Template selection request:', templateId);
        
        if (!templateId) {
            return res.status(400).json({ error: 'Template ID is required' });
        }
        
        const selectedTemplate = templatesConfig[templateId];
        if (!selectedTemplate) {
            return res.status(404).json({ 
                error: 'Template not found',
                availableTemplates: Object.keys(templatesConfig)
            });
        }
        
        const roleConfig = promptsConfig[selectedTemplate.role] || {};
        
        const responseTemplate = {
            id: templateId,
            ...selectedTemplate,
            prompt: roleConfig.prompt || '',
            fullRoleConfig: roleConfig
        };
        
        res.json({ 
            success: true, 
            template: responseTemplate,
            message: `已切换到${selectedTemplate.name}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in /templates/select:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// 新增：获取角色配置API
app.get('/roles', (req, res) => {
    try {
        res.json(promptsConfig);
    } catch (error) {
        console.error('Error in /roles:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// 新增：获取特定角色配置API
app.get('/roles/:roleId', (req, res) => {
    try {
        const { roleId } = req.params;
        const roleConfig = promptsConfig[roleId];
        
        if (!roleConfig) {
            return res.status(404).json({ 
                error: 'Role not found',
                availableRoles: Object.keys(promptsConfig)
            });
        }
        
        res.json(roleConfig);
    } catch (error) {
        console.error('Error in /roles/:roleId:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// 静态文件服务（添加强制无缓存头）
app.use('/static', express.static(path.join(__dirname, 'static'), {
    maxAge: 0,
    etag: false,
    lastModified: false,
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

// 主页路由
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Index file not found');
    }
});

// 处理所有其他路由，返回主页（SPA支持）
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Page not found');
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 数字人通话系统已启动`);
    console.log(`📡 服务器运行在: http://0.0.0.0:${PORT}`);
    console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 LiveKit URL: ${process.env.LIVEKIT_WS_URL || '未配置'}`);
    console.log(`⏰ 启动时间: ${new Date().toISOString()}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在优雅关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('收到SIGINT信号，正在优雅关闭服务器...');
    process.exit(0);
});