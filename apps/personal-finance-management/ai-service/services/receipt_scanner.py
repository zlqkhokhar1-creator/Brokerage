"""
Receipt Scanner Service
Uses OCR and AI to extract data from receipt images
"""

import asyncio
import logging
import base64
import io
from typing import Dict, Any, Optional, List
from datetime import datetime
import re
import json
import requests
from PIL import Image
import easyocr
import pytesseract
import cv2
import numpy as np

from models.schemas import ReceiptScanResponse, ReceiptItem
from utils.logger import setup_logger

logger = setup_logger(__name__)

class ReceiptScanner:
    def __init__(self):
        self.ocr_reader = None
        self.is_initialized = False
        
    async def initialize(self):
        """Initialize receipt scanner with OCR engines"""
        try:
            logger.info("Initializing receipt scanner...")
            
            # Initialize EasyOCR for better text recognition
            self.ocr_reader = easyocr.Reader(['en', 'ur'])  # English and Urdu support
            
            self.is_initialized = True
            logger.info("Receipt scanner initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing receipt scanner: {str(e)}")
            raise
    
    async def scan_receipt(
        self,
        image_url: Optional[str] = None,
        image_data: Optional[str] = None,
        user_id: str = None
    ) -> ReceiptScanResponse:
        """Scan receipt image and extract transaction data"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            # Get image data
            image = await self._get_image(image_url, image_data)
            if image is None:
                return ReceiptScanResponse(
                    success=False,
                    error_message="Could not load image"
                )
            
            # Preprocess image for better OCR
            processed_image = self._preprocess_image(image)
            
            # Extract text using OCR
            ocr_text = await self._extract_text(processed_image)
            
            if not ocr_text:
                return ReceiptScanResponse(
                    success=False,
                    error_message="No text found in image"
                )
            
            # Parse receipt data
            receipt_data = self._parse_receipt_text(ocr_text)
            
            # Calculate confidence score
            confidence_score = self._calculate_confidence(receipt_data, ocr_text)
            
            return ReceiptScanResponse(
                success=True,
                merchant_name=receipt_data.get('merchant_name'),
                total_amount=receipt_data.get('total_amount'),
                transaction_date=receipt_data.get('transaction_date'),
                items=receipt_data.get('items', []),
                tax_amount=receipt_data.get('tax_amount'),
                confidence_score=confidence_score,
                raw_ocr_data={
                    'full_text': ocr_text,
                    'parsed_data': receipt_data
                }
            )
            
        except Exception as e:
            logger.error(f"Error scanning receipt: {str(e)}")
            return ReceiptScanResponse(
                success=False,
                error_message=f"Scanning error: {str(e)}"
            )
    
    async def _get_image(self, image_url: Optional[str], image_data: Optional[str]) -> Optional[Image.Image]:
        """Get image from URL or base64 data"""
        try:
            if image_data:
                # Decode base64 image
                image_bytes = base64.b64decode(image_data)
                return Image.open(io.BytesIO(image_bytes))
            
            elif image_url:
                # Download image from URL
                response = requests.get(image_url, timeout=30)
                response.raise_for_status()
                return Image.open(io.BytesIO(response.content))
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting image: {str(e)}")
            return None
    
    def _preprocess_image(self, image: Image.Image) -> np.ndarray:
        """Preprocess image for better OCR results"""
        try:
            # Convert PIL image to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Convert to grayscale
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
            
            # Apply Gaussian blur to reduce noise
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Apply adaptive thresholding
            thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            
            # Morphological operations to clean up
            kernel = np.ones((1, 1), np.uint8)
            cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            return cleaned
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            return np.array(image)
    
    async def _extract_text(self, image: np.ndarray) -> str:
        """Extract text from image using OCR"""
        try:
            # Use EasyOCR for better accuracy
            results = self.ocr_reader.readtext(image)
            
            # Combine all text
            text_lines = []
            for (bbox, text, confidence) in results:
                if confidence > 0.5:  # Only include high-confidence text
                    text_lines.append(text.strip())
            
            return '\n'.join(text_lines)
            
        except Exception as e:
            logger.error(f"Error extracting text: {str(e)}")
            # Fallback to Tesseract
            try:
                return pytesseract.image_to_string(image, lang='eng')
            except Exception as e2:
                logger.error(f"Tesseract fallback failed: {str(e2)}")
                return ""
    
    def _parse_receipt_text(self, text: str) -> Dict[str, Any]:
        """Parse receipt text to extract structured data"""
        try:
            lines = text.split('\n')
            receipt_data = {
                'merchant_name': None,
                'total_amount': None,
                'transaction_date': None,
                'items': [],
                'tax_amount': None
            }
            
            # Extract merchant name (usually first line or contains business keywords)
            receipt_data['merchant_name'] = self._extract_merchant_name(lines)
            
            # Extract total amount
            receipt_data['total_amount'] = self._extract_total_amount(text)
            
            # Extract transaction date
            receipt_data['transaction_date'] = self._extract_date(text)
            
            # Extract items
            receipt_data['items'] = self._extract_items(lines)
            
            # Extract tax amount
            receipt_data['tax_amount'] = self._extract_tax_amount(text)
            
            return receipt_data
            
        except Exception as e:
            logger.error(f"Error parsing receipt text: {str(e)}")
            return {}
    
    def _extract_merchant_name(self, lines: List[str]) -> Optional[str]:
        """Extract merchant name from receipt lines"""
        try:
            # Look for business keywords
            business_keywords = ['LTD', 'PVT', 'STORE', 'SHOP', 'RESTAURANT', 'HOTEL', 'MALL', 'CENTER']
            
            for line in lines[:5]:  # Check first 5 lines
                line_upper = line.upper()
                if any(keyword in line_upper for keyword in business_keywords):
                    return line.strip()
            
            # If no business keywords, return first non-empty line
            for line in lines:
                if line.strip() and len(line.strip()) > 3:
                    return line.strip()
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting merchant name: {str(e)}")
            return None
    
    def _extract_total_amount(self, text: str) -> Optional[float]:
        """Extract total amount from receipt text"""
        try:
            # Common total amount patterns
            patterns = [
                r'total[:\s]*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
                r'grand\s+total[:\s]*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
                r'amount[:\s]*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
                r'rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*total',
                r'rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*$'  # Amount at end of line
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    # Return the largest amount found
                    amounts = [self._parse_amount(match) for match in matches]
                    amounts = [amt for amt in amounts if amt is not None]
                    if amounts:
                        return max(amounts)
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting total amount: {str(e)}")
            return None
    
    def _extract_date(self, text: str) -> Optional[datetime]:
        """Extract transaction date from receipt text"""
        try:
            # Common date patterns
            date_patterns = [
                r'(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})',
                r'(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})',
                r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})'
            ]
            
            for pattern in date_patterns:
                matches = re.findall(pattern, text)
                for match in matches:
                    try:
                        if len(match[2]) == 2:  # 2-digit year
                            year = int('20' + match[2])
                        else:
                            year = int(match[2])
                        
                        month = int(match[1])
                        day = int(match[0])
                        
                        # Validate date
                        if 1 <= month <= 12 and 1 <= day <= 31:
                            return datetime(year, month, day)
                    except ValueError:
                        continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting date: {str(e)}")
            return None
    
    def _extract_items(self, lines: List[str]) -> List[ReceiptItem]:
        """Extract items from receipt lines"""
        try:
            items = []
            
            for line in lines:
                # Look for item patterns (name followed by price)
                item_pattern = r'^(.+?)\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)$'
                match = re.match(item_pattern, line.strip())
                
                if match:
                    name = match.group(1).strip()
                    price = self._parse_amount(match.group(2))
                    
                    if price and price > 0:
                        items.append(ReceiptItem(
                            name=name,
                            quantity=1,
                            price=price,
                            total=price
                        ))
            
            return items
            
        except Exception as e:
            logger.error(f"Error extracting items: {str(e)}")
            return []
    
    def _extract_tax_amount(self, text: str) -> Optional[float]:
        """Extract tax amount from receipt text"""
        try:
            # Common tax patterns
            patterns = [
                r'tax[:\s]*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
                r'gst[:\s]*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
                r'vat[:\s]*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
                r'sales\s+tax[:\s]*Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)'
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    return self._parse_amount(matches[0])
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting tax amount: {str(e)}")
            return None
    
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
    
    def _calculate_confidence(self, receipt_data: Dict[str, Any], ocr_text: str) -> float:
        """Calculate confidence score for parsed receipt data"""
        confidence = 0.0
        
        # Base confidence for successful OCR
        if ocr_text and len(ocr_text) > 10:
            confidence += 0.3
        
        # Merchant name found
        if receipt_data.get('merchant_name'):
            confidence += 0.2
        
        # Total amount found
        if receipt_data.get('total_amount'):
            confidence += 0.3
        
        # Date found
        if receipt_data.get('transaction_date'):
            confidence += 0.1
        
        # Items found
        if receipt_data.get('items'):
            confidence += 0.1
        
        # Check for Pakistani currency indicators
        if 'Rs.' in ocr_text or 'PKR' in ocr_text:
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    async def batch_scan_receipts(self, receipt_requests: List[Dict[str, Any]]) -> List[ReceiptScanResponse]:
        """Scan multiple receipts in batch"""
        try:
            results = []
            
            for request in receipt_requests:
                result = await self.scan_receipt(
                    image_url=request.get('image_url'),
                    image_data=request.get('image_data'),
                    user_id=request.get('user_id')
                )
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"Error in batch scanning: {str(e)}")
            return []
    
    async def get_supported_formats(self) -> List[str]:
        """Get list of supported image formats"""
        return ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp']
    
    async def validate_image(self, image_url: Optional[str], image_data: Optional[str]) -> bool:
        """Validate if image is suitable for OCR"""
        try:
            image = await self._get_image(image_url, image_data)
            if image is None:
                return False
            
            # Check image size
            width, height = image.size
            if width < 100 or height < 100:
                return False
            
            # Check if image has text (basic check)
            processed_image = self._preprocess_image(image)
            text = await self._extract_text(processed_image)
            
            return len(text.strip()) > 10
            
        except Exception as e:
            logger.error(f"Error validating image: {str(e)}")
            return False
