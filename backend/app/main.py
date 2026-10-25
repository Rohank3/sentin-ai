"""Main FastAPI entrypoint for the application.

Configures CORS, lifespan events, routes, and OpenAPI documentation metadata.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.constants import APP_NAME, APP_DESCRIPTION, APP_VERSION
from app.core.database import init_db
from app.api.routes_disputes import router as disputes_router
from app.api.routes_webhooks import router as webhooks_router
from app.api.routes_simulate import router as simulate_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifespan handler."""
    print(f"[{APP_NAME}] Starting up backend engine v{APP_VERSION}...")
    await init_db()
    yield
    print(f"[{APP_NAME}] Shutting down backend engine...")

app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Hackathon frontend access (Next.js localhost:3000 / Render deployment)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(disputes_router)
app.include_router(webhooks_router)
app.include_router(simulate_router)

@app.get("/health", tags=["System"])
async def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env
    }

@app.get("/", tags=["System"])
async def root():
    """Welcome and overview."""
    return {
        "message": f"Welcome to {settings.app_name} API",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
