"""
Prediction Engine - Core service for generating financial predictions
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import numpy as np
import pandas as pd
import structlog

from app.core.config import settings
from app.core.redis import redis_client
from app.models.prediction_models import (
    PredictionRequest,
    PredictionResponse,
    ModelPrediction,
    PredictionMetadata
)
from app.services.model_manager import ModelManager
from app.services.data_processor import DataProcessor
from app.services.feature_engineering import FeatureEngineer
from app.services.ensemble_predictor import EnsemblePredictor
from app.utils.cache import cache_result
from app.utils.validation import validate_prediction_request

logger = structlog.get_logger(__name__)


class PredictionEngine:
    """Main prediction engine for financial market predictions"""
    
    def __init__(self, model_manager: ModelManager, data_processor: DataProcessor):
        self.model_manager = model_manager
        self.data_processor = data_processor
        self.feature_engineer = FeatureEngineer()
        self.ensemble_predictor = EnsemblePredictor()
        self._initialized = False
    
    async def initialize(self):
        """Initialize the prediction engine"""
        try:
            await self.feature_engineer.initialize()
            await self.ensemble_predictor.initialize()
            self._initialized = True
            logger.info("Prediction engine initialized successfully")
        except Exception as e:
            logger.error("Failed to initialize prediction engine", error=str(e))
            raise
    
    async def close(self):
        """Close the prediction engine"""
        try:
            await self.feature_engineer.close()
            await self.ensemble_predictor.close()
            self._initialized = False
            logger.info("Prediction engine closed")
        except Exception as e:
            logger.error("Error closing prediction engine", error=str(e))
    
    @cache_result(ttl=settings.PREDICTION_CACHE_TTL)
    async def predict(
        self,
        request: PredictionRequest
    ) -> PredictionResponse:
        """
        Generate predictions for the given request
        
        Args:
            request: Prediction request containing symbol, horizon, etc.
            
        Returns:
            PredictionResponse with predictions and metadata
        """
        if not self._initialized:
            raise RuntimeError("Prediction engine not initialized")
        
        # Validate request
        validate_prediction_request(request)
        
        logger.info(
            "Generating prediction",
            symbol=request.symbol,
            horizon=request.horizon,
            model_type=request.model_type
        )
        
        try:
            # Get historical data
            historical_data = await self._get_historical_data(
                request.symbol,
                request.horizon
            )
            
            if historical_data.empty:
                raise ValueError(f"No historical data available for {request.symbol}")
            
            # Generate features
            features = await self._generate_features(
                historical_data,
                request.feature_config
            )
            
            # Get model predictions
            model_predictions = await self._get_model_predictions(
                features,
                request
            )
            
            # Generate ensemble prediction
            ensemble_prediction = await self._generate_ensemble_prediction(
                model_predictions,
                request
            )
            
            # Create response
            response = PredictionResponse(
                symbol=request.symbol,
                horizon=request.horizon,
                predictions=ensemble_prediction,
                model_predictions=model_predictions,
                metadata=PredictionMetadata(
                    generated_at=datetime.utcnow(),
                    data_points=len(historical_data),
                    feature_count=len(features.columns),
                    model_count=len(model_predictions),
                    confidence_score=self._calculate_confidence(model_predictions)
                )
            )
            
            logger.info(
                "Prediction generated successfully",
                symbol=request.symbol,
                confidence=response.metadata.confidence_score
            )
            
            return response
            
        except Exception as e:
            logger.error(
                "Failed to generate prediction",
                symbol=request.symbol,
                error=str(e)
            )
            raise
    
    async def predict_batch(
        self,
        requests: List[PredictionRequest]
    ) -> List[PredictionResponse]:
        """Generate predictions for multiple requests"""
        logger.info("Generating batch predictions", count=len(requests))
        
        # Process requests in parallel
        tasks = [self.predict(request) for request in requests]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle exceptions
        results = []
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                logger.error(
                    "Batch prediction failed",
                    index=i,
                    symbol=requests[i].symbol,
                    error=str(response)
                )
                # Create error response
                error_response = PredictionResponse(
                    symbol=requests[i].symbol,
                    horizon=requests[i].horizon,
                    predictions=None,
                    model_predictions=[],
                    metadata=PredictionMetadata(
                        generated_at=datetime.utcnow(),
                        error=str(response)
                    )
                )
                results.append(error_response)
            else:
                results.append(response)
        
        logger.info("Batch predictions completed", success_count=len(results))
        return results
    
    async def _get_historical_data(
        self,
        symbol: str,
        horizon: int
    ) -> pd.DataFrame:
        """Get historical data for the symbol"""
        try:
            # Calculate required data points
            required_points = settings.MIN_DATA_POINTS + horizon + settings.FEATURE_WINDOW_SIZE
            
            # Get data from data processor
            data = await self.data_processor.get_historical_data(
                symbol=symbol,
                days_back=min(required_points, settings.MAX_HISTORICAL_DAYS)
            )
            
            if data.empty:
                logger.warning("No historical data found", symbol=symbol)
                return pd.DataFrame()
            
            # Ensure we have enough data
            if len(data) < settings.MIN_DATA_POINTS:
                logger.warning(
                    "Insufficient historical data",
                    symbol=symbol,
                    available=len(data),
                    required=settings.MIN_DATA_POINTS
                )
                return pd.DataFrame()
            
            return data
            
        except Exception as e:
            logger.error("Failed to get historical data", symbol=symbol, error=str(e))
            raise
    
    async def _generate_features(
        self,
        data: pd.DataFrame,
        feature_config: Optional[Dict[str, Any]] = None
    ) -> pd.DataFrame:
        """Generate features for prediction"""
        try:
            features = await self.feature_engineer.generate_features(
                data,
                config=feature_config
            )
            
            logger.debug(
                "Features generated",
                feature_count=len(features.columns),
                data_points=len(features)
            )
            
            return features
            
        except Exception as e:
            logger.error("Failed to generate features", error=str(e))
            raise
    
    async def _get_model_predictions(
        self,
        features: pd.DataFrame,
        request: PredictionRequest
    ) -> List[ModelPrediction]:
        """Get predictions from individual models"""
        try:
            model_predictions = []
            
            # Get available models for the symbol
            available_models = await self.model_manager.get_available_models(
                symbol=request.symbol,
                model_type=request.model_type
            )
            
            if not available_models:
                logger.warning("No models available", symbol=request.symbol)
                return []
            
            # Generate predictions from each model
            for model_info in available_models:
                try:
                    prediction = await self._predict_with_model(
                        model_info,
                        features,
                        request
                    )
                    model_predictions.append(prediction)
                    
                except Exception as e:
                    logger.warning(
                        "Model prediction failed",
                        model_id=model_info["id"],
                        error=str(e)
                    )
                    continue
            
            logger.info(
                "Model predictions generated",
                symbol=request.symbol,
                model_count=len(model_predictions)
            )
            
            return model_predictions
            
        except Exception as e:
            logger.error("Failed to get model predictions", error=str(e))
            raise
    
    async def _predict_with_model(
        self,
        model_info: Dict[str, Any],
        features: pd.DataFrame,
        request: PredictionRequest
    ) -> ModelPrediction:
        """Generate prediction with a specific model"""
        try:
            # Load model
            model = await self.model_manager.load_model(model_info["id"])
            
            # Prepare features for model
            model_features = self._prepare_features_for_model(
                features,
                model_info["feature_columns"]
            )
            
            # Generate prediction
            prediction = await model.predict(
                model_features,
                horizon=request.horizon
            )
            
            # Calculate confidence
            confidence = await self._calculate_model_confidence(
                model,
                model_features,
                prediction
            )
            
            return ModelPrediction(
                model_id=model_info["id"],
                model_type=model_info["type"],
                prediction=prediction,
                confidence=confidence,
                metadata={
                    "feature_count": len(model_features.columns),
                    "prediction_horizon": request.horizon
                }
            )
            
        except Exception as e:
            logger.error(
                "Model prediction failed",
                model_id=model_info["id"],
                error=str(e)
            )
            raise
    
    def _prepare_features_for_model(
        self,
        features: pd.DataFrame,
        required_columns: List[str]
    ) -> pd.DataFrame:
        """Prepare features for a specific model"""
        # Check if all required columns are available
        missing_columns = set(required_columns) - set(features.columns)
        if missing_columns:
            logger.warning(
                "Missing feature columns",
                missing=missing_columns,
                available=features.columns.tolist()
            )
            # Fill missing columns with zeros
            for col in missing_columns:
                features[col] = 0.0
        
        # Select and order columns
        model_features = features[required_columns].copy()
        
        # Handle NaN values
        model_features = model_features.fillna(0.0)
        
        return model_features
    
    async def _calculate_model_confidence(
        self,
        model,
        features: pd.DataFrame,
        prediction: np.ndarray
    ) -> float:
        """Calculate confidence score for a model prediction"""
        try:
            # Use model's built-in confidence if available
            if hasattr(model, 'predict_confidence'):
                return await model.predict_confidence(features, prediction)
            
            # Calculate based on prediction variance
            if len(prediction) > 1:
                return max(0.0, 1.0 - np.std(prediction) / (np.mean(np.abs(prediction)) + 1e-8))
            
            # Default confidence for single prediction
            return 0.5
            
        except Exception as e:
            logger.warning("Failed to calculate model confidence", error=str(e))
            return 0.5
    
    async def _generate_ensemble_prediction(
        self,
        model_predictions: List[ModelPrediction],
        request: PredictionRequest
    ) -> np.ndarray:
        """Generate ensemble prediction from individual model predictions"""
        try:
            if not model_predictions:
                raise ValueError("No model predictions available for ensemble")
            
            # Use ensemble predictor
            ensemble_prediction = await self.ensemble_predictor.predict(
                model_predictions,
                method=request.ensemble_method
            )
            
            return ensemble_prediction
            
        except Exception as e:
            logger.error("Failed to generate ensemble prediction", error=str(e))
            raise
    
    def _calculate_confidence(
        self,
        model_predictions: List[ModelPrediction]
    ) -> float:
        """Calculate overall confidence score"""
        if not model_predictions:
            return 0.0
        
        # Weight by individual model confidence
        total_weight = sum(pred.confidence for pred in model_predictions)
        if total_weight == 0:
            return 0.0
        
        weighted_confidence = sum(
            pred.confidence * pred.confidence 
            for pred in model_predictions
        ) / total_weight
        
        # Adjust for number of models (more models = higher confidence)
        model_count_factor = min(1.0, len(model_predictions) / 3.0)
        
        return min(1.0, weighted_confidence * model_count_factor)
    
    async def get_prediction_history(
        self,
        symbol: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get prediction history for a symbol"""
        try:
            # Get from Redis cache
            cache_key = f"predictions:history:{symbol}"
            history = await redis_client.lrange(cache_key, 0, limit - 1)
            
            # Parse and return
            return [eval(pred) for pred in history]
            
        except Exception as e:
            logger.error("Failed to get prediction history", symbol=symbol, error=str(e))
            return []
    
    async def store_prediction(
        self,
        prediction: PredictionResponse
    ) -> None:
        """Store prediction in cache for history"""
        try:
            cache_key = f"predictions:history:{prediction.symbol}"
            
            # Store prediction
            await redis_client.lpush(
                cache_key,
                str(prediction.dict())
            )
            
            # Keep only recent predictions
            await redis_client.ltrim(cache_key, 0, 999)
            
            # Set expiration
            await redis_client.expire(cache_key, 86400 * 7)  # 7 days
            
        except Exception as e:
            logger.error("Failed to store prediction", error=str(e))
    
    async def health_check(self) -> Dict[str, Any]:
        """Check prediction engine health"""
        try:
            return {
                "status": "healthy",
                "initialized": self._initialized,
                "model_count": await self.model_manager.get_model_count(),
                "feature_engineer_status": "healthy",
                "ensemble_predictor_status": "healthy"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
