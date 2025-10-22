# 通话式数字人播放器 - 公网部署指南

## 项目架构概述

本项目是一个基于LiveKit的实时通话式数字人播放器，采用前后端分离架构：

### 核心组件
- **前端**: 纯Web应用，使用LiveKit客户端进行实时音视频通信
- **后端**: Python aiohttp服务器，负责LiveKit令牌签发和模板管理
- **LiveKit服务器**: 实时音视频流媒体服务器
- **数字人渲染服务**: 独立的流媒体处理服务（需要单独部署）

### 技术栈
- 前端：HTML5 + JavaScript + LiveKit Client SDK
- 后端：Python 3.9+ + aiohttp + livekit-api
- 流媒体：LiveKit WebRTC
- 部署：Docker + Docker Compose

## 最简单的公网部署方案

### 方案一：使用现有LiveKit云服务（推荐）

#### 1. 准备工作
```bash
# 克隆项目
git clone <your-repo>
cd newNH

# 安装依赖
pip install -r requirements.txt
```

#### 2. 配置环境变量
创建 `.env` 文件：
```bash
# LiveKit配置（使用LiveKit Cloud或自建服务器）
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_ROOM=dh-stream

# 模板配置
CLOUD_TEMPLATE_COVERS_DIR=/app/server/template_covers
CLOUD_TEMPLATE_JSON=/app/server/template.json
CLOUD_PROMPT_JSON=/app/server/prompt.json
```

#### 3. 直接运行
```bash
cd server
python3 cloud_gateway.py --host 0.0.0.0 --port 8080
```

#### 4. 使用Nginx反向代理（生产环境）
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 方案二：Docker部署（推荐生产环境）

#### 1. 构建镜像
```bash
docker build -t digital-human-web .
```

#### 2. 运行容器
```bash
docker run -d \
  --name digital-human \
  -p 8080:8080 \
  -e LIVEKIT_URL=wss://your-livekit-server.com \
  -e LIVEKIT_API_KEY=your-api-key \
  -e LIVEKIT_API_SECRET=your-api-secret \
  -e LIVEKIT_ROOM=dh-stream \
  digital-human-web
```

#### 3. 使用Docker Compose（完整方案）
```bash
# 修改docker-compose.yml中的环境变量
docker-compose up -d
```

### 方案三：云平台一键部署

#### Vercel部署（仅前端）
1. 将前端文件推送到GitHub
2. 在Vercel中导入项目
3. 配置环境变量
4. 部署

#### Railway/Render部署（全栈）
1. 连接GitHub仓库
2. 配置环境变量
3. 选择Python运行时
4. 设置启动命令：`python3 server/cloud_gateway.py --host 0.0.0.0 --port $PORT`

## LiveKit服务器部署

### 选项1：使用LiveKit Cloud（最简单）
1. 注册 [LiveKit Cloud](https://cloud.livekit.io/)
2. 创建项目获取API密钥
3. 配置环境变量

### 选项2：自建LiveKit服务器
```yaml
# livekit.yaml
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
redis:
  address: localhost:6379
keys:
  your-api-key: your-api-secret
```

```bash
# 使用Docker运行LiveKit
docker run -d \
  --name livekit \
  -p 7880:7880 \
  -p 7881:7881/udp \
  -p 50000-60000:50000-60000/udp \
  -v $(pwd)/livekit.yaml:/etc/livekit.yaml \
  livekit/livekit-server:latest
```

## 数字人渲染服务部署

数字人渲染服务需要单独部署，通常包含：
- AI语音合成服务
- 数字人视频生成服务
- 实时流媒体推送服务

这部分需要根据具体的数字人技术栈进行配置。

## 安全配置

### HTTPS配置
生产环境必须使用HTTPS：

1. 获取SSL证书（Let's Encrypt推荐）
2. 配置Nginx SSL
3. 更新LiveKit URL为wss://

### 防火墙配置
```bash
# 开放必要端口
ufw allow 80
ufw allow 443
ufw allow 8080
ufw allow 7880
ufw allow 7881/udp
ufw allow 50000:60000/udp
```

## 监控和日志

### 日志配置
```python
# 在cloud_gateway.py中配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/digital-human.log'),
        logging.StreamHandler()
    ]
)
```

### 健康检查
添加健康检查端点：
```python
async def health_check(request):
    return web.json_response({"status": "healthy"})

app.router.add_get('/health', health_check)
```

## 性能优化

### 前端优化
- 启用gzip压缩
- 使用CDN加速静态资源
- 优化视频编码参数

### 后端优化
- 使用Redis缓存
- 配置连接池
- 启用异步处理

## 故障排除

### 常见问题
1. **连接失败**: 检查LiveKit服务器状态和网络连接
2. **音视频不同步**: 调整缓冲区设置
3. **权限错误**: 确保HTTPS环境下的媒体权限

### 调试命令
```bash
# 检查服务状态
curl http://localhost:8080/health

# 查看日志
tail -f /var/log/digital-human.log

# 测试LiveKit连接
curl -X GET http://your-livekit-server:7880/rtc/validate
```

## 扩展部署

### 负载均衡
使用Nginx或HAProxy进行负载均衡：
```nginx
upstream digital_human {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
}
```

### 集群部署
- 使用Docker Swarm或Kubernetes
- 配置共享存储
- 实现服务发现

## 成本优化

### 资源配置建议
- **最小配置**: 1核2G内存，适合测试
- **生产配置**: 2核4G内存，支持并发用户
- **高并发配置**: 4核8G内存，支持大量用户

### 云服务商选择
- **AWS**: 使用EC2 + ELB + CloudFront
- **阿里云**: 使用ECS + SLB + CDN
- **腾讯云**: 使用CVM + CLB + CDN

通过以上方案，可以快速实现数字人播放器的公网部署。建议从方案一开始，逐步优化到生产级别的Docker部署方案。