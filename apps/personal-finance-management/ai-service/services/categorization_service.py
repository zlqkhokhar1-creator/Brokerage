"""
AI-powered transaction categorization service
Uses machine learning to automatically categorize transactions
"""

import asyncio
import logging
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os
from datetime import datetime, timedelta
import re
import json

from models.schemas import TransactionCategorizationResponse, CategorySuggestion
from database.connection import get_database
from utils.logger import setup_logger

logger = setup_logger(__name__)

class CategorizationService:
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.category_mapping = {}
        self.is_initialized = False
        self.model_path = "models/categorization_model.pkl"
        self.vectorizer_path = "models/vectorizer.pkl"
        
    async def initialize(self):
        """Initialize the categorization service and load models"""
        try:
            logger.info("Initializing categorization service...")
            
            # Create models directory if it doesn't exist
            os.makedirs("models", exist_ok=True)
            
            # Load or train model
            if os.path.exists(self.model_path) and os.path.exists(self.vectorizer_path):
                await self._load_models()
            else:
                await self._train_initial_model()
            
            # Load category mapping
            await self._load_category_mapping()
            
            self.is_initialized = True
            logger.info("Categorization service initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing categorization service: {str(e)}")
            raise
    
    async def _load_models(self):
        """Load pre-trained models"""
        try:
            self.model = joblib.load(self.model_path)
            self.vectorizer = joblib.load(self.vectorizer_path)
            logger.info("Pre-trained models loaded successfully")
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            await self._train_initial_model()
    
    async def _load_category_mapping(self):
        """Load category ID to name mapping from database"""
        try:
            db = await get_database()
            query = "SELECT id, name FROM expense_categories WHERE is_active = true"
            result = await db.fetch_all(query)
            
            self.category_mapping = {row['id']: row['name'] for row in result}
            logger.info(f"Loaded {len(self.category_mapping)} categories")
            
        except Exception as e:
            logger.error(f"Error loading category mapping: {str(e)}")
            self.category_mapping = {}
    
    async def _train_initial_model(self):
        """Train initial model with default data"""
        try:
            logger.info("Training initial categorization model...")
            
            # Get training data from database
            training_data = await self._get_training_data()
            
            if len(training_data) < 100:
                # Use default training data if not enough real data
                training_data = self._get_default_training_data()
            
            # Prepare data
            texts = [item['description'] for item in training_data]
            categories = [item['category_id'] for item in training_data]
            
            # Vectorize text
            self.vectorizer = TfidfVectorizer(
                max_features=5000,
                stop_words='english',
                ngram_range=(1, 3),
                min_df=2
            )
            
            X = self.vectorizer.fit_transform(texts)
            y = categories
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Train model
            self.model = RandomForestClassifier(
                n_estimators=100,
                random_state=42,
                max_depth=20,
                min_samples_split=5
            )
            
            self.model.fit(X_train, y_train)
            
            # Evaluate model
            y_pred = self.model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            logger.info(f"Model accuracy: {accuracy:.3f}")
            
            # Save models
            joblib.dump(self.model, self.model_path)
            joblib.dump(self.vectorizer, self.vectorizer_path)
            
            logger.info("Initial model training completed")
            
        except Exception as e:
            logger.error(f"Error training initial model: {str(e)}")
            raise
    
    async def _get_training_data(self) -> List[Dict[str, Any]]:
        """Get training data from database"""
        try:
            db = await get_database()
            query = """
                SELECT t.description, t.category_id, t.merchant_name, t.amount
                FROM transactions t
                WHERE t.category_id IS NOT NULL 
                AND t.description IS NOT NULL
                AND t.created_at >= NOW() - INTERVAL '90 days'
                ORDER BY t.created_at DESC
                LIMIT 10000
            """
            result = await db.fetch_all(query)
            return [dict(row) for row in result]
            
        except Exception as e:
            logger.error(f"Error getting training data: {str(e)}")
            return []
    
    def _get_default_training_data(self) -> List[Dict[str, Any]]:
        """Get default training data for Pakistani users"""
        return [
            # Food & Dining
            {"description": "McDonald's Karachi", "category_id": "food_dining", "merchant_name": "McDonald's", "amount": 500},
            {"description": "KFC Gulberg", "category_id": "food_dining", "merchant_name": "KFC", "amount": 800},
            {"description": "Pizza Hut", "category_id": "food_dining", "merchant_name": "Pizza Hut", "amount": 1200},
            {"description": "Foodpanda order", "category_id": "food_dining", "merchant_name": "Foodpanda", "amount": 600},
            {"description": "Grocery shopping at Imtiaz", "category_id": "food_dining", "merchant_name": "Imtiaz", "amount": 2500},
            {"description": "Metro cash and carry", "category_id": "food_dining", "merchant_name": "Metro", "amount": 4000},
            
            # Transportation
            {"description": "Uber ride to airport", "category_id": "transportation", "merchant_name": "Uber", "amount": 800},
            {"description": "Careem ride", "category_id": "transportation", "merchant_name": "Careem", "amount": 300},
            {"description": "Fuel at Shell", "category_id": "transportation", "merchant_name": "Shell", "amount": 2000},
            {"description": "Metro bus fare", "category_id": "transportation", "merchant_name": "Metro Bus", "amount": 50},
            
            # Utilities
            {"description": "K-Electric bill", "category_id": "utilities", "merchant_name": "K-Electric", "amount": 5000},
            {"description": "SSGC gas bill", "category_id": "utilities", "merchant_name": "SSGC", "amount": 2000},
            {"description": "PTCL internet bill", "category_id": "utilities", "merchant_name": "PTCL", "amount": 3000},
            {"description": "Jazz mobile bill", "category_id": "utilities", "merchant_name": "Jazz", "amount": 1000},
            
            # Healthcare
            {"description": "Aga Khan Hospital", "category_id": "healthcare", "merchant_name": "Aga Khan", "amount": 5000},
            {"description": "Shifa International", "category_id": "healthcare", "merchant_name": "Shifa", "amount": 3000},
            {"description": "Pharmacy purchase", "category_id": "healthcare", "merchant_name": "Pharmacy", "amount": 500},
            
            # Shopping
            {"description": "Gul Ahmed", "category_id": "shopping", "merchant_name": "Gul Ahmed", "amount": 3000},
            {"description": "Nishat Linen", "category_id": "shopping", "merchant_name": "Nishat", "amount": 2000},
            {"description": "Daraz online shopping", "category_id": "shopping", "merchant_name": "Daraz", "amount": 1500},
            
            # Entertainment
            {"description": "Cinepax cinema", "category_id": "entertainment", "merchant_name": "Cinepax", "amount": 800},
            {"description": "Netflix subscription", "category_id": "entertainment", "merchant_name": "Netflix", "amount": 1000},
            {"description": "Spotify premium", "category_id": "entertainment", "merchant_name": "Spotify", "amount": 500},
        ]
    
    async def categorize_transaction(
        self,
        description: str,
        amount: float,
        merchant_name: Optional[str] = None,
        user_id: str = None,
        context: Optional[Dict[str, Any]] = None
    ) -> TransactionCategorizationResponse:
        """Categorize a single transaction"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            # Prepare input text
            input_text = self._prepare_input_text(description, merchant_name, amount)
            
            # Vectorize text
            X = self.vectorizer.transform([input_text])
            
            # Get predictions
            probabilities = self.model.predict_proba(X)[0]
            predicted_class_idx = np.argmax(probabilities)
            confidence_score = probabilities[predicted_class_idx]
            
            # Get category ID and name
            category_id = self.model.classes_[predicted_class_idx]
            category_name = self.category_mapping.get(category_id, "Unknown")
            
            # Get top suggestions
            suggestions = self._get_category_suggestions(probabilities)
            
            # Generate reasoning
            reasoning = self._generate_reasoning(description, merchant_name, category_name, confidence_score)
            
            return TransactionCategorizationResponse(
                category_id=category_id,
                category_name=category_name,
                confidence_score=float(confidence_score),
                suggestions=suggestions,
                reasoning=reasoning,
                is_ai_categorized=True
            )
            
        except Exception as e:
            logger.error(f"Error categorizing transaction: {str(e)}")
            # Return default category on error
            return TransactionCategorizationResponse(
                category_id="other",
                category_name="Other",
                confidence_score=0.0,
                suggestions=[],
                reasoning=f"Error in categorization: {str(e)}",
                is_ai_categorized=False
            )
    
    def _prepare_input_text(self, description: str, merchant_name: Optional[str], amount: float) -> str:
        """Prepare input text for categorization"""
        text_parts = []
        
        if description:
            text_parts.append(description.lower())
        
        if merchant_name:
            text_parts.append(merchant_name.lower())
        
        # Add amount context
        if amount < 100:
            text_parts.append("small amount")
        elif amount < 1000:
            text_parts.append("medium amount")
        else:
            text_parts.append("large amount")
        
        return " ".join(text_parts)
    
    def _get_category_suggestions(self, probabilities: np.ndarray) -> List[CategorySuggestion]:
        """Get top category suggestions"""
        suggestions = []
        
        # Get top 3 categories
        top_indices = np.argsort(probabilities)[-3:][::-1]
        
        for idx in top_indices:
            if probabilities[idx] > 0.1:  # Only include if confidence > 10%
                category_id = self.model.classes_[idx]
                category_name = self.category_mapping.get(category_id, "Unknown")
                confidence = float(probabilities[idx])
                
                suggestions.append(CategorySuggestion(
                    category_id=category_id,
                    category_name=category_name,
                    confidence_score=confidence,
                    reasoning=f"Based on text analysis with {confidence:.1%} confidence"
                ))
        
        return suggestions
    
    def _generate_reasoning(self, description: str, merchant_name: Optional[str], category: str, confidence: float) -> str:
        """Generate human-readable reasoning for categorization"""
        reasoning_parts = []
        
        if confidence > 0.8:
            reasoning_parts.append("High confidence categorization")
        elif confidence > 0.6:
            reasoning_parts.append("Moderate confidence categorization")
        else:
            reasoning_parts.append("Low confidence categorization")
        
        if merchant_name:
            reasoning_parts.append(f"based on merchant '{merchant_name}'")
        
        if description:
            # Look for keywords
            keywords = self._extract_keywords(description)
            if keywords:
                reasoning_parts.append(f"and keywords: {', '.join(keywords)}")
        
        reasoning_parts.append(f"categorized as '{category}'")
        
        return " ".join(reasoning_parts)
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract relevant keywords from text"""
        keywords = []
        text_lower = text.lower()
        
        # Food keywords
        food_keywords = ['restaurant', 'food', 'pizza', 'burger', 'coffee', 'tea', 'grocery', 'supermarket']
        for keyword in food_keywords:
            if keyword in text_lower:
                keywords.append(keyword)
        
        # Transport keywords
        transport_keywords = ['uber', 'careem', 'taxi', 'fuel', 'gas', 'metro', 'bus']
        for keyword in transport_keywords:
            if keyword in text_lower:
                keywords.append(keyword)
        
        # Utility keywords
        utility_keywords = ['bill', 'electric', 'gas', 'water', 'internet', 'phone']
        for keyword in utility_keywords:
            if keyword in text_lower:
                keywords.append(keyword)
        
        return keywords[:3]  # Return top 3 keywords
    
    async def store_training_data(self, description: str, category_id: str, confidence_score: float):
        """Store training data for future model improvement"""
        try:
            db = await get_database()
            query = """
                INSERT INTO ai_training_data (text_data, category_id, confidence_score, is_verified)
                VALUES ($1, $2, $3, $4)
            """
            await db.execute(query, description, category_id, confidence_score, True)
            
        except Exception as e:
            logger.error(f"Error storing training data: {str(e)}")
    
    async def retrain_model(self):
        """Retrain the model with latest data"""
        try:
            logger.info("Starting model retraining...")
            
            # Get latest training data
            training_data = await self._get_training_data()
            
            if len(training_data) < 50:
                logger.warning("Not enough training data for retraining")
                return
            
            # Prepare data
            texts = [item['description'] for item in training_data]
            categories = [item['category_id'] for item in training_data]
            
            # Vectorize text
            X = self.vectorizer.fit_transform(texts)
            y = categories
            
            # Train new model
            new_model = RandomForestClassifier(
                n_estimators=100,
                random_state=42,
                max_depth=20,
                min_samples_split=5
            )
            
            new_model.fit(X, y)
            
            # Replace old model
            self.model = new_model
            
            # Save updated model
            joblib.dump(self.model, self.model_path)
            
            logger.info("Model retraining completed successfully")
            
        except Exception as e:
            logger.error(f"Error retraining model: {str(e)}")
    
    async def get_model_status(self) -> Dict[str, Any]:
        """Get model status and performance metrics"""
        try:
            if not self.is_initialized:
                return {"status": "not_initialized"}
            
            # Get recent accuracy
            training_data = await self._get_training_data()
            if len(training_data) > 100:
                # Calculate accuracy on recent data
                texts = [item['description'] for item in training_data[:100]]
                categories = [item['category_id'] for item in training_data[:100]]
                
                X = self.vectorizer.transform(texts)
                predictions = self.model.predict(X)
                accuracy = accuracy_score(categories, predictions)
            else:
                accuracy = 0.0
            
            return {
                "status": "initialized",
                "accuracy": accuracy,
                "categories_count": len(self.category_mapping),
                "last_trained": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting model status: {str(e)}")
            return {"status": "error", "error": str(e)}
