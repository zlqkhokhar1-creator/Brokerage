"""
Pydantic models for prediction requests and responses
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator
import numpy as np


class PredictionRequest(BaseModel):
    """Request model for generating predictions"""
    
    symbol: str = Field(..., description="Stock symbol to predict")
    horizon: int = Field(..., ge=1, le=252, description="Prediction horizon in days")
    model_type: Optional[str] = Field(None, description="Specific model type to use")
    ensemble_method: str = Field("weighted_average", description="Ensemble method")
    feature_config: Optional[Dict[str, Any]] = Field(None, description="Feature engineering configuration")
    confidence_threshold: float = Field(0.5, ge=0.0, le=1.0, description="Minimum confidence threshold")
    
    @validator('symbol')
    def validate_symbol(cls, v):
        if not v or len(v) < 1 or len(v) > 10:
            raise ValueError('Symbol must be 1-10 characters')
        return v.upper()
    
    @validator('ensemble_method')
    def validate_ensemble_method(cls, v):
        allowed_methods = ['weighted_average', 'simple_average', 'median', 'voting']
        if v not in allowed_methods:
            raise ValueError(f'Ensemble method must be one of: {allowed_methods}')
        return v


class ModelPrediction(BaseModel):
    """Individual model prediction result"""
    
    model_id: str
    model_type: str
    prediction: List[float]
    confidence: float = Field(..., ge=0.0, le=1.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PredictionMetadata(BaseModel):
    """Metadata for prediction response"""
    
    generated_at: datetime
    data_points: int
    feature_count: int
    model_count: int
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    error: Optional[str] = None
    processing_time_ms: Optional[float] = None


class PredictionResponse(BaseModel):
    """Response model for predictions"""
    
    symbol: str
    horizon: int
    predictions: Optional[List[float]] = None
    model_predictions: List[ModelPrediction] = Field(default_factory=list)
    metadata: PredictionMetadata
    
    class Config:
        json_encoders = {
            np.ndarray: lambda v: v.tolist(),
            datetime: lambda v: v.isoformat()
        }


class BatchPredictionRequest(BaseModel):
    """Request model for batch predictions"""
    
    predictions: List[PredictionRequest] = Field(..., min_items=1, max_items=100)
    
    @validator('predictions')
    def validate_predictions(cls, v):
        if len(v) > 100:
            raise ValueError('Maximum 100 predictions per batch')
        return v


class BatchPredictionResponse(BaseModel):
    """Response model for batch predictions"""
    
    predictions: List[PredictionResponse]
    total_count: int
    success_count: int
    error_count: int
    
    @validator('total_count', 'success_count', 'error_count')
    def validate_counts(cls, v):
        if v < 0:
            raise ValueError('Counts must be non-negative')
        return v


class MarketRegimeRequest(BaseModel):
    """Request model for market regime detection"""
    
    symbol: str
    timeframe: str = Field("1d", description="Timeframe for regime detection")
    lookback_days: int = Field(252, ge=30, le=2520, description="Days to look back")
    model_type: str = Field("hmm", description="Regime detection model type")
    
    @validator('symbol')
    def validate_symbol(cls, v):
        if not v or len(v) < 1 or len(v) > 10:
            raise ValueError('Symbol must be 1-10 characters')
        return v.upper()
    
    @validator('timeframe')
    def validate_timeframe(cls, v):
        allowed_timeframes = ['1h', '4h', '1d', '1w']
        if v not in allowed_timeframes:
            raise ValueError(f'Timeframe must be one of: {allowed_timeframes}')
        return v


class MarketRegimeResponse(BaseModel):
    """Response model for market regime detection"""
    
    symbol: str
    current_regime: str
    regime_probabilities: Dict[str, float]
    regime_transitions: List[Dict[str, Any]]
    metadata: Dict[str, Any]


class VolatilityRequest(BaseModel):
    """Request model for volatility prediction"""
    
    symbol: str
    horizon: int = Field(..., ge=1, le=60, description="Prediction horizon in days")
    model_type: str = Field("garch", description="Volatility model type")
    confidence_level: float = Field(0.95, ge=0.5, le=0.99, description="Confidence level for intervals")
    
    @validator('symbol')
    def validate_symbol(cls, v):
        if not v or len(v) < 1 or len(v) > 10:
            raise ValueError('Symbol must be 1-10 characters')
        return v.upper()


class VolatilityResponse(BaseModel):
    """Response model for volatility predictions"""
    
    symbol: str
    horizon: int
    predicted_volatility: float
    confidence_intervals: Dict[str, float]
    model_metrics: Dict[str, float]
    metadata: Dict[str, Any]


class PortfolioOptimizationRequest(BaseModel):
    """Request model for portfolio optimization"""
    
    symbols: List[str] = Field(..., min_items=2, max_items=50)
    optimization_method: str = Field("mean_variance", description="Optimization method")
    risk_tolerance: float = Field(0.5, ge=0.0, le=1.0, description="Risk tolerance level")
    target_return: Optional[float] = Field(None, description="Target return (if applicable)")
    constraints: Optional[Dict[str, Any]] = Field(None, description="Additional constraints")
    
    @validator('symbols')
    def validate_symbols(cls, v):
        if len(v) < 2:
            raise ValueError('At least 2 symbols required')
        if len(v) > 50:
            raise ValueError('Maximum 50 symbols allowed')
        return [s.upper() for s in v]
    
    @validator('optimization_method')
    def validate_optimization_method(cls, v):
        allowed_methods = ['mean_variance', 'black_litterman', 'risk_parity', 'equal_weight']
        if v not in allowed_methods:
            raise ValueError(f'Optimization method must be one of: {allowed_methods}')
        return v


class PortfolioOptimizationResponse(BaseModel):
    """Response model for portfolio optimization"""
    
    symbols: List[str]
    weights: Dict[str, float]
    expected_return: float
    expected_volatility: float
    sharpe_ratio: float
    optimization_metrics: Dict[str, float]
    metadata: Dict[str, Any]


class BacktestRequest(BaseModel):
    """Request model for backtesting"""
    
    symbol: str
    strategy: str = Field(..., description="Trading strategy to backtest")
    start_date: str = Field(..., description="Backtest start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="Backtest end date (YYYY-MM-DD)")
    initial_capital: float = Field(100000.0, gt=0, description="Initial capital")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Strategy parameters")
    
    @validator('symbol')
    def validate_symbol(cls, v):
        if not v or len(v) < 1 or len(v) > 10:
            raise ValueError('Symbol must be 1-10 characters')
        return v.upper()
    
    @validator('start_date', 'end_date')
    def validate_dates(cls, v):
        try:
            datetime.strptime(v, '%Y-%m-%d')
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')
        return v


class BacktestResponse(BaseModel):
    """Response model for backtesting"""
    
    symbol: str
    strategy: str
    start_date: str
    end_date: str
    initial_capital: float
    final_capital: float
    total_return: float
    annualized_return: float
    volatility: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    total_trades: int
    performance_metrics: Dict[str, float]
    trade_log: List[Dict[str, Any]]
    metadata: Dict[str, Any]
