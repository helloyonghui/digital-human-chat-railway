const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
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

// LiveKit相关API
app.get('/api/livekit/join', async (req, res) => {
    try {
        // 这里需要根据实际的LiveKit配置生成token
        // 暂时返回模拟数据，实际部署时需要配置真实的LiveKit服务
        const mockResponse = {
            url: process.env.LIVEKIT_WS_URL || 'wss://your-livekit-server.livekit.cloud',
            token: 'mock-token-for-development',
            room: 'digital-human-room',
            participant: 'user-' + Date.now()
        };
        
        console.log('LiveKit join request:', mockResponse);
        res.json(mockResponse);
    } catch (error) {
        console.error('LiveKit join error:', error);
        res.status(500).json({ error: 'Failed to join LiveKit room' });
    }
});

// 备用LiveKit接口
app.get('/lk/join', async (req, res) => {
    try {
        const mockResponse = {
            url: process.env.LIVEKIT_WS_URL || 'wss://your-livekit-server.livekit.cloud',
            token: 'mock-token-for-development',
            room: 'digital-human-room',
            participant: 'user-' + Date.now()
        };
        
        console.log('LiveKit join request (backup):', mockResponse);
        res.json(mockResponse);
    } catch (error) {
        console.error('LiveKit join error (backup):', error);
        res.status(500).json({ error: 'Failed to join LiveKit room' });
    }
});

// LiveKit停止接口
app.post('/lk/stop', (req, res) => {
    console.log('LiveKit stop request received');
    res.json({ status: 'stopped' });
});

// RTC验证接口
app.get('/rtc/validate', (req, res) => {
    res.json({ 
        status: 'valid',
        timestamp: Date.now(),
        server: 'railway-deployment'
    });
});

// 模板相关API
app.get('/templates', (req, res) => {
    // 模拟模板数据
    const templates = [
        {
            id: 'template1',
            name: '默认数字人',
            preview: '/static/images/template1.jpg',
            description: '标准数字人模板'
        },
        {
            id: 'template2', 
            name: '商务助手',
            preview: '/static/images/template2.jpg',
            description: '专业商务数字人'
        }
    ];
    
    res.json({ templates });
});

app.get('/templates/current', (req, res) => {
    res.json({ 
        current: 'template1',
        name: '默认数字人'
    });
});

app.post('/templates/select', (req, res) => {
    const { templateId } = req.body;
    console.log('Template selected:', templateId);
    res.json({ 
        status: 'success',
        selected: templateId
    });
});

// 静态文件服务
app.use('/static', express.static(path.join(__dirname), {
    maxAge: '1d',
    etag: true,
    lastModified: true
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