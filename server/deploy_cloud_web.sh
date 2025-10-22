#!/bin/bash
# 云端Web服务器部署脚本
# 此脚本用于在云服务器上部署Web服务

CLOUD_IP="motabay.com"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# LiveKit配置（指向LiveKit服务器）
LIVEKIT_URL="wss://$CLOUD_IP:7443"
LIVEKIT_API_KEY="APIi8ZGP6SSZJzC"
LIVEKIT_API_SECRET="wHXediXHus2Lq1atGuyBC7jU2gwvJ4H9j9xdATXWoOE"
LIVEKIT_ROOM="dh-stream"

# 导出环境变量
export LIVEKIT_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET LIVEKIT_ROOM

show_help() {
    echo "云端Web服务器部署脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start          启动云端Web服务"
    echo "  stop           停止Web服务"
    echo "  restart        重启Web服务"
    echo "  status         查看服务状态"
    echo "  logs           查看服务日志"
    echo "  help           显示此帮助信息"
    echo ""
    echo "部署架构:"
    echo "  [私网机器] 推流服务 --> [LiveKit服务器] <-- [云服务器] Web服务 --> [外部用户]"
    echo ""
    echo "配置:"
    echo "  LiveKit URL: $LIVEKIT_URL"
    echo "  LiveKit Room: $LIVEKIT_ROOM"
    echo "  Web服务端口: 8443 (HTTPS)"
    echo "  访问地址: https://$CLOUD_IP:8443"
    echo ""
    echo "注意："
    echo "  - 此脚本运行在云服务器上"
    echo "  - 私网推流服务需要单独在私网机器上运行"
    echo "  - 确保LiveKit服务器可以被两端访问"
}

# 启动Web服务
start_web() {
    echo "启动云端Web服务..."
    echo "注意：请确保已配置以下环境变量："
    echo "  LIVEKIT_URL: LiveKit服务器地址"
    echo "  LIVEKIT_API_KEY: LiveKit API密钥"
    echo "  LIVEKIT_API_SECRET: LiveKit API密钥"
    echo "  LIVEKIT_ROOM: LiveKit房间名"
    echo ""
    echo "模板图片将从本地 template_covers/ 目录提供服务"
    echo ""
    
    # 检查是否已经运行
    if pgrep -f "cloud_web_server.py" > /dev/null; then
        echo "Web服务已在运行"
        return 1
    fi
    
    # 启动Web服务 (HTTPS 8443端口)
    cd "$SCRIPT_DIR"
    nohup python3 cloud_web_server.py --host 0.0.0.0 --port 8443 --enable_https > cloud_web_service.log 2>&1 &
    
    echo "Web服务已启动，PID: $!"
    echo "日志文件: cloud_web_service.log"
    echo "访问地址: https://$CLOUD_IP:8443"
    echo "LiveKit连接: $LIVEKIT_URL (房间: $LIVEKIT_ROOM)"
}

# 停止Web服务
stop_web() {
    echo "停止云端Web服务..."
    
    if pgrep -f "cloud_web_server.py" > /dev/null; then
        pkill -f "cloud_web_server.py"
        echo "Web服务已停止"
    else
        echo "Web服务未运行"
    fi
}

# 重启Web服务
restart_web() {
    echo "重启云端Web服务..."
    stop_web
    sleep 2
    start_web
}

# 查看服务状态
check_status() {
    echo "=== 云端Web服务状态 ==="
    
    if pgrep -f "cloud_web_server.py" > /dev/null; then
        echo "Web服务: 运行中 (PID: $(pgrep -f 'cloud_web_server.py'))"
    else
        echo "Web服务: 未运行"
    fi
    
    echo ""
    echo "=== 配置信息 ==="
    echo "LiveKit URL: $LIVEKIT_URL"
    echo "LiveKit Room: $LIVEKIT_ROOM"
    echo "Web服务端口: 8443 (HTTPS)"
    echo "访问地址: https://$CLOUD_IP:8443"
    
    echo ""
    echo "=== 部署架构 ==="
    echo "[私网机器] 推流服务 --> [LiveKit服务器] <-- [云服务器] Web服务 --> [外部用户]"
}

# 查看Web服务日志
show_logs() {
    if [ -f "$SCRIPT_DIR/cloud_web_service.log" ]; then
        echo "=== Web服务日志 (最后50行) ==="
        tail -50 "$SCRIPT_DIR/cloud_web_service.log"
    else
        echo "Web服务日志文件不存在"
    fi
}

# 主程序
case "$1" in
    "start")
        start_web
        ;;
    "stop")
        stop_web
        ;;
    "restart")
        restart_web
        ;;
    "status")
        check_status
        ;;
    "logs")
        show_logs
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        echo "未知命令: $1"
        echo "使用 '$0 help' 查看帮助信息"
        exit 1
        ;;
esac