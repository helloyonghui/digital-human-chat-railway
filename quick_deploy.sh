#!/bin/bash

# 通话式数字人播放器 - 快速部署脚本
# 保持现有server架构，与上游数字人系统完美对接

echo "🚀 开始部署通话式数字人播放器..."

# 1. 检查Python环境
echo "📋 检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3未安装，请先安装Python 3.9+"
    exit 1
fi

# 2. 安装依赖
echo "📦 安装Python依赖..."
pip3 install -r requirements.txt

# 3. 配置环境变量（请根据实际情况修改）
echo "⚙️ 配置环境变量..."
export LIVEKIT_URL="wss://motabay.com"
export LIVEKIT_API_KEY="IpUMpIglKgDpCfoy"
export LIVEKIT_API_SECRET="5929581c8a9da6c44b99f105a609981f"
export LIVEKIT_ROOM="dh-stream"
export CLOUD_TEMPLATE_COVERS_DIR="$(pwd)/server/template_covers"
export CLOUD_TEMPLATE_JSON="$(pwd)/server/config/template.json"
export CLOUD_PROMPT_JSON="$(pwd)/server/config/prompt.json"

# 4. 检查配置文件
echo "🔍 检查配置文件..."
if [ ! -f "server/config/template.json" ]; then
    echo "❌ 模板配置文件不存在: server/config/template.json"
    exit 1
fi

if [ ! -f "server/config/prompt.json" ]; then
    echo "❌ 提示词配置文件不存在: server/config/prompt.json"
    exit 1
fi

# 5. 检查SSL证书（HTTPS部署需要）
if [ -f "server/motabay.com.crt" ] && [ -f "server/motabay.com.key" ]; then
    echo "🔐 发现SSL证书，将启用HTTPS"
    HTTPS_FLAG="--enable_https"
else
    echo "⚠️ 未发现SSL证书，将使用HTTP模式"
    HTTPS_FLAG=""
fi

# 6. 启动服务器
echo "🌟 启动数字人播放器服务..."
echo "📍 访问地址: http://localhost:8080 (或 https://localhost:8080)"
echo "🔗 LiveKit服务器: $LIVEKIT_URL"
echo "🏠 房间名称: $LIVEKIT_ROOM"
echo ""
echo "💡 部署完成后，前端将通过以下方式与上游数字人系统对接："
echo "   1. 前端选择模板 → LiveKit DataChannel → 上游数字人系统"
echo "   2. 上游系统推流 → LiveKit房间 → 前端实时播放"
echo "   3. 用户语音输入 → LiveKit → 上游AI处理 → 数字人回复"
echo ""

cd server
python3 cloud_gateway.py --host 0.0.0.0 --port 8080 $HTTPS_FLAG