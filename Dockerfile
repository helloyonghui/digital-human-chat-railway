FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖
RUN pip install aiohttp livekit-api

# 复制项目文件
COPY server/ ./server/
COPY index.html ./
COPY js/ ./js/
COPY lib/ ./lib/
COPY static/ ./static/
COPY styles.css ./

# 设置环境变量
ENV PYTHONPATH=/app
ENV LIVEKIT_URL=wss://your-livekit-server.com
ENV LIVEKIT_API_KEY=your-api-key
ENV LIVEKIT_API_SECRET=your-api-secret
ENV LIVEKIT_ROOM=dh-stream

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["python3", "server/cloud_gateway.py", "--host", "0.0.0.0"]