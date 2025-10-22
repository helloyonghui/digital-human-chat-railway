#!/bin/bash

# 本地前端开发启动脚本
# 解决本地前端无法直接连接远程LiveKit的问题

echo "🎯 数字人播放器 - 本地开发模式"
echo "=================================="

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js 16+"
    echo "   下载地址: https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装，请检查Node.js安装"
    exit 1
fi

echo "✅ Node.js环境检查通过"

# 检查package.json，如果不存在则创建
if [ ! -f "package.json" ]; then
    echo "📦 初始化npm项目..."
    cat > package.json << EOF
{
  "name": "digital-human-local-dev",
  "version": "1.0.0",
  "description": "Digital Human Player Local Development Proxy",
  "main": "local_proxy.js",
  "scripts": {
    "start": "node local_proxy.js",
    "dev": "node local_proxy.js",
    "test": "node -e \"console.log('Proxy server test')\""
  },
  "dependencies": {
    "express": "^4.18.2",
    "http-proxy-middleware": "^2.0.6",
    "cors": "^2.8.5",
    "node-fetch": "^3.3.2"
  },
  "keywords": ["digital-human", "livekit", "proxy"],
  "author": "Digital Human Team",
  "license": "MIT"
}
EOF
fi

# 安装依赖
echo "📦 安装代理服务器依赖..."
npm install

# 检查安装结果
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败，请检查网络连接"
    exit 1
fi

echo "✅ 依赖安装完成"

# 配置环境变量
export REMOTE_SERVER_URL="${REMOTE_SERVER_URL:-https://motabay.com:8443}"
export LOCAL_PORT="${LOCAL_PORT:-3000}"

echo ""
echo "⚙️ 配置信息:"
echo "   远程服务器: $REMOTE_SERVER_URL"
echo "   本地端口: $LOCAL_PORT"
echo ""

# 检查端口是否被占用
if lsof -Pi :$LOCAL_PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ 端口 $LOCAL_PORT 已被占用，尝试使用其他端口..."
    export LOCAL_PORT=$((LOCAL_PORT + 1))
    echo "   新端口: $LOCAL_PORT"
fi

# 启动代理服务器
echo "🚀 启动本地代理服务器..."
echo ""
echo "💡 启动后请访问: http://localhost:$LOCAL_PORT"
echo "🔧 停止服务: Ctrl+C"
echo ""

# 启动服务器，并在后台检查连接
node local_proxy.js &
PROXY_PID=$!

# 等待服务器启动
sleep 3

# 检查服务器是否正常启动
if kill -0 $PROXY_PID 2>/dev/null; then
    echo "✅ 代理服务器启动成功 (PID: $PROXY_PID)"
    
    # 测试连接
    echo "🧪 测试代理连接..."
    if curl -s "http://localhost:$LOCAL_PORT/health" > /dev/null; then
        echo "✅ 代理服务器健康检查通过"
        
        # 尝试打开浏览器
        if command -v open &> /dev/null; then
            echo "🌐 正在打开浏览器..."
            open "http://localhost:$LOCAL_PORT"
        elif command -v xdg-open &> /dev/null; then
            echo "🌐 正在打开浏览器..."
            xdg-open "http://localhost:$LOCAL_PORT"
        else
            echo "🌐 请手动打开浏览器访问: http://localhost:$LOCAL_PORT"
        fi
    else
        echo "⚠️ 代理服务器健康检查失败，但服务可能仍在启动中"
    fi
    
    # 等待用户中断
    wait $PROXY_PID
else
    echo "❌ 代理服务器启动失败"
    exit 1
fi