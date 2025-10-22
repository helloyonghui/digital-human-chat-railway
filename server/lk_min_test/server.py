import os
import asyncio
import logging
from aiohttp import web

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lk_min_test")

# 返回静态首页
async def index_handler(request):
    here = os.path.dirname(__file__)
    return web.FileResponse(path=os.path.join(here, "static", "index.html"))

# /lk/join：返回前端所需的 LiveKit 连接URL与Token
async def lk_join(request):
    try:
        from livekit import api
    except Exception as e:
        logger.error("缺少 livekit 包，请先安装：pip install livekit", exc_info=True)
        return web.json_response({"error": "livekit package not installed"}, status=500)

    # 环境变量
    raw_url = os.getenv("LIVEKIT_URL")            # 例如：wss://motabay.com
    api_key = os.getenv("LIVEKIT_API_KEY")        # 与 livekit.yaml 中 keys 匹配
    api_secret = os.getenv("LIVEKIT_API_SECRET")  # 与 livekit.yaml 中 keys 匹配
    room_name = os.getenv("LIVEKIT_ROOM", "lk-min-room")

    if not raw_url or not api_key or not api_secret:
        return web.json_response({"error": "env LIVEKIT_URL/API_KEY/API_SECRET missing"}, status=500)

    # 将 http(s) 转为 ws(s)，保留路径（如有 /rtc 则保留）
    url = raw_url
    if url.startswith("https://"):
        url = "wss://" + url[len("https://"):]
    elif url.startswith("http://"):
        url = "ws://" + url[len("http://"):]

    identity = "client-" + os.urandom(6).hex()
    token = api.AccessToken(api_key, api_secret).with_identity(identity).with_grants(
        api.VideoGrants(
            room=room_name,
            room_join=True,
            can_subscribe=True,
            can_publish=True,
            can_publish_data=True,
        )
    ).to_jwt()

    logger.info(f"join: url={url}, room={room_name}, identity={identity}")
    return web.json_response({"url": url, "token": token, "room": room_name})

# 健康检查
async def healthz(request):
    return web.json_response({"status": "ok"})

async def main():
    app = web.Application()
    app.router.add_get("/", index_handler)
    app.router.add_get("/lk/join", lk_join)
    app.router.add_get("/healthz", healthz)
    here = os.path.dirname(__file__)
    app.router.add_static("/static", os.path.join(here, "static"))
    # 通过环境变量控制监听地址与端口，默认适配 Nginx 反代
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8443"))

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    await site.start()
    logger.info(f"lk_min_test listening on http://{host}:{port}")
    while True:
        await asyncio.sleep(3600)

if __name__ == "__main__":
    asyncio.run(main())