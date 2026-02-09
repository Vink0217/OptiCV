# FastAPI app entrypoint - mount routers
from dotenv import load_dotenv
load_dotenv()  # Load .env file

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.parse import router as parse_router
from .routers.download import router as download_router
from .routers.score import router as score_router
from .routers.generate import router as generate_router
from .routers.enhance import router as enhance_router
from .routers.chat import router as chat_router


app = FastAPI(title="OptiCV Backend")

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
