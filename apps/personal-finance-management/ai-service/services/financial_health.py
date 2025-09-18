"""
Financial Health Analyzer Service
Analyzes user's financial health and provides recommendations
"""

import asyncio
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import json

from models.schemas import FinancialHealthResponse, FinancialHealthMetric
from database.connection import get_database
from utils.logger import setup_logger

logger = setup_logger(__name__)

class FinancialHealthAnalyzer:
    def __init__(self):
        self.is_initialized = False
        self.scaler = StandardScaler()
        
    async def initialize(self):
        """Initialize the financial health analyzer"""
        try:
            logger.info("Initializing financial health analyzer...")
            self.is_initialized = True
            logger.info("Financial health analyzer initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing financial health analyzer: {str(e)}")
            raise
    
    async def analyze_financial_health(
        self,
        user_id: str,
        period_months: int = 6,
        include_predictions: bool = True
    ) -> FinancialHealthResponse:
        """Analyze user's financial health"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            # Get user's financial data
            financial_data = await self._get_financial_data(user_id, period_months)
            
            if not financial_data:
                return self._get_default_health_response()
            
            # Calculate health metrics
            metrics = await self._calculate_health_metrics(financial_data)
            
            # Calculate overall scores
            scores = self._calculate_scores(metrics)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(metrics, scores)
            
            # Analyze trends
            trends = await self._analyze_trends(financial_data)
            
            # Generate predictions if requested
            predictions = None
            if include_predictions:
                predictions = await self._generate_predictions(financial_data, period_months)
            
            return FinancialHealthResponse(
                overall_score=scores['overall'],
                spending_score=scores['spending'],
                saving_score=scores['saving'],
                investment_score=scores['investment'],
                debt_score=scores['debt'],
                metrics=metrics,
                recommendations=recommendations,
                trends=trends,
                predictions=predictions
            )
            
        except Exception as e:
            logger.error(f"Error analyzing financial health: {str(e)}")
            return self._get_default_health_response()
    
    async def _get_financial_data(self, user_id: str, period_months: int) -> Dict[str, Any]:
        """Get user's financial data from database"""
        try:
            db = await get_database()
            
            # Get transactions
            transactions_query = """
                SELECT 
                    transaction_type,
                    amount,
                    transaction_date,
                    category_id,
                    description
                FROM transactions 
                WHERE user_id = $1 
                AND transaction_date >= NOW() - INTERVAL '%s months'
                ORDER BY transaction_date DESC
            """ % period_months
            
            transactions = await db.fetch_all(transactions_query, user_id)
            
            # Get user profile
            profile_query = """
                SELECT 
                    monthly_income,
                    risk_tolerance,
                    investment_horizon,
                    financial_goals
                FROM pfm_users 
                WHERE user_id = $1
            """
            
            profile = await db.fetch_one(profile_query, user_id)
            
            # Get budgets
            budgets_query = """
                SELECT 
                    total_amount,
                    spent_amount,
                    budget_type,
                    start_date,
                    end_date
                FROM budgets 
                WHERE user_id = $1 
                AND is_active = true
            """
            
            budgets = await db.fetch_all(budgets_query, user_id)
            
            # Get financial goals
            goals_query = """
                SELECT 
                    goal_type,
                    target_amount,
                    current_amount,
                    target_date,
                    status
                FROM financial_goals 
                WHERE user_id = $1 
                AND status = 'active'
            """
            
            goals = await db.fetch_all(goals_query, user_id)
            
            return {
                'transactions': [dict(t) for t in transactions],
                'profile': dict(profile) if profile else {},
                'budgets': [dict(b) for b in budgets],
                'goals': [dict(g) for g in goals]
            }
            
        except Exception as e:
            logger.error(f"Error getting financial data: {str(e)}")
            return {}
    
    async def _calculate_health_metrics(self, financial_data: Dict[str, Any]) -> List[FinancialHealthMetric]:
        """Calculate various financial health metrics"""
        try:
            metrics = []
            transactions = financial_data.get('transactions', [])
            profile = financial_data.get('profile', {})
            budgets = financial_data.get('budgets', [])
            goals = financial_data.get('goals', [])
            
            # Convert to DataFrame for easier analysis
            df = pd.DataFrame(transactions)
            if df.empty:
                return self._get_default_metrics()
            
            df['transaction_date'] = pd.to_datetime(df['transaction_date'])
            df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
            
            # Separate income and expenses
            income_df = df[df['transaction_type'] == 'income']
            expense_df = df[df['transaction_type'] == 'expense']
            
            # Monthly income
            monthly_income = profile.get('monthly_income', 0)
            if monthly_income == 0 and not income_df.empty:
                monthly_income = income_df['amount'].sum() / len(income_df['transaction_date'].dt.to_period('M').unique())
            
            # Monthly expenses
            monthly_expenses = 0
            if not expense_df.empty:
                monthly_expenses = expense_df['amount'].sum() / len(expense_df['transaction_date'].dt.to_period('M').unique())
            
            # Savings rate
            savings_rate = 0
            if monthly_income > 0:
                savings_rate = ((monthly_income - monthly_expenses) / monthly_income) * 100
            
            metrics.append(FinancialHealthMetric(
                name="Savings Rate",
                value=savings_rate,
                target=20.0,
                status=self._get_status(savings_rate, 20.0, higher_is_better=True),
                description=f"Percentage of income saved each month"
            ))
            
            # Expense-to-Income ratio
            expense_ratio = 0
            if monthly_income > 0:
                expense_ratio = (monthly_expenses / monthly_income) * 100
            
            metrics.append(FinancialHealthMetric(
                name="Expense-to-Income Ratio",
                value=expense_ratio,
                target=70.0,
                status=self._get_status(expense_ratio, 70.0, higher_is_better=False),
                description=f"Percentage of income spent on expenses"
            ))
            
            # Budget adherence
            budget_adherence = self._calculate_budget_adherence(budgets)
            metrics.append(FinancialHealthMetric(
                name="Budget Adherence",
                value=budget_adherence,
                target=80.0,
                status=self._get_status(budget_adherence, 80.0, higher_is_better=True),
                description=f"Percentage of budgets followed"
            ))
            
            # Emergency fund
            emergency_fund_months = self._calculate_emergency_fund(transactions, monthly_expenses)
            metrics.append(FinancialHealthMetric(
                name="Emergency Fund (Months)",
                value=emergency_fund_months,
                target=6.0,
                status=self._get_status(emergency_fund_months, 6.0, higher_is_better=True),
                description=f"Months of expenses covered by emergency fund"
            ))
            
            # Investment rate
            investment_rate = self._calculate_investment_rate(transactions, monthly_income)
            metrics.append(FinancialHealthMetric(
                name="Investment Rate",
                value=investment_rate,
                target=10.0,
                status=self._get_status(investment_rate, 10.0, higher_is_better=True),
                description=f"Percentage of income invested"
            ))
            
            # Debt-to-Income ratio
            debt_ratio = self._calculate_debt_ratio(transactions, monthly_income)
            metrics.append(FinancialHealthMetric(
                name="Debt-to-Income Ratio",
                value=debt_ratio,
                target=30.0,
                status=self._get_status(debt_ratio, 30.0, higher_is_better=False),
                description=f"Percentage of income used for debt payments"
            ))
            
            # Spending consistency
            spending_consistency = self._calculate_spending_consistency(expense_df)
            metrics.append(FinancialHealthMetric(
                name="Spending Consistency",
                value=spending_consistency,
                target=80.0,
                status=self._get_status(spending_consistency, 80.0, higher_is_better=True),
                description=f"Consistency in spending patterns"
            ))
            
            # Goal progress
            goal_progress = self._calculate_goal_progress(goals)
            metrics.append(FinancialHealthMetric(
                name="Goal Progress",
                value=goal_progress,
                target=70.0,
                status=self._get_status(goal_progress, 70.0, higher_is_better=True),
                description=f"Progress towards financial goals"
            ))
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating health metrics: {str(e)}")
            return self._get_default_metrics()
    
    def _calculate_scores(self, metrics: List[FinancialHealthMetric]) -> Dict[str, int]:
        """Calculate overall scores based on metrics"""
        try:
            # Group metrics by category
            spending_metrics = ['Expense-to-Income Ratio', 'Spending Consistency', 'Budget Adherence']
            saving_metrics = ['Savings Rate', 'Emergency Fund (Months)']
            investment_metrics = ['Investment Rate']
            debt_metrics = ['Debt-to-Income Ratio']
            
            def calculate_category_score(metric_names: List[str]) -> int:
                category_metrics = [m for m in metrics if m.name in metric_names]
                if not category_metrics:
                    return 50  # Default score
                
                # Calculate weighted average based on status
                status_scores = {
                    'excellent': 90,
                    'good': 75,
                    'fair': 60,
                    'poor': 30
                }
                
                total_score = sum(status_scores.get(m.status, 50) for m in category_metrics)
                return int(total_score / len(category_metrics))
            
            spending_score = calculate_category_score(spending_metrics)
            saving_score = calculate_category_score(saving_metrics)
            investment_score = calculate_category_score(investment_metrics)
            debt_score = calculate_category_score(debt_metrics)
            
            # Overall score is weighted average
            overall_score = int(
                (spending_score * 0.3 + saving_score * 0.3 + 
                 investment_score * 0.2 + debt_score * 0.2)
            )
            
            return {
                'overall': overall_score,
                'spending': spending_score,
                'saving': saving_score,
                'investment': investment_score,
                'debt': debt_score
            }
            
        except Exception as e:
            logger.error(f"Error calculating scores: {str(e)}")
            return {
                'overall': 50,
                'spending': 50,
                'saving': 50,
                'investment': 50,
                'debt': 50
            }
    
    def _calculate_budget_adherence(self, budgets: List[Dict[str, Any]]) -> float:
        """Calculate budget adherence percentage"""
        try:
            if not budgets:
                return 0.0
            
            total_budgets = len(budgets)
            adhered_budgets = 0
            
            for budget in budgets:
                total_amount = budget.get('total_amount', 0)
                spent_amount = budget.get('spent_amount', 0)
                
                if total_amount > 0:
                    adherence = (spent_amount / total_amount) * 100
                    if adherence <= 100:  # Within budget
                        adhered_budgets += 1
            
            return (adhered_budgets / total_budgets) * 100
            
        except Exception as e:
            logger.error(f"Error calculating budget adherence: {str(e)}")
            return 0.0
    
    def _calculate_emergency_fund(self, transactions: List[Dict[str, Any]], monthly_expenses: float) -> float:
        """Calculate emergency fund in months of expenses"""
        try:
            if monthly_expenses <= 0:
                return 0.0
            
            # Look for savings transactions
            savings_transactions = [
                t for t in transactions 
                if t.get('category_id') == 'savings' or 'savings' in t.get('description', '').lower()
            ]
            
            total_savings = sum(t.get('amount', 0) for t in savings_transactions)
            
            return total_savings / monthly_expenses if monthly_expenses > 0 else 0.0
            
        except Exception as e:
            logger.error(f"Error calculating emergency fund: {str(e)}")
            return 0.0
    
    def _calculate_investment_rate(self, transactions: List[Dict[str, Any]], monthly_income: float) -> float:
        """Calculate investment rate as percentage of income"""
        try:
            if monthly_income <= 0:
                return 0.0
            
            # Look for investment transactions
            investment_transactions = [
                t for t in transactions 
                if t.get('category_id') == 'investments' or 'investment' in t.get('description', '').lower()
            ]
            
            total_investments = sum(t.get('amount', 0) for t in investment_transactions)
            
            return (total_investments / monthly_income) * 100 if monthly_income > 0 else 0.0
            
        except Exception as e:
            logger.error(f"Error calculating investment rate: {str(e)}")
            return 0.0
    
    def _calculate_debt_ratio(self, transactions: List[Dict[str, Any]], monthly_income: float) -> float:
        """Calculate debt-to-income ratio"""
        try:
            if monthly_income <= 0:
                return 0.0
            
            # Look for debt payment transactions
            debt_transactions = [
                t for t in transactions 
                if 'loan' in t.get('description', '').lower() or 
                   'debt' in t.get('description', '').lower() or
                   'credit' in t.get('description', '').lower()
            ]
            
            total_debt_payments = sum(t.get('amount', 0) for t in debt_transactions)
            
            return (total_debt_payments / monthly_income) * 100 if monthly_income > 0 else 0.0
            
        except Exception as e:
            logger.error(f"Error calculating debt ratio: {str(e)}")
            return 0.0
    
    def _calculate_spending_consistency(self, expense_df: pd.DataFrame) -> float:
        """Calculate spending consistency"""
        try:
            if expense_df.empty:
                return 0.0
            
            # Group by month and calculate monthly spending
            monthly_spending = expense_df.groupby(expense_df['transaction_date'].dt.to_period('M'))['amount'].sum()
            
            if len(monthly_spending) < 2:
                return 100.0  # Not enough data for consistency calculation
            
            # Calculate coefficient of variation (lower is more consistent)
            mean_spending = monthly_spending.mean()
            std_spending = monthly_spending.std()
            
            if mean_spending == 0:
                return 0.0
            
            cv = std_spending / mean_spending
            consistency = max(0, 100 - (cv * 100))
            
            return min(consistency, 100.0)
            
        except Exception as e:
            logger.error(f"Error calculating spending consistency: {str(e)}")
            return 0.0
    
    def _calculate_goal_progress(self, goals: List[Dict[str, Any]]) -> float:
        """Calculate progress towards financial goals"""
        try:
            if not goals:
                return 0.0
            
            total_progress = 0
            for goal in goals:
                target_amount = goal.get('target_amount', 0)
                current_amount = goal.get('current_amount', 0)
                
                if target_amount > 0:
                    progress = (current_amount / target_amount) * 100
                    total_progress += min(progress, 100)
            
            return total_progress / len(goals) if goals else 0.0
            
        except Exception as e:
            logger.error(f"Error calculating goal progress: {str(e)}")
            return 0.0
    
    def _get_status(self, value: float, target: float, higher_is_better: bool = True) -> str:
        """Get status based on value and target"""
        try:
            if higher_is_better:
                if value >= target * 1.2:
                    return 'excellent'
                elif value >= target:
                    return 'good'
                elif value >= target * 0.7:
                    return 'fair'
                else:
                    return 'poor'
            else:
                if value <= target * 0.8:
                    return 'excellent'
                elif value <= target:
                    return 'good'
                elif value <= target * 1.3:
                    return 'fair'
                else:
                    return 'poor'
                    
        except Exception as e:
            logger.error(f"Error getting status: {str(e)}")
            return 'fair'
    
    def _generate_recommendations(self, metrics: List[FinancialHealthMetric], scores: Dict[str, int]) -> List[str]:
        """Generate personalized recommendations"""
        try:
            recommendations = []
            
            # Analyze each metric and generate recommendations
            for metric in metrics:
                if metric.status == 'poor':
                    if metric.name == 'Savings Rate':
                        recommendations.append("Increase your savings rate by reducing unnecessary expenses and setting up automatic transfers to a savings account.")
                    elif metric.name == 'Expense-to-Income Ratio':
                        recommendations.append("Reduce your expenses by creating a detailed budget and cutting back on non-essential spending.")
                    elif metric.name == 'Budget Adherence':
                        recommendations.append("Improve budget adherence by using expense tracking tools and setting realistic budget limits.")
                    elif metric.name == 'Emergency Fund (Months)':
                        recommendations.append("Build an emergency fund by setting aside 3-6 months of expenses in a high-yield savings account.")
                    elif metric.name == 'Investment Rate':
                        recommendations.append("Start investing regularly, even small amounts, to build long-term wealth.")
                    elif metric.name == 'Debt-to-Income Ratio':
                        recommendations.append("Focus on paying down high-interest debt and avoid taking on new debt.")
                    elif metric.name == 'Spending Consistency':
                        recommendations.append("Create a monthly spending plan and stick to it to improve spending consistency.")
                    elif metric.name == 'Goal Progress':
                        recommendations.append("Set specific, measurable financial goals and track your progress regularly.")
            
            # Add general recommendations based on overall score
            if scores['overall'] < 60:
                recommendations.append("Consider consulting with a financial advisor to create a comprehensive financial plan.")
            elif scores['overall'] < 80:
                recommendations.append("You're on the right track! Focus on the areas that need improvement to reach excellent financial health.")
            else:
                recommendations.append("Excellent financial health! Continue your good habits and consider advanced investment strategies.")
            
            return recommendations[:5]  # Limit to top 5 recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return ["Focus on building good financial habits and tracking your expenses regularly."]
    
    async def _analyze_trends(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze financial trends"""
        try:
            transactions = financial_data.get('transactions', [])
            if not transactions:
                return {}
            
            df = pd.DataFrame(transactions)
            df['transaction_date'] = pd.to_datetime(df['transaction_date'])
            df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
            
            # Monthly trends
            monthly_trends = df.groupby(df['transaction_date'].dt.to_period('M')).agg({
                'amount': 'sum',
                'transaction_type': 'count'
            }).reset_index()
            
            # Spending trends
            expense_df = df[df['transaction_type'] == 'expense']
            if not expense_df.empty:
                monthly_expenses = expense_df.groupby(expense_df['transaction_date'].dt.to_period('M'))['amount'].sum()
                spending_trend = 'increasing' if monthly_expenses.iloc[-1] > monthly_expenses.iloc[0] else 'decreasing'
            else:
                spending_trend = 'stable'
            
            return {
                'spending_trend': spending_trend,
                'monthly_data': monthly_trends.to_dict('records'),
                'total_transactions': len(transactions),
                'analysis_period': f"{len(monthly_trends)} months"
            }
            
        except Exception as e:
            logger.error(f"Error analyzing trends: {str(e)}")
            return {}
    
    async def _generate_predictions(self, financial_data: Dict[str, Any], period_months: int) -> Dict[str, Any]:
        """Generate future predictions"""
        try:
            # Simple linear prediction based on historical data
            transactions = financial_data.get('transactions', [])
            if not transactions:
                return {}
            
            df = pd.DataFrame(transactions)
            df['transaction_date'] = pd.to_datetime(df['transaction_date'])
            df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
            
            # Predict next month's spending
            expense_df = df[df['transaction_type'] == 'expense']
            if not expense_df.empty:
                monthly_expenses = expense_df.groupby(expense_df['transaction_date'].dt.to_period('M'))['amount'].sum()
                
                if len(monthly_expenses) >= 2:
                    # Simple linear trend
                    x = np.arange(len(monthly_expenses))
                    y = monthly_expenses.values
                    
                    # Linear regression
                    coeffs = np.polyfit(x, y, 1)
                    next_month_prediction = coeffs[0] * len(monthly_expenses) + coeffs[1]
                    
                    return {
                        'next_month_spending': float(next_month_prediction),
                        'trend_direction': 'increasing' if coeffs[0] > 0 else 'decreasing',
                        'confidence': 0.7  # Simple confidence score
                    }
            
            return {}
            
        except Exception as e:
            logger.error(f"Error generating predictions: {str(e)}")
            return {}
    
    def _get_default_health_response(self) -> FinancialHealthResponse:
        """Get default health response when no data is available"""
        return FinancialHealthResponse(
            overall_score=50,
            spending_score=50,
            saving_score=50,
            investment_score=50,
            debt_score=50,
            metrics=self._get_default_metrics(),
            recommendations=["Start tracking your expenses to get personalized financial health insights."],
            trends={},
            predictions=None
        )
    
    def _get_default_metrics(self) -> List[FinancialHealthMetric]:
        """Get default metrics when no data is available"""
        return [
            FinancialHealthMetric(
                name="Savings Rate",
                value=0.0,
                target=20.0,
                status="poor",
                description="Percentage of income saved each month"
            ),
            FinancialHealthMetric(
                name="Expense-to-Income Ratio",
                value=0.0,
                target=70.0,
                status="excellent",
                description="Percentage of income spent on expenses"
            ),
            FinancialHealthMetric(
                name="Budget Adherence",
                value=0.0,
                target=80.0,
                status="poor",
                description="Percentage of budgets followed"
            ),
            FinancialHealthMetric(
                name="Emergency Fund (Months)",
                value=0.0,
                target=6.0,
                status="poor",
                description="Months of expenses covered by emergency fund"
            ),
            FinancialHealthMetric(
                name="Investment Rate",
                value=0.0,
                target=10.0,
                status="poor",
                description="Percentage of income invested"
            ),
            FinancialHealthMetric(
                name="Debt-to-Income Ratio",
                value=0.0,
                target=30.0,
                status="excellent",
                description="Percentage of income used for debt payments"
            )
        ]
