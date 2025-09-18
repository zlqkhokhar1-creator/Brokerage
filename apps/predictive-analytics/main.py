"""
Advanced Predictive Analytics Service
A comprehensive ML microservice for financial market predictions
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any

import uvicorn
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import structlog

from app.core.config import settings
from app.core.database import init_database, close_database
from app.core.redis import init_redis, close_redis
from app.core.logging import setup_logging
from app.api.v1.endpoints import (
    predictions,
    models,
    backtesting,
    features,
    market_regimes,
    volatility,
    portfolio_optimization
)
from app.services.model_manager import ModelManager
from app.services.data_processor import DataProcessor
from app.services.prediction_engine import PredictionEngine
from app.middleware.auth import AuthMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.monitoring import MonitoringMiddleware

# Setup structured logging
setup_logging()
logger = structlog.get_logger(__name__)

# Global services
model_manager: Optional[ModelManager] = None
data_processor: Optional[DataProcessor] = None
prediction_engine: Optional[PredictionEngine] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global model_manager, data_processor, prediction_engine
    
    # Startup
    logger.info("Starting Predictive Analytics Service")
    
    try:
        # Initialize database
        await init_database()
        logger.info("Database initialized")
        
        # Initialize Redis
        await init_redis()
        logger.info("Redis initialized")
        
        # Initialize services
        model_manager = ModelManager()
        data_processor = DataProcessor()
        prediction_engine = PredictionEngine(model_manager, data_processor)
        
        await model_manager.initialize()
        await data_processor.initialize()
        await prediction_engine.initialize()
        
        logger.info("All services initialized successfully")
        
        yield
        
    except Exception as e:
        logger.error("Failed to initialize services", error=str(e))
        raise
    finally:
        # Shutdown
        logger.info("Shutting down Predictive Analytics Service")
        
        if prediction_engine:
            await prediction_engine.close()
        if data_processor:
            await data_processor.close()
        if model_manager:
            await model_manager.close()
        
        await close_redis()
        await close_database()
        
        logger.info("Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="Predictive Analytics Service",
    description="Advanced ML microservice for financial market predictions",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(AuthMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(MonitoringMiddleware)

# Include routers
app.include_router(
    predictions.router,
    prefix="/api/v1/predictions",
    tags=["predictions"]
)

app.include_router(
    models.router,
    prefix="/api/v1/models",
    tags=["models"]
)

app.include_router(
    backtesting.router,
    prefix="/api/v1/backtesting",
    tags=["backtesting"]
)

app.include_router(
    features.router,
    prefix="/api/v1/features",
    tags=["features"]
)

app.include_router(
    market_regimes.router,
    prefix="/api/v1/market-regimes",
    tags=["market-regimes"]
)

app.include_router(
    volatility.router,
    prefix="/api/v1/volatility",
    tags=["volatility"]
)

app.include_router(
    portfolio_optimization.router,
    prefix="/api/v1/portfolio-optimization",
    tags=["portfolio-optimization"]
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        db_status = await check_database_health()
        
        # Check Redis connection
        redis_status = await check_redis_health()
        
        # Check model manager
        model_status = await check_model_health()
        
        overall_status = "healthy" if all([
            db_status["status"] == "healthy",
            redis_status["status"] == "healthy",
            model_status["status"] == "healthy"
        ]) else "unhealthy"
        
        return {
            "status": overall_status,
            "timestamp": asyncio.get_event_loop().time(),
            "services": {
                "database": db_status,
                "redis": redis_status,
                "models": model_status
            },
            "version": "1.0.0"
        }
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": asyncio.get_event_loop().time()
            }
        )


@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    try:
        from app.core.monitoring import get_metrics
        return get_metrics()
    except Exception as e:
        logger.error("Failed to get metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get metrics")


async def check_database_health() -> Dict[str, Any]:
    """Check database health"""
    try:
        from app.core.database import health_check
        return await health_check()
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


async def check_redis_health() -> Dict[str, Any]:
    """Check Redis health"""
    try:
        from app.core.redis import health_check
        return await health_check()
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


async def check_model_health() -> Dict[str, Any]:
    """Check model manager health"""
    try:
        if model_manager:
            return await model_manager.health_check()
        else:
            return {"status": "unhealthy", "error": "Model manager not initialized"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


# Dependency injection
def get_model_manager() -> ModelManager:
    if model_manager is None:
        raise HTTPException(status_code=503, detail="Model manager not available")
    return model_manager


def get_data_processor() -> DataProcessor:
    if data_processor is None:
        raise HTTPException(status_code=503, detail="Data processor not available")
    return data_processor


def get_prediction_engine() -> PredictionEngine:
    if prediction_engine is None:
        raise HTTPException(status_code=503, detail="Prediction engine not available")
    return prediction_engine


# Add dependencies to app state
app.state.model_manager = get_model_manager
app.state.data_processor = get_data_processor
app.state.prediction_engine = get_prediction_engine


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if not settings.DEBUG else "debug",
        access_log=True
    )
