from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.imports.routes import router as imports_router
from app.public.routes import router as public_router
from app.db.session import settings


app = FastAPI(
    title="MirasExplorer API",
    version="0.1.0",
    description=(
        "Taşınabilir Kültürel Miras için "
        "MirasExplorer backend servisi."
    ),
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "*",
    ],
)


@app.get(
    "/health",
    tags=["system"],
)
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "mirasexplorer-api",
    }


app.include_router(
    imports_router,
)
app.include_router(public_router)
