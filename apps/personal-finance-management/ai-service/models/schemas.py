"""
Pydantic schemas for AI/ML service requests and responses
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, date
from enum import Enum

class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class RiskTolerance(str, Enum):
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"

class PredictionType(str, Enum):
    SPENDING = "spending"
    INCOME = "income"
    SAVINGS = "savings"
    INVESTMENT_RETURNS = "investment_returns"

# Transaction Categorization Schemas
class TransactionCategorizationRequest(BaseModel):
    description: str = Field(..., description="Transaction description")
    amount: float = Field(..., gt=0, description="Transaction amount")
    merchant_name: Optional[str] = Field(None, description="Merchant name")
    user_id: str = Field(..., description="User ID")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")

class CategorySuggestion(BaseModel):
    category_id: str
    category_name: str
    confidence_score: float = Field(..., ge=0, le=1)
    reasoning: str

class TransactionCategorizationResponse(BaseModel):
    category_id: str
    category_name: str
    confidence_score: float = Field(..., ge=0, le=1)
    suggestions: List[CategorySuggestion] = []
    reasoning: str
    is_ai_categorized: bool = True

# SMS Parsing Schemas
class SMSParseRequest(BaseModel):
    sms_text: str = Field(..., description="Raw SMS text")
    bank_name: str = Field(..., description="Bank name (HBL, UBL, MCB, etc.)")
    user_id: str = Field(..., description="User ID")

class SMSParseResponse(BaseModel):
    success: bool
    amount: Optional[float] = None
    merchant_name: Optional[str] = None
    transaction_date: Optional[datetime] = None
    balance: Optional[float] = None
    transaction_type: Optional[TransactionType] = None
    confidence_score: float = Field(0, ge=0, le=1)
    raw_data: Dict[str, Any] = {}
    error_message: Optional[str] = None

# Receipt Scanning Schemas
class ReceiptScanRequest(BaseModel):
    image_url: Optional[str] = Field(None, description="URL of receipt image")
    image_data: Optional[str] = Field(None, description="Base64 encoded image data")
    user_id: str = Field(..., description="User ID")

class ReceiptItem(BaseModel):
    name: str
    quantity: int = 1
    price: float
    total: float

class ReceiptScanResponse(BaseModel):
    success: bool
    merchant_name: Optional[str] = None
    total_amount: Optional[float] = None
    transaction_date: Optional[datetime] = None
    items: List[ReceiptItem] = []
    tax_amount: Optional[float] = None
    confidence_score: float = Field(0, ge=0, le=1)
    raw_ocr_data: Dict[str, Any] = {}
    error_message: Optional[str] = None

# Financial Health Analysis Schemas
class FinancialHealthRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    period_months: int = Field(6, ge=1, le=24, description="Analysis period in months")
    include_predictions: bool = Field(True, description="Include future predictions")

class FinancialHealthMetric(BaseModel):
    name: str
    value: float
    target: Optional[float] = None
    status: str  # "excellent", "good", "fair", "poor"
    description: str

class FinancialHealthResponse(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    spending_score: int = Field(..., ge=0, le=100)
    saving_score: int = Field(..., ge=0, le=100)
    investment_score: int = Field(..., ge=0, le=100)
    debt_score: int = Field(..., ge=0, le=100)
    metrics: List[FinancialHealthMetric] = []
    recommendations: List[str] = []
    trends: Dict[str, Any] = {}
    predictions: Optional[Dict[str, Any]] = None

# Investment Advice Schemas
class InvestmentAdviceRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    investment_amount: float = Field(..., gt=0, description="Amount to invest")
    time_horizon: int = Field(..., ge=1, description="Investment horizon in months")
    risk_tolerance: RiskTolerance = Field(..., description="Risk tolerance level")
    goals: List[str] = Field(..., description="Investment goals")

class InvestmentAllocation(BaseModel):
    asset_type: str
    asset_name: str
    allocation_percentage: float = Field(..., ge=0, le=100)
    expected_return: float
    risk_level: str
    description: str

class InvestmentAdviceResponse(BaseModel):
    recommended_allocations: List[InvestmentAllocation] = []
    expected_annual_return: float
    risk_assessment: str
    reasoning: str
    alternative_strategies: List[Dict[str, Any]] = []
    warnings: List[str] = []

# Anomaly Detection Schemas
class AnomalyDetectionRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    period_days: int = Field(30, ge=1, le=365, description="Detection period in days")
    threshold: float = Field(0.8, ge=0, le=1, description="Anomaly detection threshold")

class Anomaly(BaseModel):
    transaction_id: str
    anomaly_type: str
    severity: str  # "low", "medium", "high", "critical"
    description: str
    amount: float
    expected_amount: Optional[float] = None
    confidence_score: float = Field(..., ge=0, le=1)
    recommendation: str

class AnomalyDetectionResponse(BaseModel):
    anomalies: List[Anomaly] = []
    total_anomalies: int = 0
    risk_level: str  # "low", "medium", "high"
    summary: str

# Prediction Schemas
class PredictionRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    prediction_type: PredictionType = Field(..., description="Type of prediction")
    period_days: int = Field(30, ge=1, le=365, description="Prediction period in days")
    categories: Optional[List[str]] = Field(None, description="Specific categories to predict")

class PredictionDataPoint(BaseModel):
    date: date
    predicted_value: float
    confidence_interval_lower: float
    confidence_interval_upper: float
    trend: str  # "increasing", "decreasing", "stable"

class PredictionResponse(BaseModel):
    predictions: List[PredictionDataPoint] = []
    accuracy_score: float = Field(..., ge=0, le=1)
    trend_analysis: Dict[str, Any] = {}
    recommendations: List[str] = []

# Model Training Schemas
class ModelTrainingRequest(BaseModel):
    model_type: str = Field(..., description="Type of model to train")
    training_data_period: int = Field(90, ge=1, le=365, description="Training data period in days")
    validation_split: float = Field(0.2, ge=0.1, le=0.5, description="Validation data split")

class ModelTrainingResponse(BaseModel):
    training_id: str
    status: str  # "started", "in_progress", "completed", "failed"
    estimated_completion: Optional[datetime] = None
    progress_percentage: float = Field(0, ge=0, le=100)

# Error Schemas
class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Validation functions
@validator('amount')
def validate_amount(cls, v):
    if v <= 0:
        raise ValueError('Amount must be positive')
    return v

@validator('confidence_score')
def validate_confidence_score(cls, v):
    if not 0 <= v <= 1:
        raise ValueError('Confidence score must be between 0 and 1')
    return v

@validator('allocation_percentage')
def validate_allocation_percentage(cls, v):
    if not 0 <= v <= 100:
        raise ValueError('Allocation percentage must be between 0 and 100')
    return v
