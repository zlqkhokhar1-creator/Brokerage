"""
Model Manager - Handles ML model lifecycle and operations
"""

import asyncio
import logging
import pickle
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
import numpy as np
import pandas as pd
import structlog
from pathlib import Path

from app.core.config import settings
from app.core.redis import redis_client
from app.models.ml_models import (
    ModelInfo,
    ModelMetrics,
    TrainingConfig,
    ModelType
)
from app.services.model_factory import ModelFactory
from app.utils.cache import cache_result
from app.utils.validation import validate_model_config

logger = structlog.get_logger(__name__)


class ModelManager:
    """Manages ML models for financial predictions"""
    
    def __init__(self):
        self.model_factory = ModelFactory()
        self.models_cache = {}
        self.model_metadata = {}
        self._initialized = False
    
    async def initialize(self):
        """Initialize the model manager"""
        try:
            # Create model storage directory
            self.model_dir = Path(settings.MODEL_STORAGE_PATH)
            self.model_dir.mkdir(parents=True, exist_ok=True)
            
            # Load existing model metadata
            await self._load_model_metadata()
            
            # Initialize model factory
            await self.model_factory.initialize()
            
            self._initialized = True
            logger.info("Model manager initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize model manager", error=str(e))
            raise
    
    async def close(self):
        """Close the model manager"""
        try:
            # Clear model cache
            self.models_cache.clear()
            
            # Close model factory
            await self.model_factory.close()
            
            self._initialized = False
            logger.info("Model manager closed")
            
        except Exception as e:
            logger.error("Error closing model manager", error=str(e))
    
    async def train_model(
        self,
        symbol: str,
        model_type: ModelType,
        training_data: pd.DataFrame,
        config: Optional[TrainingConfig] = None
    ) -> ModelInfo:
        """
        Train a new model for the given symbol
        
        Args:
            symbol: Stock symbol
            model_type: Type of model to train
            training_data: Training data
            config: Training configuration
            
        Returns:
            ModelInfo for the trained model
        """
        if not self._initialized:
            raise RuntimeError("Model manager not initialized")
        
        logger.info(
            "Training model",
            symbol=symbol,
            model_type=model_type,
            data_points=len(training_data)
        )
        
        try:
            # Validate training data
            if len(training_data) < settings.MIN_DATA_POINTS:
                raise ValueError(f"Insufficient training data: {len(training_data)} < {settings.MIN_DATA_POINTS}")
            
            # Create model
            model = self.model_factory.create_model(model_type, config)
            
            # Train model
            training_start = datetime.utcnow()
            await model.train(training_data)
            training_duration = (datetime.utcnow() - training_start).total_seconds()
            
            # Evaluate model
            metrics = await self._evaluate_model(model, training_data)
            
            # Generate model ID
            model_id = self._generate_model_id(symbol, model_type)
            
            # Save model
            model_path = await self._save_model(model, model_id)
            
            # Create model info
            model_info = ModelInfo(
                id=model_id,
                symbol=symbol,
                type=model_type,
                status="trained",
                created_at=datetime.utcnow(),
                training_duration=training_duration,
                metrics=metrics,
                model_path=model_path,
                feature_columns=list(training_data.columns),
                config=config
            )
            
            # Store metadata
            await self._store_model_metadata(model_info)
            
            # Cache model
            self.models_cache[model_id] = model
            
            logger.info(
                "Model trained successfully",
                model_id=model_id,
                symbol=symbol,
                metrics=metrics.dict()
            )
            
            return model_info
            
        except Exception as e:
            logger.error(
                "Failed to train model",
                symbol=symbol,
                model_type=model_type,
                error=str(e)
            )
            raise
    
    async def load_model(self, model_id: str):
        """Load a model by ID"""
        try:
            # Check cache first
            if model_id in self.models_cache:
                return self.models_cache[model_id]
            
            # Load from storage
            model_info = await self._get_model_metadata(model_id)
            if not model_info:
                raise ValueError(f"Model not found: {model_id}")
            
            # Load model
            model = await self._load_model_from_storage(model_info)
            
            # Cache model
            self.models_cache[model_id] = model
            
            logger.debug("Model loaded", model_id=model_id)
            return model
            
        except Exception as e:
            logger.error("Failed to load model", model_id=model_id, error=str(e))
            raise
    
    async def get_available_models(
        self,
        symbol: Optional[str] = None,
        model_type: Optional[ModelType] = None
    ) -> List[Dict[str, Any]]:
        """Get available models with optional filtering"""
        try:
            models = []
            
            for model_id, metadata in self.model_metadata.items():
                # Apply filters
                if symbol and metadata["symbol"] != symbol:
                    continue
                if model_type and metadata["type"] != model_type:
                    continue
                
                models.append({
                    "id": model_id,
                    "symbol": metadata["symbol"],
                    "type": metadata["type"],
                    "status": metadata["status"],
                    "created_at": metadata["created_at"],
                    "metrics": metadata["metrics"],
                    "feature_columns": metadata["feature_columns"]
                })
            
            return models
            
        except Exception as e:
            logger.error("Failed to get available models", error=str(e))
            return []
    
    async def update_model(
        self,
        model_id: str,
        training_data: pd.DataFrame,
        config: Optional[TrainingConfig] = None
    ) -> ModelInfo:
        """Update an existing model with new data"""
        try:
            # Get existing model info
            model_info = await self._get_model_metadata(model_id)
            if not model_info:
                raise ValueError(f"Model not found: {model_id}")
            
            logger.info("Updating model", model_id=model_id)
            
            # Load existing model
            model = await self.load_model(model_id)
            
            # Update model with new data
            await model.update(training_data, config)
            
            # Evaluate updated model
            metrics = await self._evaluate_model(model, training_data)
            
            # Update model info
            model_info["status"] = "updated"
            model_info["updated_at"] = datetime.utcnow()
            model_info["metrics"] = metrics.dict()
            model_info["feature_columns"] = list(training_data.columns)
            
            # Save updated model
            await self._save_model(model, model_id)
            
            # Update metadata
            await self._store_model_metadata(model_info)
            
            logger.info("Model updated successfully", model_id=model_id)
            
            return ModelInfo(**model_info)
            
        except Exception as e:
            logger.error("Failed to update model", model_id=model_id, error=str(e))
            raise
    
    async def delete_model(self, model_id: str) -> bool:
        """Delete a model"""
        try:
            # Remove from cache
            if model_id in self.models_cache:
                del self.models_cache[model_id]
            
            # Remove from metadata
            if model_id in self.model_metadata:
                del self.model_metadata[model_id]
            
            # Remove from storage
            model_path = self.model_dir / f"{model_id}.pkl"
            if model_path.exists():
                model_path.unlink()
            
            # Update metadata storage
            await self._save_model_metadata()
            
            logger.info("Model deleted", model_id=model_id)
            return True
            
        except Exception as e:
            logger.error("Failed to delete model", model_id=model_id, error=str(e))
            return False
    
    async def get_model_metrics(self, model_id: str) -> Optional[ModelMetrics]:
        """Get metrics for a specific model"""
        try:
            model_info = await self._get_model_metadata(model_id)
            if not model_info:
                return None
            
            return ModelMetrics(**model_info["metrics"])
            
        except Exception as e:
            logger.error("Failed to get model metrics", model_id=model_id, error=str(e))
            return None
    
    async def get_model_count(self) -> int:
        """Get total number of models"""
        return len(self.model_metadata)
    
    async def cleanup_old_models(self, days_old: int = 30) -> int:
        """Clean up models older than specified days"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            deleted_count = 0
            
            models_to_delete = []
            for model_id, metadata in self.model_metadata.items():
                if metadata["created_at"] < cutoff_date:
                    models_to_delete.append(model_id)
            
            for model_id in models_to_delete:
                if await self.delete_model(model_id):
                    deleted_count += 1
            
            logger.info("Model cleanup completed", deleted_count=deleted_count)
            return deleted_count
            
        except Exception as e:
            logger.error("Failed to cleanup old models", error=str(e))
            return 0
    
    async def _load_model_metadata(self):
        """Load model metadata from storage"""
        try:
            metadata_path = self.model_dir / "metadata.json"
            if metadata_path.exists():
                import json
                with open(metadata_path, 'r') as f:
                    self.model_metadata = json.load(f)
            else:
                self.model_metadata = {}
                
        except Exception as e:
            logger.error("Failed to load model metadata", error=str(e))
            self.model_metadata = {}
    
    async def _save_model_metadata(self):
        """Save model metadata to storage"""
        try:
            metadata_path = self.model_dir / "metadata.json"
            import json
            with open(metadata_path, 'w') as f:
                json.dump(self.model_metadata, f, default=str)
                
        except Exception as e:
            logger.error("Failed to save model metadata", error=str(e))
    
    async def _store_model_metadata(self, model_info: ModelInfo):
        """Store model metadata"""
        try:
            self.model_metadata[model_info.id] = model_info.dict()
            await self._save_model_metadata()
            
        except Exception as e:
            logger.error("Failed to store model metadata", error=str(e))
    
    async def _get_model_metadata(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Get model metadata by ID"""
        return self.model_metadata.get(model_id)
    
    async def _save_model(self, model, model_id: str) -> str:
        """Save model to storage"""
        try:
            model_path = self.model_dir / f"{model_id}.pkl"
            
            # Serialize model
            with open(model_path, 'wb') as f:
                pickle.dump(model, f)
            
            return str(model_path)
            
        except Exception as e:
            logger.error("Failed to save model", model_id=model_id, error=str(e))
            raise
    
    async def _load_model_from_storage(self, model_info: Dict[str, Any]):
        """Load model from storage"""
        try:
            model_path = model_info["model_path"]
            
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
            
            return model
            
        except Exception as e:
            logger.error("Failed to load model from storage", error=str(e))
            raise
    
    def _generate_model_id(self, symbol: str, model_type: ModelType) -> str:
        """Generate unique model ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return f"{symbol}_{model_type}_{timestamp}"
    
    async def _evaluate_model(
        self,
        model,
        data: pd.DataFrame
    ) -> ModelMetrics:
        """Evaluate model performance"""
        try:
            # Split data for evaluation
            split_idx = int(len(data) * 0.8)
            train_data = data.iloc[:split_idx]
            test_data = data.iloc[split_idx:]
            
            # Generate predictions
            predictions = await model.predict(test_data.iloc[:-1])
            
            # Calculate metrics
            actual = test_data.iloc[1:].values.flatten()
            
            # Ensure predictions and actual have same length
            min_len = min(len(predictions), len(actual))
            predictions = predictions[:min_len]
            actual = actual[:min_len]
            
            # Calculate RMSE
            rmse = np.sqrt(np.mean((predictions - actual) ** 2))
            
            # Calculate MAE
            mae = np.mean(np.abs(predictions - actual))
            
            # Calculate R²
            ss_res = np.sum((actual - predictions) ** 2)
            ss_tot = np.sum((actual - np.mean(actual)) ** 2)
            r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
            
            # Calculate directional accuracy
            actual_direction = np.diff(actual) > 0
            pred_direction = np.diff(predictions) > 0
            directional_accuracy = np.mean(actual_direction == pred_direction)
            
            return ModelMetrics(
                rmse=float(rmse),
                mae=float(mae),
                r2=float(r2),
                directional_accuracy=float(directional_accuracy),
                data_points=len(data),
                evaluation_date=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error("Failed to evaluate model", error=str(e))
            # Return default metrics
            return ModelMetrics(
                rmse=0.0,
                mae=0.0,
                r2=0.0,
                directional_accuracy=0.0,
                data_points=len(data),
                evaluation_date=datetime.utcnow()
            )
    
    async def health_check(self) -> Dict[str, Any]:
        """Check model manager health"""
        try:
            return {
                "status": "healthy",
                "initialized": self._initialized,
                "model_count": len(self.model_metadata),
                "cached_models": len(self.models_cache),
                "storage_path": str(self.model_dir)
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
