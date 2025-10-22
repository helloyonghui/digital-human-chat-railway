const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.LOCAL_PORT || 3000;
const REMOTE_SERVER = process.env.REMOTE_SERVER_URL || 'https://motabay.com:8443';

console.log('🔧 配置本地代理服务器...');
console.log(`📡 远程服务器: ${REMOTE_SERVER}`);
console.log(`🌐 本地端口: ${PORT}`);

// 配置CORS - 允许本地开发
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 静态文件服务 - 服务前端文件
app.use(express.static('.', {
  index: 'index.html',
  setHeaders: (res, path) => {
    // 设置正确的MIME类型
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// 代理LiveKit相关API
app.use('/lk', createProxyMiddleware({
  target: REMOTE_SERVER,
  changeOrigin: true,
  secure: true, // 验证SSL证书
  logLevel: 'info',
  onError: (err, req, res) => {
    console.error('❌ LiveKit API代理错误:', err.message);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: err.message,
      target: REMOTE_SERVER 
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 代理请求: ${req.method} ${req.url} -> ${REMOTE_SERVER}${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ 代理响应: ${proxyRes.statusCode} ${req.url}`);
  }
}));

// 代理模板相关API
app.use('/templates', createProxyMiddleware({
  target: REMOTE_SERVER,
  changeOrigin: true,
  secure: true,
  logLevel: 'info',
  onError: (err, req, res) => {
    console.error('❌ 模板API代理错误:', err.message);
    res.status(500).json({ 
      error: 'Template proxy error', 
      message: err.message 
    });
  }
}));

// 代理静态资源（模板封面等）
app.use('/template_covers', createProxyMiddleware({
  target: REMOTE_SERVER,
  changeOrigin: true,
  secure: true,
  logLevel: 'warn' // 减少日志噪音
}));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    proxy_target: REMOTE_SERVER,
    local_port: PORT,
    timestamp: new Date().toISOString()
  });
});

// API测试端点
app.get('/test-proxy', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${REMOTE_SERVER}/templates`, {
      method: 'GET',
      headers: { 'User-Agent': 'Local-Proxy-Test' }
    });
    
    if (response.ok) {
      const data = await response.json();
      res.json({
        status: 'success',
        message: '代理连接正常',
        remote_server: REMOTE_SERVER,
        templates_count: Object.keys(data).length
      });
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '代理连接失败',
      error: error.message,
      remote_server: REMOTE_SERVER
    });
  }
});

// 默认路由 - 返回index.html（SPA支持）
app.get('*', (req, res) => {
  // 排除API路径
  if (req.path.startsWith('/lk') || 
      req.path.startsWith('/templates') || 
      req.path.startsWith('/template_covers') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/test-proxy')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('🚨 服务器错误:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 本地代理服务器启动成功!');
  console.log('');
  console.log(`📍 前端访问地址: http://localhost:${PORT}`);
  console.log(`🔗 代理目标服务器: ${REMOTE_SERVER}`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
  console.log(`🧪 连接测试: http://localhost:${PORT}/test-proxy`);
  console.log('');
  console.log('💡 使用说明:');
  console.log('   1. 浏览器访问 http://localhost:3000');
  console.log('   2. 前端将自动通过代理连接远程LiveKit服务');
  console.log('   3. 支持热重载和本地开发调试');
  console.log('');
  console.log('🔧 环境变量配置:');
  console.log(`   REMOTE_SERVER_URL=${REMOTE_SERVER}`);
  console.log(`   LOCAL_PORT=${PORT}`);
  console.log('');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭本地代理服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 收到终止信号，关闭服务器...');
  process.exit(0);
});