# 🤖 实时数字人视频通话系统

基于LiveKit WebRTC技术的实时数字人视频通话系统，支持语音识别、实时对话和高质量视频渲染。

## ✨ 功能特性

- 🎥 **实时视频通话**: 基于LiveKit WebRTC技术
- 🎤 **智能语音识别**: 支持实时语音转文字
- 🤖 **AI数字人对话**: 实时AI回答和语音合成
- 🎨 **高质量渲染**: WebGL硬件加速视频渲染
- 📱 **响应式设计**: 支持桌面和移动设备
- 🔄 **模板切换**: 支持多种数字人模板

## 🚀 Railway部署指南

### 1. 准备工作

1. 注册 [Railway](https://railway.app) 账号
2. 准备LiveKit服务器配置
3. Fork或下载此项目代码

### 2. 环境变量配置

在Railway项目中设置以下环境变量：

```bash
# 必填配置
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_secret  
LIVEKIT_WS_URL=wss://your-livekit-server.livekit.cloud

# 可选配置
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-domain.com
```

### 3. 部署步骤

#### 方法一：GitHub连接部署（推荐）

1. 将代码推送到GitHub仓库
2. 在Railway中创建新项目
3. 连接GitHub仓库
4. 设置环境变量
5. 部署完成

#### 方法二：Railway CLI部署

```bash
# 安装Railway CLI
npm install -g @railway/cli

# 登录Railway
railway login

# 初始化项目
railway init

# 设置环境变量
railway variables set LIVEKIT_API_KEY=your_key
railway variables set LIVEKIT_API_SECRET=your_secret
railway variables set LIVEKIT_WS_URL=wss://your-server.livekit.cloud

# 部署
railway up
```

### 4. 验证部署

部署完成后，访问Railway提供的域名：
- 健康检查: `https://your-app.railway.app/health`
- 主页: `https://your-app.railway.app`

## 🛠️ 本地开发

### 安装依赖

```bash
npm install
```

### 环境配置

```bash
cp .env.example .env
# 编辑 .env 文件，填入实际配置
```

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`

## 📁 项目结构

```
├── server.js              # Express服务器主文件
├── index.html             # 前端主页面
├── main.js                # 主要业务逻辑
├── main copy.js           # LiveKit专用版本
├── styles.css             # 样式文件
├── js/                    # JavaScript模块
│   ├── video_renderer.js  # WebGL视频渲染
│   ├── template_selector.js # 模板选择器
│   ├── smart-voice.js     # 智能语音处理
│   ├── livekit-compatibility.js # LiveKit兼容层
│   └── recorder/          # 音频录制相关
├── lib/                   # 第三方库
│   └── livekit-client.umd.min.js
├── package.json           # 项目配置
├── railway.json           # Railway部署配置
└── .env.example          # 环境变量示例
```

## 🔧 API接口

### LiveKit相关

- `GET /api/livekit/join` - 获取LiveKit连接信息
- `GET /lk/join` - 备用LiveKit连接接口
- `POST /lk/stop` - 停止LiveKit连接
- `GET /rtc/validate` - RTC连接验证

### 模板管理

- `GET /templates` - 获取数字人模板列表
- `GET /templates/current` - 获取当前模板
- `POST /templates/select` - 选择数字人模板

### 系统监控

- `GET /health` - 健康检查接口

## 🔒 安全配置

- HTTPS强制重定向
- CORS跨域保护
- CSP内容安全策略
- Helmet安全头设置
- 环境变量敏感信息保护

## 🐛 故障排除

### 常见问题

1. **LiveKit连接失败**
   - 检查LIVEKIT_WS_URL是否正确
   - 确认API密钥配置无误
   - 验证网络连接和防火墙设置

2. **音视频无法播放**
   - 确保浏览器支持WebRTC
   - 检查麦克风和摄像头权限
   - 尝试HTTPS访问（WebRTC要求）

3. **静态资源加载失败**
   - 检查文件路径是否正确
   - 确认Express静态文件配置
   - 验证CDN或缓存设置

### 日志查看

```bash
# Railway日志
railway logs

# 本地开发日志
npm run dev
```

## 📞 技术支持

如遇到问题，请检查：
1. Railway部署日志
2. 浏览器开发者工具控制台
3. LiveKit服务器状态
4. 网络连接和防火墙设置

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

🎉 **部署成功后，您就可以在公网上体验实时数字人视频通话了！**