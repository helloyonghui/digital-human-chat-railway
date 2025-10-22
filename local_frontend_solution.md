# 本地前端访问数字人系统解决方案

## 🎯 问题分析

经过深入分析，确认了您的怀疑是正确的：**当前架构确实不允许本地运行前端来连接数字人和LiveKit服务器**。

### 核心问题
1. **Token依赖**：前端必须通过server的 `/lk/join` API获取LiveKit访问token
2. **CORS限制**：本地前端无法跨域访问远程server API
3. **HTTPS要求**：生产环境的LiveKit需要HTTPS，本地开发受限

## 🔧 三种解决方案

### 方案一：本地代理模式（推荐）
创建本地代理服务，转发token请求到远程server

#### 实现步骤
```bash
# 1. 创建本地代理服务器
npm install -g http-proxy-middleware express cors

# 2. 启动代理服务
node local_proxy.js

# 3. 本地前端通过代理访问
http://localhost:3000 -> 代理 -> https://your-server.com
```

#### 优势
- 前端代码无需修改
- 保持现有架构
- 开发体验最佳

### 方案二：前端直连模式
修改前端代码，支持直接连接LiveKit（需要预配置token）

#### 实现步骤
1. 在server端生成长期有效的token
2. 前端硬编码或通过配置文件获取token
3. 绕过 `/lk/join` 直接连接LiveKit

#### 优势
- 完全本地化
- 无需额外服务

#### 劣势
- 安全性较低
- token管理复杂

### 方案三：混合部署模式
仅部署server到公网，前端保持本地开发

#### 实现步骤
1. 将server部署到公网（如Vercel、Railway）
2. 配置CORS允许本地前端访问
3. 本地前端通过HTTPS访问远程server API

#### 优势
- 安全性高
- 架构清晰

## 🚀 推荐实现：本地代理模式

### 1. 创建本地代理服务器
```javascript
// local_proxy.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// 配置CORS
app.use(cors({
  origin: '*',
  credentials: true
}));

// 静态文件服务（前端文件）
app.use(express.static('.'));

// 代理API请求到远程server
app.use('/lk', createProxyMiddleware({
  target: 'https://your-server.com:8443', // 替换为实际server地址
  changeOrigin: true,
  secure: true,
  logLevel: 'debug'
}));

app.use('/templates', createProxyMiddleware({
  target: 'https://your-server.com:8443',
  changeOrigin: true,
  secure: true
}));

// 默认路由返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 本地代理服务器启动: http://localhost:${PORT}`);
  console.log(`📡 代理目标: https://your-server.com:8443`);
});
```

### 2. 快速启动脚本
```bash
#!/bin/bash
# local_dev.sh

echo "🔧 安装依赖..."
npm install express http-proxy-middleware cors

echo "🚀 启动本地开发环境..."
echo "📍 前端访问: http://localhost:3000"
echo "🔗 API代理: https://your-server.com:8443"

node local_proxy.js
```

### 3. 配置说明
```bash
# 环境变量配置
export REMOTE_SERVER_URL="https://your-server.com:8443"
export LOCAL_PORT="3000"
export ENABLE_HTTPS_PROXY="true"
```

## 🎨 前端配置调整

### 修改API端点（可选）
```javascript
// 在main.js中添加环境检测
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'  // 本地代理
  : '';                      // 生产环境

// 修改fetch调用
const resp = await fetch(`${API_BASE}/lk/join`, { cache: 'no-store' });
```

## 🔍 部署架构对比

### 当前架构（必须全部署）
```
浏览器 -> 公网Server -> LiveKit服务器
       ↑
   必须HTTPS访问
```

### 本地代理架构（推荐）
```
浏览器 -> 本地代理 -> 公网Server -> LiveKit服务器
  ↑         ↑           ↑
HTTP    HTTP转HTTPS   HTTPS
```

### 直连架构（高级用户）
```
浏览器 -> LiveKit服务器
  ↑           ↑
预配置token  直接WebRTC
```

## ⚡ 快速验证

### 测试本地代理是否工作
```bash
# 1. 启动代理服务
node local_proxy.js

# 2. 测试API转发
curl http://localhost:3000/lk/join

# 3. 浏览器访问
open http://localhost:3000
```

### 检查LiveKit连接
```javascript
// 在浏览器控制台执行
fetch('/lk/join')
  .then(r => r.json())
  .then(data => console.log('Token获取成功:', data))
  .catch(e => console.error('连接失败:', e));
```

## 🎯 最终建议

**对于开发阶段**：使用本地代理模式，既保持了架构的完整性，又实现了本地开发的便利性。

**对于生产部署**：仍然需要将前端和server都部署到公网，确保HTTPS和性能。

这样既解决了您提出的本地开发问题，又保持了系统的安全性和可维护性。