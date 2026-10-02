"""
Expense Tracker — FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db, SessionLocal
from .seed import seed_categories
from .routes import (
    transactions_router,
    categories_router,
    analytics_router,
    chat_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and seed data on startup."""
    init_db()

    # Seed default categories
    db = SessionLocal()
    try:
        seed_categories(db)
    finally:
        db.close()

    yield


app = FastAPI(
    title="Expense Tracker API",
    description="Personal expense and income tracker with chat-style input",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chat_router, prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(categories_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}
