#!/bin/bash

# 通话式数字人播放器 - Docker部署脚本
# 使用Docker Compose快速部署完整环境

echo "🐳 开始Docker部署通话式数字人播放器..."

# 1. 检查Docker环境
echo "📋 检查Docker环境..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 2. 检查配置文件
echo "🔍 检查配置文件..."
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Docker Compose配置文件不存在"
    exit 1
fi

# 3. 构建并启动服务
echo "🔨 构建Docker镜像..."
docker-compose build

echo "🚀 启动服务..."
docker-compose up -d

# 4. 检查服务状态
echo "📊 检查服务状态..."
sleep 5
docker-compose ps

# 5. 显示访问信息
echo ""
echo "✅ 部署完成！"
echo "📍 访问地址: http://localhost:8080"
echo "🔗 LiveKit服务器: 根据环境变量配置"
echo ""
echo "💡 服务架构说明："
echo "   - digital-human-web: 前端播放器 + 云网关服务"
echo "   - livekit (可选): 本地LiveKit服务器"
echo ""
echo "🔧 管理命令："
echo "   查看日志: docker-compose logs -f"
echo "   停止服务: docker-compose down"
echo "   重启服务: docker-compose restart"
echo ""
echo "🎯 与上游数字人系统对接："
echo "   1. 确保上游系统连接到相同的LiveKit服务器"
echo "   2. 使用相同的房间名称 (LIVEKIT_ROOM)"
echo "   3. 通过DataChannel进行模板选择和控制通信"