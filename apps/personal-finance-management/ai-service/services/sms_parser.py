"""
SMS Parser Service for Pakistani Banks
Parses SMS messages from various Pakistani banks to extract transaction data
"""

import asyncio
import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import json

from models.schemas import SMSParseResponse, TransactionType
from database.connection import get_database
from utils.logger import setup_logger

logger = setup_logger(__name__)

class SMSParser:
    def __init__(self):
        self.templates = {}
        self.is_initialized = False
        
    async def initialize(self):
        """Initialize SMS parser with bank templates"""
        try:
            logger.info("Initializing SMS parser...")
            
            # Load SMS templates from database
            await self._load_sms_templates()
            
            self.is_initialized = True
            logger.info("SMS parser initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing SMS parser: {str(e)}")
            raise
    
    async def _load_sms_templates(self):
        """Load SMS templates from database"""
        try:
            db = await get_database()
            query = """
                SELECT bank_name, template_regex, amount_group, merchant_group, 
                       balance_group, date_group, transaction_type
                FROM sms_templates 
                WHERE is_active = true
            """
            result = await db.fetch_all(query)
            
            for row in result:
                self.templates[row['bank_name']] = {
                    'regex': row['template_regex'],
                    'amount_group': row['amount_group'],
                    'merchant_group': row['merchant_group'],
                    'balance_group': row['balance_group'],
                    'date_group': row['date_group'],
                    'transaction_type': row['transaction_type']
                }
            
            logger.info(f"Loaded {len(self.templates)} SMS templates")
            
        except Exception as e:
            logger.error(f"Error loading SMS templates: {str(e)}")
            # Use default templates if database fails
            self._load_default_templates()
    
    def _load_default_templates(self):
        """Load default SMS templates for Pakistani banks"""
        self.templates = {
            'HBL': {
                'regex': r'.*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*debited.*at\s+(.+?)\s*on\s+(\d{2}-?\d{2}-?\d{4}).*Bal\s*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?).*',
                'amount_group': 1,
                'merchant_group': 2,
                'balance_group': 4,
                'date_group': 3,
                'transaction_type': 'expense'
            },
            'UBL': {
                'regex': r'.*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*debited.*at\s+(.+?)\s*on\s+(\d{2}-?\d{2}-?\d{4}).*Bal\s*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?).*',
                'amount_group': 1,
                'merchant_group': 2,
                'balance_group': 4,
                'date_group': 3,
                'transaction_type': 'expense'
            },
            'MCB': {
                'regex': r'.*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*debited.*at\s+(.+?)\s*on\s+(\d{2}-?\d{2}-?\d{4}).*Bal\s*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?).*',
                'amount_group': 1,
                'merchant_group': 2,
                'balance_group': 4,
                'date_group': 3,
                'transaction_type': 'expense'
            },
            'Bank Alfalah': {
                'regex': r'.*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*debited.*at\s+(.+?)\s*on\s+(\d{2}-?\d{2}-?\d{4}).*Bal\s*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?).*',
                'amount_group': 1,
                'merchant_group': 2,
                'balance_group': 4,
                'date_group': 3,
                'transaction_type': 'expense'
            },
            'JazzCash': {
                'regex': r'.*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*paid.*to\s+(.+?)\s*on\s+(\d{2}-?\d{2}-?\d{4}).*Bal\s*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?).*',
                'amount_group': 1,
                'merchant_group': 2,
                'balance_group': 4,
                'date_group': 3,
                'transaction_type': 'expense'
            },
            'EasyPaisa': {
                'regex': r'.*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*paid.*to\s+(.+?)\s*on\s+(\d{2}-?\d{2}-?\d{4}).*Bal\s*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?).*',
                'amount_group': 1,
                'merchant_group': 2,
                'balance_group': 4,
                'date_group': 3,
                'transaction_type': 'expense'
            },
            'Raast': {
                'regex': r'.*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*transferred.*to\s+(.+?)\s*on\s+(\d{2}-?\d{2}-?\d{4}).*Bal\s*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?).*',
                'amount_group': 1,
                'merchant_group': 2,
                'balance_group': 4,
                'date_group': 3,
                'transaction_type': 'expense'
            }
        }
    
    async def parse_sms(
        self,
        sms_text: str,
        bank_name: str,
        user_id: str
    ) -> SMSParseResponse:
        """Parse SMS text and extract transaction data"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            # Normalize bank name
            bank_name = self._normalize_bank_name(bank_name)
            
            if bank_name not in self.templates:
                return SMSParseResponse(
                    success=False,
                    error_message=f"Unsupported bank: {bank_name}"
                )
            
            # Parse SMS using template
            result = self._parse_with_template(sms_text, bank_name)
            
            if result['success']:
                # Store parsed data for analysis
                await self._store_parsed_sms(user_id, sms_text, result)
                
                return SMSParseResponse(
                    success=True,
                    amount=result['amount'],
                    merchant_name=result['merchant_name'],
                    transaction_date=result['transaction_date'],
                    balance=result['balance'],
                    transaction_type=TransactionType(result['transaction_type']),
                    confidence_score=result['confidence_score'],
                    raw_data=result['raw_data']
                )
            else:
                return SMSParseResponse(
                    success=False,
                    error_message=result['error_message']
                )
                
        except Exception as e:
            logger.error(f"Error parsing SMS: {str(e)}")
            return SMSParseResponse(
                success=False,
                error_message=f"Parsing error: {str(e)}"
            )
    
    def _normalize_bank_name(self, bank_name: str) -> str:
        """Normalize bank name to match template keys"""
        bank_name = bank_name.upper().strip()
        
        # Map variations to standard names
        name_mapping = {
            'HABIB BANK': 'HBL',
            'HABIB BANK LIMITED': 'HBL',
            'UNITED BANK': 'UBL',
            'UNITED BANK LIMITED': 'UBL',
            'MCB BANK': 'MCB',
            'MCB BANK LIMITED': 'MCB',
            'ALFALAH': 'Bank Alfalah',
            'BANK ALFALAH': 'Bank Alfalah',
            'JAZZ CASH': 'JazzCash',
            'JAZZCASH': 'JazzCash',
            'EASY PAISA': 'EasyPaisa',
            'EASYPAISA': 'EasyPaisa',
            'RAST': 'Raast',
            'RAST SYSTEM': 'Raast'
        }
        
        return name_mapping.get(bank_name, bank_name)
    
    def _parse_with_template(self, sms_text: str, bank_name: str) -> Dict[str, Any]:
        """Parse SMS using bank-specific template"""
        try:
            template = self.templates[bank_name]
            regex = template['regex']
            
            # Compile regex for better performance
            pattern = re.compile(regex, re.IGNORECASE | re.DOTALL)
            match = pattern.search(sms_text)
            
            if not match:
                return {
                    'success': False,
                    'error_message': 'SMS format not recognized'
                }
            
            # Extract data using groups
            groups = match.groups()
            
            amount = self._parse_amount(groups[template['amount_group'] - 1])
            merchant_name = groups[template['merchant_group'] - 1].strip()
            balance = self._parse_amount(groups[template['balance_group'] - 1])
            date_str = groups[template['date_group'] - 1]
            
            # Parse date
            transaction_date = self._parse_date(date_str)
            
            # Calculate confidence score
            confidence_score = self._calculate_confidence(sms_text, amount, merchant_name)
            
            return {
                'success': True,
                'amount': amount,
                'merchant_name': merchant_name,
                'transaction_date': transaction_date,
                'balance': balance,
                'transaction_type': template['transaction_type'],
                'confidence_score': confidence_score,
                'raw_data': {
                    'bank_name': bank_name,
                    'original_sms': sms_text,
                    'matched_groups': groups,
                    'template_used': template
                }
            }
            
        except Exception as e:
            logger.error(f"Error parsing with template: {str(e)}")
            return {
                'success': False,
                'error_message': f"Template parsing error: {str(e)}"
            }
    
    def _parse_amount(self, amount_str: str) -> Optional[float]:
        """Parse amount string to float"""
        try:
            if not amount_str:
                return None
            
            # Remove Rs. prefix and commas
            amount_str = amount_str.replace('Rs.', '').replace('rs.', '').replace('RS.', '')
            amount_str = amount_str.replace(',', '').strip()
            
            return float(amount_str)
            
        except (ValueError, AttributeError):
            return None
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string to datetime"""
        try:
            if not date_str:
                return None
            
            # Common Pakistani date formats
            date_formats = [
                '%d-%m-%Y',
                '%d/%m/%Y',
                '%d-%m-%y',
                '%d/%m/%y',
                '%Y-%m-%d',
                '%d.%m.%Y'
            ]
            
            for fmt in date_formats:
                try:
                    return datetime.strptime(date_str, fmt)
                except ValueError:
                    continue
            
            # If no format matches, try to extract date from text
            date_match = re.search(r'(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})', date_str)
            if date_match:
                day, month, year = date_match.groups()
                if len(year) == 2:
                    year = '20' + year
                return datetime(int(year), int(month), int(day))
            
            return None
            
        except Exception as e:
            logger.error(f"Error parsing date: {str(e)}")
            return None
    
    def _calculate_confidence(self, sms_text: str, amount: Optional[float], merchant_name: str) -> float:
        """Calculate confidence score for parsed data"""
        confidence = 0.0
        
        # Base confidence
        if amount is not None:
            confidence += 0.4
        
        if merchant_name and len(merchant_name) > 2:
            confidence += 0.3
        
        # Check for Pakistani bank keywords
        bank_keywords = ['hbl', 'ubl', 'mcb', 'alfalah', 'jazz', 'easypaisa', 'raast']
        sms_lower = sms_text.lower()
        for keyword in bank_keywords:
            if keyword in sms_lower:
                confidence += 0.1
                break
        
        # Check for transaction keywords
        transaction_keywords = ['debited', 'paid', 'transferred', 'withdrawn', 'spent']
        for keyword in transaction_keywords:
            if keyword in sms_lower:
                confidence += 0.1
                break
        
        # Check for amount format
        if re.search(r'Rs\.?\s*\d+', sms_text):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    async def _store_parsed_sms(self, user_id: str, sms_text: str, parsed_data: Dict[str, Any]):
        """Store parsed SMS data for analysis"""
        try:
            db = await get_database()
            query = """
                INSERT INTO transactions (
                    user_id, amount, description, merchant_name, 
                    transaction_date, sms_source, sms_raw_text, sms_parsed_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """
            
            await db.execute(
                query,
                user_id,
                parsed_data['amount'],
                f"SMS: {parsed_data['merchant_name']}",
                parsed_data['merchant_name'],
                parsed_data['transaction_date'],
                'sms',
                sms_text,
                json.dumps(parsed_data['raw_data'])
            )
            
        except Exception as e:
            logger.error(f"Error storing parsed SMS: {str(e)}")
    
    async def get_supported_banks(self) -> List[str]:
        """Get list of supported banks"""
        if not self.is_initialized:
            await self.initialize()
        
        return list(self.templates.keys())
    
    async def add_custom_template(self, bank_name: str, template_regex: str, groups: Dict[str, int]):
        """Add custom SMS template for a bank"""
        try:
            self.templates[bank_name] = {
                'regex': template_regex,
                'amount_group': groups.get('amount_group', 1),
                'merchant_group': groups.get('merchant_group', 2),
                'balance_group': groups.get('balance_group', 4),
                'date_group': groups.get('date_group', 3),
                'transaction_type': groups.get('transaction_type', 'expense')
            }
            
            # Store in database
            db = await get_database()
            query = """
                INSERT INTO sms_templates (
                    bank_name, template_regex, amount_group, merchant_group,
                    balance_group, date_group, transaction_type
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (bank_name) DO UPDATE SET
                    template_regex = EXCLUDED.template_regex,
                    amount_group = EXCLUDED.amount_group,
                    merchant_group = EXCLUDED.merchant_group,
                    balance_group = EXCLUDED.balance_group,
                    date_group = EXCLUDED.date_group,
                    transaction_type = EXCLUDED.transaction_type
            """
            
            await db.execute(
                query,
                bank_name,
                template_regex,
                groups.get('amount_group', 1),
                groups.get('merchant_group', 2),
                groups.get('balance_group', 4),
                groups.get('date_group', 3),
                groups.get('transaction_type', 'expense')
            )
            
            logger.info(f"Added custom template for {bank_name}")
            
        except Exception as e:
            logger.error(f"Error adding custom template: {str(e)}")
            raise
