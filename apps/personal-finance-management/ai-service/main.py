"""
AI/ML Service for Personal Finance Management
FastAPI-based service with advanced ML models for categorization, prediction, and analysis
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
import asyncio
import logging
from typing import List, Dict, Any, Optional
import json
from datetime import datetime, timedelta

# Import our custom modules
from services.categorization_service import CategorizationService
from services.sms_parser import SMSParser
from services.receipt_scanner import ReceiptScanner
from services.financial_health import FinancialHealthAnalyzer
from services.investment_advisor import InvestmentAdvisor
from services.anomaly_detector import AnomalyDetector
from services.prediction_engine import PredictionEngine
from models.schemas import (
    TransactionCategorizationRequest,
    TransactionCategorizationResponse,
    SMSParseRequest,
    SMSParseResponse,
    ReceiptScanRequest,
    ReceiptScanResponse,
    FinancialHealthRequest,
    FinancialHealthResponse,
    InvestmentAdviceRequest,
    InvestmentAdviceResponse,
    AnomalyDetectionRequest,
    AnomalyDetectionResponse,
    PredictionRequest,
    PredictionResponse
)
from database.connection import get_database
from utils.logger import setup_logger
from utils.auth import verify_token

# Setup logging
logger = setup_logger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Personal Finance AI Service",
    description="AI-powered categorization, analysis, and prediction for personal finance management",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Initialize services
categorization_service = CategorizationService()
sms_parser = SMSParser()
receipt_scanner = ReceiptScanner()
financial_health_analyzer = FinancialHealthAnalyzer()
investment_advisor = InvestmentAdvisor()
anomaly_detector = AnomalyDetector()
prediction_engine = PredictionEngine()

@app.on_event("startup")
async def startup_event():
    """Initialize AI models and services on startup"""
    logger.info("Starting AI/ML Service...")
    
    # Initialize all AI services
    await categorization_service.initialize()
    await sms_parser.initialize()
    await receipt_scanner.initialize()
    await financial_health_analyzer.initialize()
    await investment_advisor.initialize()
    await anomaly_detector.initialize()
    await prediction_engine.initialize()
    
    logger.info("AI/ML Service started successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down AI/ML Service...")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "personal-finance-ai"
    }

# Transaction categorization endpoints
@app.post("/api/v1/categorize/transaction", response_model=TransactionCategorizationResponse)
async def categorize_transaction(
    request: TransactionCategorizationRequest,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Categorize a transaction using AI"""
    try:
        # Verify authentication
        await verify_token(credentials.credentials)
        
        # Categorize transaction
        result = await categorization_service.categorize_transaction(
            description=request.description,
            amount=request.amount,
            merchant_name=request.merchant_name,
            user_id=request.user_id,
            context=request.context
        )
        
        # Store training data in background
        background_tasks.add_task(
            categorization_service.store_training_data,
            request.description,
            result.category_id,
            result.confidence_score
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error categorizing transaction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/categorize/batch", response_model=List[TransactionCategorizationResponse])
async def categorize_batch_transactions(
    requests: List[TransactionCategorizationRequest],
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Categorize multiple transactions in batch"""
    try:
        await verify_token(credentials.credentials)
        
        results = []
        for request in requests:
            result = await categorization_service.categorize_transaction(
                description=request.description,
                amount=request.amount,
                merchant_name=request.merchant_name,
                user_id=request.user_id,
                context=request.context
            )
            results.append(result)
            
            # Store training data in background
            background_tasks.add_task(
                categorization_service.store_training_data,
                request.description,
                result.category_id,
                result.confidence_score
            )
        
        return results
        
    except Exception as e:
        logger.error(f"Error categorizing batch transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# SMS parsing endpoints
@app.post("/api/v1/parse/sms", response_model=SMSParseResponse)
async def parse_sms(
    request: SMSParseRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Parse SMS from Pakistani banks to extract transaction data"""
    try:
        await verify_token(credentials.credentials)
        
        result = await sms_parser.parse_sms(
            sms_text=request.sms_text,
            bank_name=request.bank_name,
            user_id=request.user_id
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error parsing SMS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/parse/sms/batch", response_model=List[SMSParseResponse])
async def parse_batch_sms(
    requests: List[SMSParseRequest],
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Parse multiple SMS messages in batch"""
    try:
        await verify_token(credentials.credentials)
        
        results = []
        for request in requests:
            result = await sms_parser.parse_sms(
                sms_text=request.sms_text,
                bank_name=request.bank_name,
                user_id=request.user_id
            )
            results.append(result)
        
        return results
        
    except Exception as e:
        logger.error(f"Error parsing batch SMS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Receipt scanning endpoints
@app.post("/api/v1/scan/receipt", response_model=ReceiptScanResponse)
async def scan_receipt(
    request: ReceiptScanRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Scan and extract data from receipt images"""
    try:
        await verify_token(credentials.credentials)
        
        result = await receipt_scanner.scan_receipt(
            image_url=request.image_url,
            image_data=request.image_data,
            user_id=request.user_id
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error scanning receipt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Financial health analysis endpoints
@app.post("/api/v1/analyze/financial-health", response_model=FinancialHealthResponse)
async def analyze_financial_health(
    request: FinancialHealthRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Analyze user's financial health and provide recommendations"""
    try:
        await verify_token(credentials.credentials)
        
        result = await financial_health_analyzer.analyze_financial_health(
            user_id=request.user_id,
            period_months=request.period_months,
            include_predictions=request.include_predictions
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error analyzing financial health: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Investment advice endpoints
@app.post("/api/v1/advice/investment", response_model=InvestmentAdviceResponse)
async def get_investment_advice(
    request: InvestmentAdviceRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get personalized investment advice based on user profile"""
    try:
        await verify_token(credentials.credentials)
        
        result = await investment_advisor.get_investment_advice(
            user_id=request.user_id,
            investment_amount=request.investment_amount,
            time_horizon=request.time_horizon,
            risk_tolerance=request.risk_tolerance,
            goals=request.goals
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting investment advice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Anomaly detection endpoints
@app.post("/api/v1/detect/anomalies", response_model=AnomalyDetectionResponse)
async def detect_anomalies(
    request: AnomalyDetectionRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Detect anomalous spending patterns"""
    try:
        await verify_token(credentials.credentials)
        
        result = await anomaly_detector.detect_anomalies(
            user_id=request.user_id,
            period_days=request.period_days,
            threshold=request.threshold
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error detecting anomalies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Prediction endpoints
@app.post("/api/v1/predict/spending", response_model=PredictionResponse)
async def predict_spending(
    request: PredictionRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Predict future spending patterns"""
    try:
        await verify_token(credentials.credentials)
        
        result = await prediction_engine.predict_spending(
            user_id=request.user_id,
            prediction_type=request.prediction_type,
            period_days=request.period_days,
            categories=request.categories
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error predicting spending: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Model training endpoints (for admin use)
@app.post("/api/v1/train/models")
async def train_models(
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Retrain AI models with latest data"""
    try:
        await verify_token(credentials.credentials)
        
        # Start training in background
        background_tasks.add_task(categorization_service.retrain_model)
        background_tasks.add_task(anomaly_detector.retrain_model)
        background_tasks.add_task(prediction_engine.retrain_model)
        
        return {"message": "Model training started", "status": "in_progress"}
        
    except Exception as e:
        logger.error(f"Error starting model training: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/models/status")
async def get_model_status(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get status of AI models"""
    try:
        await verify_token(credentials.credentials)
        
        status = {
            "categorization": await categorization_service.get_model_status(),
            "anomaly_detection": await anomaly_detector.get_model_status(),
            "prediction": await prediction_engine.get_model_status(),
            "last_trained": datetime.utcnow().isoformat()
        }
        
        return status
        
    except Exception as e:
        logger.error(f"Error getting model status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
