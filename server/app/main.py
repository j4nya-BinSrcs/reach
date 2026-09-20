"""FastAPI application entrypoint for the REACH backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.research import router as research_router
from app.config import Settings, settings
from app.services.research_service import ResearchService

_default_settings = settings


def create_app(settings: Settings | None = None) -> FastAPI:
    application_settings = settings or _default_settings
    application = FastAPI(
        title="REACH API",
        description="Research Exploration, Aggregation & Context Hub — backend API.",
        version="0.1.0",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=application_settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.state.research_service = ResearchService(application_settings)

    @application.get("/api/health", tags=["system"])
    async def health() -> dict:
        return {"status": "ok", "service": "reach-server"}

    application.include_router(research_router)
    return application


app = create_app()