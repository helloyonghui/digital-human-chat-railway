#!/bin/bash

# 数字人通话系统 - Railway部署脚本
# 使用方法: ./deploy.sh

echo "🚀 开始部署数字人通话系统到Railway..."

# 检查是否安装了Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI未安装，正在安装..."
    npm install -g @railway/cli
fi

# 检查是否已登录Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 请先登录Railway..."
    railway login
fi

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "⚠️  未找到.env文件，请先配置环境变量："
    echo "   cp .env.example .env"
    echo "   然后编辑.env文件，填入实际的LiveKit配置"
    exit 1
fi

# 读取环境变量并设置到Railway
echo "📝 设置Railway环境变量..."

# 从.env文件读取并设置环境变量
while IFS='=' read -r key value; do
    # 跳过注释和空行
    if [[ $key =~ ^[[:space:]]*# ]] || [[ -z $key ]]; then
        continue
    fi
    
    # 移除可能的引号
    value=$(echo "$value" | sed 's/^["'"'"']//;s/["'"'"']$//')
    
    if [[ -n $value ]]; then
        echo "设置 $key..."
        railway variables --set "$key=$value"
    fi
done < .env

# 部署到Railway
echo "🚀 开始部署..."
railway up

# 获取部署URL
echo "🌐 获取部署URL..."
DEPLOY_URL=$(railway domain)

if [ -n "$DEPLOY_URL" ]; then
    echo "✅ 部署成功！"
    echo "🔗 访问地址: https://$DEPLOY_URL"
    echo "🏥 健康检查: https://$DEPLOY_URL/health"
    echo ""
    echo "📋 后续步骤："
    echo "1. 访问上述URL验证部署"
    echo "2. 检查LiveKit连接是否正常"
    echo "3. 测试音视频通话功能"
    echo "4. 配置自定义域名（可选）"
else
    echo "⚠️  无法获取部署URL，请手动检查Railway控制台"
fi

echo "🎉 部署脚本执行完成！"