import os
import ssl
import json
import logging
from typing import Union, Optional
from aiohttp import web

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cloud_gateway")

# ------------------ 云端模板注册表（仅使用 prompt.json + template.json + 图片目录） ------------------

class CloudTemplateRegistry:
    def __init__(self, prompt_path: str, template_path: str, covers_dir: str):
        self.prompt_path = prompt_path
        self.template_path = template_path
        self.covers_dir = covers_dir
        self.prompts = self._load_json(self.prompt_path)
        self.templates = self._load_json(self.template_path)

    @staticmethod
    def _load_json(path: str) -> dict:
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f) or {}
        except Exception as e:
            logger.warning(f"load json failed: {path}, {e}")
            return {}

    def _resolve_cover(self, name: str) -> Optional[str]:
        # 在 covers_dir 下按 name.{jpg|png|jpeg|webp} 查找
        for ext in (".jpg", ".png", ".jpeg", ".webp"):
            p = os.path.join(self.covers_dir, f"{name}{ext}")
            if os.path.exists(p):
                return f"/template_covers/{name}{ext}"
        return None

    def list_templates(self) -> dict:
        """返回字典 { name: { name, voice_id, prompt, preview_image } }"""
        out = {}
        for name, info in (self.templates or {}).items():
            prompt_key = (info or {}).get("prompt", "")
            prompt_text = (self.prompts or {}).get(prompt_key, prompt_key)
            out[name] = {
                "name": name,
                "voice_id": (info or {}).get("voice_id"),
                "prompt": prompt_text,
                "preview_image": self._resolve_cover(name),
                # 不设置 is_current；云端不主张“当前”概念
            }
        return out

# ------------------ HTTPS 可选 ------------------

def build_ssl_context(enable_https: bool) -> Optional[ssl.SSLContext]:
    if not enable_https:
        return None
    crt = os.getenv("HTTPS_CERT_FILE", os.path.join(os.path.dirname(__file__), "motabay.com.crt"))
    key = os.getenv("HTTPS_KEY_FILE", os.path.join(os.path.dirname(__file__), "motabay.com.key"))
    if not (os.path.exists(crt) and os.path.exists(key)):
        logger.warning(f"HTTPS cert/key not found: {crt}, {key}; starting without TLS")
        return None
    ctx = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    ctx.load_cert_chain(crt, key)
    logger.info(f"HTTPS enabled with cert={crt}, key={key}")
    return ctx

# ------------------ 应用构建 ------------------

