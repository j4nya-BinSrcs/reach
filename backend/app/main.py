"""FastAPI application entrypoint for the REACH backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


def create_app() -> FastAPI:
    application = FastAPI(
        title="REACH API",
        description="Research Exploration, Aggregation & Context Hub — backend API.",
        version="0.1.0",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/api/health", tags=["system"])
    async def health() -> dict:
        return {"status": "ok", "service": "reach-backend"}

    return application


app = create_app()