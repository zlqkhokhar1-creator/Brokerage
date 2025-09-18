"""
Prediction API endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import structlog

from app.models.prediction_models import (
    PredictionRequest,
    PredictionResponse,
    BatchPredictionRequest,
    BatchPredictionResponse
)
from app.services.prediction_engine import PredictionEngine
from app.middleware.auth import get_current_user
from app.utils.validation import validate_prediction_request

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post("/", response_model=PredictionResponse)
async def create_prediction(
    request: PredictionRequest,
    background_tasks: BackgroundTasks,
    prediction_engine: PredictionEngine = Depends()
):
    """
    Generate a single prediction
    
    Args:
        request: Prediction request
        background_tasks: Background tasks for storing prediction
        prediction_engine: Prediction engine dependency
        
    Returns:
        Prediction response
    """
    try:
        # Validate request
        validate_prediction_request(request)
        
        # Generate prediction
        prediction = await prediction_engine.predict(request)
        
        # Store prediction in background
        background_tasks.add_task(
            prediction_engine.store_prediction,
            prediction
        )
        
        logger.info(
            "Prediction generated",
            symbol=request.symbol,
            horizon=request.horizon,
            confidence=prediction.metadata.confidence_score
        )
        
        return prediction
        
    except ValueError as e:
        logger.warning("Invalid prediction request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Failed to generate prediction", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate prediction")


@router.post("/batch", response_model=List[PredictionResponse])
async def create_batch_predictions(
    request: BatchPredictionRequest,
    background_tasks: BackgroundTasks,
    prediction_engine: PredictionEngine = Depends()
):
    """
    Generate multiple predictions in batch
    
    Args:
        request: Batch prediction request
        background_tasks: Background tasks for storing predictions
        prediction_engine: Prediction engine dependency
        
    Returns:
        List of prediction responses
    """
    try:
        # Validate requests
        for pred_request in request.predictions:
            validate_prediction_request(pred_request)
        
        # Generate predictions
        predictions = await prediction_engine.predict_batch(request.predictions)
        
        # Store predictions in background
        for prediction in predictions:
            if prediction.metadata.error is None:
                background_tasks.add_task(
                    prediction_engine.store_prediction,
                    prediction
                )
        
        logger.info(
            "Batch predictions generated",
            count=len(predictions),
            success_count=len([p for p in predictions if p.metadata.error is None])
        )
        
        return predictions
        
    except Exception as e:
        logger.error("Failed to generate batch predictions", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate batch predictions")


@router.get("/history/{symbol}")
async def get_prediction_history(
    symbol: str,
    limit: int = 100,
    prediction_engine: PredictionEngine = Depends()
):
    """
    Get prediction history for a symbol
    
    Args:
        symbol: Stock symbol
        limit: Maximum number of predictions to return
        prediction_engine: Prediction engine dependency
        
    Returns:
        List of historical predictions
    """
    try:
        history = await prediction_engine.get_prediction_history(symbol, limit)
        
        logger.info(
            "Prediction history retrieved",
            symbol=symbol,
            count=len(history)
        )
        
        return {
            "symbol": symbol,
            "predictions": history,
            "count": len(history)
        }
        
    except Exception as e:
        logger.error("Failed to get prediction history", symbol=symbol, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get prediction history")


@router.get("/symbols")
async def get_prediction_symbols(
    prediction_engine: PredictionEngine = Depends()
):
    """
    Get list of symbols with available predictions
    
    Returns:
        List of symbols with prediction data
    """
    try:
        # This would typically query a database for symbols with predictions
        # For now, return a placeholder
        symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"]
        
        return {
            "symbols": symbols,
            "count": len(symbols)
        }
        
    except Exception as e:
        logger.error("Failed to get prediction symbols", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get prediction symbols")


@router.get("/performance/{symbol}")
async def get_prediction_performance(
    symbol: str,
    days: int = 30,
    prediction_engine: PredictionEngine = Depends()
):
    """
    Get prediction performance metrics for a symbol
    
    Args:
        symbol: Stock symbol
        days: Number of days to analyze
        prediction_engine: Prediction engine dependency
        
    Returns:
        Performance metrics
    """
    try:
        # Get prediction history
        history = await prediction_engine.get_prediction_history(symbol, days * 4)  # 4 predictions per day
        
        if not history:
            return {
                "symbol": symbol,
                "error": "No prediction history found"
            }
        
        # Calculate performance metrics
        # This is a simplified calculation - in practice, you'd compare with actual prices
        total_predictions = len(history)
        successful_predictions = len([p for p in history if p.get("metadata", {}).get("error") is None])
        success_rate = successful_predictions / total_predictions if total_predictions > 0 else 0
        
        avg_confidence = sum(
            p.get("metadata", {}).get("confidence_score", 0) 
            for p in history
        ) / total_predictions if total_predictions > 0 else 0
        
        return {
            "symbol": symbol,
            "total_predictions": total_predictions,
            "successful_predictions": successful_predictions,
            "success_rate": success_rate,
            "average_confidence": avg_confidence,
            "analysis_period_days": days
        }
        
    except Exception as e:
        logger.error("Failed to get prediction performance", symbol=symbol, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get prediction performance")