def create_app():
    app = web.Application()

    # 云端只看 prompt/template + 图片目录
    base_dir = os.path.dirname(__file__)
    prompt_path = os.getenv("CLOUD_PROMPT_JSON", os.path.join(base_dir, "config", "prompt.json"))
    template_path = os.getenv("CLOUD_TEMPLATE_JSON", os.path.join(base_dir, "config", "template.json"))
    covers_dir = os.getenv("CLOUD_TEMPLATE_COVERS_DIR", os.path.join(base_dir, "template_covers"))

    registry = CloudTemplateRegistry(prompt_path, template_path, covers_dir)

    async def index_handler(request):
        return web.FileResponse(path=os.path.join(base_dir, "static", "index.html"))

    # 前端网关：仅负责签发LiveKit Token，不处理模板应用
    async def lk_join(request):
        """
        前端网关：仅负责签发LiveKit Token，不处理模板应用
        模板选择将通过LiveKit DataChannel发送给后端处理
        """
        try:
            # 使用与后端相同的房间名称
            room_name = os.getenv('LIVEKIT_ROOM', 'dh-stream')
            logger.info(f"[lk_join] Frontend gateway processing join request for room: {room_name}")
            
            try:
                from livekit import api
            except Exception as e:
                logger.error(f"[lk_join] Failed to import livekit: {e}")
                return web.json_response({"error": "livekit package not installed"}, status=500)

            # 环境变量
            raw_url = os.getenv("LIVEKIT_URL")
            api_key = os.getenv("LIVEKIT_API_KEY")
            api_secret = os.getenv("LIVEKIT_API_SECRET")
            
            if not raw_url or not api_key or not api_secret:
                missing = []
                if not raw_url: missing.append("LIVEKIT_URL")
                if not api_key: missing.append("LIVEKIT_API_KEY") 
                if not api_secret: missing.append("LIVEKIT_API_SECRET")
                error_msg = f"Missing environment variables: {', '.join(missing)}"
                logger.error(f"[lk_join] {error_msg}")
                return web.json_response({"error": error_msg}, status=500)

            # 统一转为 ws(s)
            url = raw_url.strip()
            if url.startswith("https://"):
                url = "wss://" + url[len("https://"):]
            elif url.startswith("http://"):
                url = "ws://" + url[len("http://"):]

            identity = "frontend-client-" + os.urandom(6).hex()
            
            try:
                token = api.AccessToken(api_key, api_secret).with_identity(identity).with_grants(
                    api.VideoGrants(
                        room=room_name,
                        room_join=True,
                        can_subscribe=True,
                        can_publish=True,         # 前端可发布麦克风音频
                        can_publish_data=True,    # 前端可发送DataChannel命令（模板选择/打断等）
                    )
                ).to_jwt()
            except Exception as e:
                logger.error(f"[lk_join] Failed to generate token: {e}")
                return web.json_response({"error": f"Token generation failed: {str(e)}"}, status=500)

            # 前端网关只负责连接信息，不处理模板应用
            # 模板选择将通过LiveKit DataChannel发送给后端
            response_data = {
                "url": url, 
                "token": token, 
                "room": room_name,
                "identity": identity,
                "width": 720,   # 匹配后端配置
                "height": 1280,
                "message": "Connected to LiveKit. Use DataChannel to communicate with backend."
            }
                
            logger.info(f"[lk_join] Frontend gateway success - URL: {url}, Room: {room_name}, Identity: {identity}")
            return web.json_response(response_data)
            
        except Exception as e:
            logger.error(f"[lk_join] Unexpected error: {e}", exc_info=True)
            return web.json_response({"error": f"Internal server error: {str(e)}"}, status=500)

    async def lk_stop(request):
        """处理前端停止请求，通知后端停止推流"""
        try:
            logger.info("📤 Received stop request from frontend")
            # 这里可以添加通知后端停止推流的逻辑
            # 目前只是返回成功状态，实际的停止逻辑由房间空闲检测处理
            return web.json_response({"status": "ok", "message": "Stop request received"})
        except Exception as e:
            logger.error(f"lk_stop error: {e}")
            return web.json_response({"error": str(e)}, status=500)

    async def templates_list(request):
        try:
            return web.json_response(registry.list_templates())
        except Exception as e:
            logger.error(f"templates_list error: {e}")
            return web.json_response({"error": str(e)}, status=500)

    # 路由与静态
    app.router.add_get("/", index_handler)
    app.router.add_get("/lk/join", lk_join)
    app.router.add_post("/lk/stop", lk_stop)
    app.router.add_get("/templates", templates_list)
    app.router.add_static("/static", os.path.join(base_dir, "static"))
    if os.path.isdir(covers_dir):
        app.router.add_static("/template_covers", covers_dir)
        logger.info(f"Serving template covers from: {covers_dir}")
    else:
        logger.warning(f"Template covers dir not found: {covers_dir}")

    return app

async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Cloud Gateway (strict)")
    parser.add_argument("--host", type=str, default="0.0.0.0")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8021)))
    parser.add_argument("--enable_https", action="store_true")
    args = parser.parse_args()

    app = create_app()
    ssl_ctx = build_ssl_context(args.enable_https)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host=args.host, port=args.port, ssl_context=ssl_ctx)
    await site.start()
    logger.info(f"cloud_gateway started on {args.host}:{args.port} (HTTPS={bool(ssl_ctx)})")
    try:
        while True:
            await asyncio.sleep(3600)
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        await runner.cleanup()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())