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

// LiveKit相关API
app.get('/api/livekit/join', async (req, res) => {
    try {
        const { room, identity } = req.query;
        const roomName = room || process.env.LIVEKIT_ROOM || 'digital-human-room';
        const participantName = identity || 'user-' + Date.now();
        
        // Check if we have the required LiveKit credentials
        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
            console.error('Missing LiveKit credentials');
            return res.status(500).json({ 
                error: 'LiveKit credentials not configured',
                message: 'Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables'
            });
        }

        // Generate a proper LiveKit access token
        const token = new AccessToken(
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET,
            {
                identity: participantName,
                ttl: '10m', // Token valid for 10 minutes
            }
        );

        // Grant permissions
        token.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        const jwt = await token.toJwt();
        
        const response = {
            url: process.env.LIVEKIT_WS_URL || 'wss://your-livekit-server.livekit.cloud',
            token: jwt,
            room: roomName,
            participant: participantName
        };
        
        console.log('LiveKit join request:', { ...response, token: 'jwt-token-generated' });
        res.json(response);
    } catch (error) {
        console.error('LiveKit join error:', error);
        res.status(500).json({ error: 'Failed to join LiveKit room', details: error.message });
    }
});

// 备用LiveKit接口
app.get('/lk/join', async (req, res) => {
    try {
        const { room, identity } = req.query;
        const roomName = room || process.env.LIVEKIT_ROOM || 'digital-human-room';
        const participantName = identity || 'user-' + Date.now();
        
        // Check if we have the required LiveKit credentials
        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
            console.error('Missing LiveKit credentials');
            return res.status(500).json({ 
                error: 'LiveKit credentials not configured',
                message: 'Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables'
            });
        }

        // Generate a proper LiveKit access token
        const token = new AccessToken(
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET,
            {
                identity: participantName,
                ttl: '10m', // Token valid for 10 minutes
            }
        );

        // Grant permissions
        token.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        const jwt = await token.toJwt();
        
        const response = {
            url: process.env.LIVEKIT_WS_URL || 'wss://your-livekit-server.livekit.cloud',
            token: jwt,
            room: roomName,
            participant: participantName
        };
        
        console.log('LiveKit join request (backup):', { ...response, token: 'jwt-token-generated' });
        res.json(response);
    } catch (error) {
        console.error('LiveKit join error (backup):', error);
        res.status(500).json({ error: 'Failed to join LiveKit room', details: error.message });
    }
});

// LiveKit停止接口
app.post('/lk/stop', (req, res) => {
    try {
        console.log('LiveKit stop request received');
        res.json({ status: 'stopped' });
    } catch (error) {
        console.error('Error in /lk/stop:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
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