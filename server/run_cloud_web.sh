#!/bin/bash
# 云转发Web服务启动脚本

# 设置环境变量（可根据实际情况修改）
export LIVEKIT_URL="wss://101.42.242.213:7443"
export LIVEKIT_API_KEY="APIi8ZGP6SSZJzC"
export LIVEKIT_API_SECRET="wHXediXHus2Lq1atGuyBC7jU2gwvJ4H9j9xdATXWoOE"
export LIVEKIT_ROOM="dh-stream"

# 启动云转发Web服务
echo "启动云转发Web服务..."
echo "LiveKit URL: $LIVEKIT_URL"
echo "LiveKit Room: $LIVEKIT_ROOM"

python3 cloud_web_server.py \
    --host 0.0.0.0 \
    --port 8080
