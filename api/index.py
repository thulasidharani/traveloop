from backend.main import app as fastapi_app

async def app(scope, receive, send):
    if scope["type"] in ("http", "websocket"):
        path = scope.get("path", "")
        if path.startswith("/api"):
            scope["path"] = path[4:] or "/"
    await fastapi_app(scope, receive, send)
