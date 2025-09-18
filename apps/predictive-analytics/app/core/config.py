"""
Configuration settings for the Predictive Analytics Service
"""

import os
from typing import List, Optional
from pydantic import BaseSettings, validator


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "Predictive Analytics Service"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 5003
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_SECRET: str = "your-jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/brokerage"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 30
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    
    # External APIs
    ALPHA_VANTAGE_API_KEY: Optional[str] = None
    IEX_CLOUD_API_KEY: Optional[str] = None
    QUANDL_API_KEY: Optional[str] = None
    FRED_API_KEY: Optional[str] = None
    
    # Model Configuration
    MODEL_CACHE_SIZE: int = 100
    MODEL_UPDATE_INTERVAL: int = 3600  # 1 hour
    PREDICTION_CACHE_TTL: int = 300  # 5 minutes
    
    # Data Processing
    MAX_HISTORICAL_DAYS: int = 2520  # 10 years
    MIN_DATA_POINTS: int = 100
    FEATURE_WINDOW_SIZE: int = 20
    
    # ML Configuration
    DEFAULT_MODEL_TYPE: str = "lstm"
    ENABLE_ENSEMBLE: bool = True
    ENABLE_AUTO_ML: bool = True
    MAX_CONCURRENT_TRAINING: int = 3
    
    # Backtesting
    BACKTEST_START_DATE: str = "2020-01-01"
    BACKTEST_END_DATE: str = "2023-12-31"
    INITIAL_CAPITAL: float = 100000.0
    
    # Monitoring
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090
    LOG_LEVEL: str = "INFO"
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 1000
    RATE_LIMIT_WINDOW: int = 3600  # 1 hour
    
    # Feature Engineering
    ENABLE_TECHNICAL_INDICATORS: bool = True
    ENABLE_FUNDAMENTAL_FEATURES: bool = True
    ENABLE_SENTIMENT_FEATURES: bool = True
    ENABLE_MACRO_FEATURES: bool = True
    
    # Model Types
    ENABLED_MODEL_TYPES: List[str] = [
        "lstm", "gru", "transformer", "prophet", "arima", 
        "xgboost", "lightgbm", "catboost", "random_forest"
    ]
    
    # Prediction Horizons
    PREDICTION_HORIZONS: List[int] = [1, 5, 10, 20, 60]  # days
    
    # Volatility Models
    VOLATILITY_MODELS: List[str] = ["garch", "egarch", "gjr_garch", "figarch"]
    
    # Portfolio Optimization
    OPTIMIZATION_METHODS: List[str] = ["mean_variance", "black_litterman", "risk_parity", "equal_weight"]
    
    # Market Regime Detection
    REGIME_MODELS: List[str] = ["hmm", "kmeans", "gmm", "dbscan"]
    
    @validator("ALLOWED_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    @validator("ENABLED_MODEL_TYPES", pre=True)
    def parse_model_types(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    @validator("PREDICTION_HORIZONS", pre=True)
    def parse_horizons(cls, v):
        if isinstance(v, str):
            return [int(i.strip()) for i in v.split(",")]
        return v
    
    @validator("VOLATILITY_MODELS", pre=True)
    def parse_volatility_models(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    @validator("OPTIMIZATION_METHODS", pre=True)
    def parse_optimization_methods(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    @validator("REGIME_MODELS", pre=True)
    def parse_regime_models(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()
