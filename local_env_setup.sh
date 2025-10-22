#!/bin/bash

# 本地环境配置脚本
# 用于设置本地开发环境的环境变量

echo "🔧 配置本地开发环境..."

# 检查是否存在 .env 文件
if [ ! -f ".env" ]; then
    echo "📝 创建 .env 文件..."
    cat > .env << EOF
# LiveKit配置 - 请替换为你的实际配置
LIVEKIT_URL=wss://motabay.com
LIVEKIT_API_KEY=your-api-key-here
LIVEKIT_API_SECRET=your-api-secret-here
LIVEKIT_ROOM=dh-stream

# 模板配置
CLOUD_TEMPLATE_COVERS_DIR=./server/template_covers
CLOUD_TEMPLATE_JSON=./server/config/template.json
CLOUD_PROMPT_JSON=./server/config/prompt.json

# 本地代理配置
LOCAL_PORT=3000
REMOTE_SERVER_URL=https://motabay.com:8443
EOF
    echo "✅ .env 文件已创建，请编辑其中的配置"
else
    echo "⚠️  .env 文件已存在，跳过创建"
fi

# 检查Python依赖
echo "🐍 检查Python依赖..."
if ! python3 -c "import livekit" 2>/dev/null; then
    echo "📦 安装LiveKit Python SDK..."
    pip3 install livekit-api
fi

if ! python3 -c "import aiohttp" 2>/dev/null; then
    echo "📦 安装aiohttp..."
    pip3 install aiohttp
fi

# 检查Node.js依赖
echo "📦 检查Node.js依赖..."
if [ ! -d "node_modules" ]; then
    echo "📦 安装Node.js依赖..."
    npm install
fi

# 创建启动脚本
echo "🚀 创建启动脚本..."
cat > start_local_dev.sh << 'EOF'
#!/bin/bash

# 加载环境变量
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "🌐 启动本地开发环境..."
echo "前端地址: http://localhost:${LOCAL_PORT:-3000}"
echo "后端API: ${REMOTE_SERVER_URL:-https://motabay.com:8443}"

# 启动本地代理服务器
node local_proxy.js
EOF

chmod +x start_local_dev.sh

echo ""
echo "✅ 本地环境配置完成！"
echo ""
echo "📋 下一步操作："
echo "1. 编辑 .env 文件，填入正确的LiveKit配置"
echo "2. 运行 ./start_local_dev.sh 启动本地开发服务器"
echo "3. 访问 http://localhost:3000 查看应用"
echo ""
echo "⚠️  注意：本地开发仍需要连接到云端的LiveKit和AI服务"
echo "💡 建议：考虑直接使用Railway等云平台进行完整部署"