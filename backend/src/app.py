# FastAPI app entrypoint - mount routers
from dotenv import load_dotenv
load_dotenv()  # Load .env file

import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("opticv")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        try:
            body = await request.body()
            logger.debug("Incoming request %s %s body=%s", request.method, request.url.path, body.decode('utf-8', errors='replace')[:200])
        except Exception:
            logger.debug("Incoming request %s %s (body read failed)", request.method, request.url.path)
        response = await call_next(request)
        duration = (time.time() - start) * 1000
        logger.info("%s %s -> %s (%.0fms)", request.method, request.url.path, response.status_code, duration)
        return response

from .routers.parse import router as parse_router
from .routers.download import router as download_router
from .routers.score import router as score_router
from .routers.generate import router as generate_router
from .routers.enhance import router as enhance_router
from .routers.chat import router as chat_router


app = FastAPI(title="OptiCV Backend")

# attach request logging middleware early so we capture all requests
app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "opticv backend"}


# Include routers
app.include_router(parse_router, prefix="")
app.include_router(download_router, prefix="")
app.include_router(score_router, prefix="")
app.include_router(generate_router, prefix="")
app.include_router(enhance_router, prefix="")
app.include_router(chat_router, prefix="")
