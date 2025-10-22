# 数字人播放器与上游系统对接指南

## 🎯 对接架构概述

本播放器已经完美设计了与上游数字人推流系统的对接机制，通过LiveKit实现实时通信。

```
前端播放器 ←→ LiveKit服务器 ←→ 上游数字人系统
    ↓              ↓              ↓
模板选择      实时音视频流      AI处理引擎
用户交互      DataChannel      数字人渲染
```

## 🔗 对接机制详解

### 1. 模板选择与通信
- **前端**: 用户选择数字人模板 → `TemplateSelector.onSelect()`
- **通信**: 通过LiveKit DataChannel发送模板信息
- **上游**: 接收模板选择，切换对应的数字人角色和提示词

### 2. 实时音视频流
- **上游推流**: 数字人渲染结果推送到LiveKit房间
- **前端接收**: 自动接收并播放音视频流
- **双向通信**: 支持用户语音输入传输给上游系统

### 3. 控制信号传输
- **中断信号**: `sendInterrupt()` → DataChannel → 上游系统暂停
- **停止信号**: `sendStop()` → 通知上游系统结束会话
- **状态同步**: 连接状态、播放状态实时同步

## ⚙️ 配置要求

### 环境变量配置
```bash
# LiveKit服务器配置（与上游系统保持一致）
LIVEKIT_URL="wss://your-livekit-server.com"
LIVEKIT_API_KEY="your-api-key"
LIVEKIT_API_SECRET="your-api-secret"
LIVEKIT_ROOM="dh-stream"  # 房间名称需与上游系统一致

# 模板配置路径
CLOUD_TEMPLATE_COVERS_DIR="./server/template_covers"
CLOUD_TEMPLATE_JSON="./server/config/template.json"
CLOUD_PROMPT_JSON="./server/config/prompt.json"
```

### 上游系统要求
1. **LiveKit集成**: 上游系统需要集成LiveKit SDK
2. **房间连接**: 连接到相同的LiveKit房间
3. **DataChannel监听**: 监听来自前端的模板选择和控制信号
4. **音视频推流**: 将数字人渲染结果推流到LiveKit

## 🚀 快速部署步骤

### 方式一：直接部署
```bash
# 1. 赋予执行权限
chmod +x quick_deploy.sh

# 2. 修改环境变量（编辑脚本中的LiveKit配置）
vim quick_deploy.sh

# 3. 执行部署
./quick_deploy.sh
```

### 方式二：Docker部署
```bash
# 1. 修改docker-compose.yml中的环境变量
vim docker-compose.yml

# 2. 执行Docker部署
chmod +x docker-deploy.sh
./docker-deploy.sh
```

## 📡 DataChannel通信协议

### 前端发送给上游系统的消息格式

#### 模板选择
```javascript
{
  "type": "template_select",
  "template_id": "xinyao0319",
  "prompt_id": "bank_expert_prompt",
  "voice_id": "zf_001"
}
```

#### 中断信号
```javascript
{
  "type": "interrupt",
  "timestamp": 1640995200000
}
```

#### 停止信号
```javascript
{
  "type": "stop",
  "reason": "user_exit"
}
```

### 上游系统发送给前端的消息格式

#### 助手回复
```javascript
{
  "message_type": "assistant",
  "text": "您好，我是您的专属银行顾问...",
  "timestamp": 1640995200000
}
```

#### 语音识别结果
```javascript
{
  "message_type": "stt",
  "text": "用户说的话",
  "confidence": 0.95
}
```

## 🔧 上游系统集成示例

### Python集成示例
```python
import asyncio
from livekit import api, rtc

class DigitalHumanUpstream:
    def __init__(self):
        self.room = None
        self.current_template = None
    
    async def connect_to_room(self):
        # 连接到LiveKit房间
        self.room = rtc.Room()
        await self.room.connect(url, token)
        
        # 监听DataChannel消息
        self.room.on("data_received", self.on_data_received)
    
    def on_data_received(self, data, participant):
        # 处理前端发送的控制信号
        message = json.loads(data.decode())
        
        if message["type"] == "template_select":
            self.switch_template(message["template_id"])
        elif message["type"] == "interrupt":
            self.pause_generation()
        elif message["type"] == "stop":
            self.stop_session()
    
    def switch_template(self, template_id):
        # 切换数字人模板和提示词
        self.current_template = template_id
        # 更新AI角色设定...
    
    async def send_response(self, text):
        # 发送助手回复给前端
        message = {
            "message_type": "assistant",
            "text": text,
            "timestamp": int(time.time() * 1000)
        }
        await self.room.local_participant.publish_data(
            json.dumps(message).encode()
        )
```

## 🎨 模板配置说明

### template.json结构
```json
{
  "xinyao0319": {
    "prompt_id": "bank_expert_prompt",
    "voice_id": "zf_001"
  }
}
```

### prompt.json结构
```json
{
  "bank_expert_prompt": {
    "content": "你是一位专业的银行理财顾问...",
    "style": "专业、亲和、可信赖",
    "constraints": ["回答简洁明了", "使用专业术语"]
  }
}
```

## 🔍 故障排查

### 常见问题
1. **连接失败**: 检查LiveKit服务器地址和认证信息
2. **模板不显示**: 检查template_covers目录和配置文件
3. **DataChannel不通**: 确认上游系统正确监听DataChannel事件
4. **音视频不同步**: 检查网络延迟和LiveKit服务器性能

### 调试工具
- 浏览器开发者工具查看WebRTC连接状态
- LiveKit Dashboard监控房间状态
- 服务器日志分析连接和消息传输

## 📈 性能优化建议

1. **网络优化**: 使用CDN加速静态资源
2. **LiveKit优化**: 配置合适的编码参数和带宽限制
3. **缓存策略**: 缓存模板配置和封面图片
4. **负载均衡**: 多实例部署提高并发能力

## 🔒 安全考虑

1. **HTTPS部署**: 生产环境必须使用HTTPS
2. **API密钥保护**: 不要在前端暴露LiveKit密钥
3. **房间权限**: 配置合适的房间访问权限
4. **数据加密**: 敏感数据传输加密处理