# 🚀 Railway部署完整指南

## 📋 部署前准备清单

### 1. 必需服务
- [ ] Railway账号 (https://railway.app)
- [ ] LiveKit服务器 (https://livekit.io)
- [ ] GitHub仓库 (推荐)

### 2. 配置信息收集
- [ ] LiveKit API Key
- [ ] LiveKit API Secret  
- [ ] LiveKit WebSocket URL
- [ ] 数字人后端API地址 (如果有)

## 🔧 部署步骤

### 方法一：GitHub自动部署 (推荐)

#### 1. 代码准备
```bash
# 1. 初始化Git仓库
git init
git add .
git commit -m "Initial commit: Digital Human Chat System"

# 2. 推送到GitHub
git remote add origin https://github.com/your-username/digital-human-chat.git
git push -u origin main
```

#### 2. Railway部署
1. 访问 [Railway](https://railway.app)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的仓库
5. Railway会自动检测Node.js项目并开始构建

#### 3. 环境变量配置
在Railway项目设置中添加以下环境变量：

```bash
# 必填配置
LIVEKIT_API_KEY=your_actual_livekit_api_key
LIVEKIT_API_SECRET=your_actual_livekit_secret
LIVEKIT_WS_URL=wss://your-livekit-server.livekit.cloud

# 可选配置
NODE_ENV=production
ALLOWED_ORIGINS=https://your-custom-domain.com
SESSION_SECRET=your_secure_session_secret
JWT_SECRET=your_secure_jwt_secret
LOG_LEVEL=info
```

### 方法二：Railway CLI部署

#### 1. 安装Railway CLI
```bash
npm install -g @railway/cli
```

#### 2. 登录并初始化
```bash
# 登录Railway
railway login

# 初始化项目
railway init
```

#### 3. 设置环境变量
```bash
railway variables set LIVEKIT_API_KEY=your_key
railway variables set LIVEKIT_API_SECRET=your_secret
railway variables set LIVEKIT_WS_URL=wss://your-server.livekit.cloud
railway variables set NODE_ENV=production
```

#### 4. 部署
```bash
railway up
```

### 方法三：使用部署脚本

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑.env文件，填入实际配置

# 2. 运行部署脚本
./deploy.sh
```

## 🔍 部署验证

### 1. 基础功能检查
- [ ] 访问主页: `https://your-app.railway.app`
- [ ] 健康检查: `https://your-app.railway.app/health`
- [ ] 静态资源加载正常
- [ ] 控制台无错误信息

### 2. API接口测试
```bash
# LiveKit连接测试
curl https://your-app.railway.app/api/livekit/join

# 模板接口测试  
curl https://your-app.railway.app/templates

# RTC验证测试
curl https://your-app.railway.app/rtc/validate
```

### 3. 实时通话功能
- [ ] 麦克风权限获取
- [ ] LiveKit连接建立
- [ ] 音频录制和发送
- [ ] 视频流接收和渲染
- [ ] 数据通道消息传输

## 🛠️ LiveKit服务器配置

### 1. LiveKit Cloud (推荐)
1. 访问 https://cloud.livekit.io
2. 创建项目
3. 获取API密钥和WebSocket URL
4. 配置到Railway环境变量

### 2. 自建LiveKit服务器
```yaml
# docker-compose.yml
version: '3.8'
services:
  livekit:
    image: livekit/livekit-server:latest
    ports:
      - "7880:7880"
      - "7881:7881"
    environment:
      - LIVEKIT_CONFIG=/etc/livekit.yaml
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
```

## 🔒 安全配置

### 1. HTTPS强制
Railway自动提供HTTPS，无需额外配置。

### 2. CORS配置
```javascript
// 在server.js中已配置
ALLOWED_ORIGINS=https://your-domain.com,https://another-domain.com
```

### 3. 环境变量安全
- 不要在代码中硬编码敏感信息
- 使用Railway的环境变量功能
- 定期轮换API密钥

## 📊 监控和日志

### 1. Railway日志查看
```bash
# CLI方式
railway logs

# 或在Railway控制台查看
```

### 2. 应用监控
- 健康检查端点: `/health`
- 性能监控: Railway内置监控
- 错误追踪: 查看应用日志

## 🐛 常见问题解决

### 1. 部署失败
```bash
# 检查构建日志
railway logs --deployment

# 常见原因：
# - package.json配置错误
# - 环境变量缺失
# - 端口配置问题
```

### 2. LiveKit连接失败
- 检查API密钥是否正确
- 确认WebSocket URL格式
- 验证网络连接和防火墙

### 3. 静态资源404
- 检查Express静态文件配置
- 确认文件路径正确
- 验证构建过程

### 4. CORS错误
```javascript
// 添加域名到ALLOWED_ORIGINS
ALLOWED_ORIGINS=https://your-domain.com
```

## 🎯 性能优化

### 1. CDN配置
```javascript
// 可选：使用CDN加速静态资源
app.use('/static', express.static(path.join(__dirname), {
    maxAge: '7d', // 缓存7天
    etag: true
}));
```

### 2. 压缩优化
```javascript
// 已在server.js中配置compression中间件
app.use(compression());
```

### 3. 数据库连接池
如果使用数据库，配置连接池以提高性能。

## 📞 技术支持

### 遇到问题时的检查顺序：
1. 查看Railway部署日志
2. 检查浏览器控制台错误
3. 验证环境变量配置
4. 测试LiveKit服务器连接
5. 检查网络和防火墙设置

### 联系支持：
- Railway支持: https://railway.app/help
- LiveKit文档: https://docs.livekit.io
- 项目Issues: GitHub仓库Issues页面

---

🎉 **按照此指南完成部署后，您的数字人通话系统就可以在公网上正常运行了！**