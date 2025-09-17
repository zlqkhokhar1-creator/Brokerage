//! Price handling with high precision decimal arithmetic

use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

/// High-precision price representation using decimal arithmetic
/// 
/// Prices are stored as `Decimal` to avoid floating point precision issues
/// common in financial calculations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Price(Decimal);

impl Price {
    /// Creates a new price with validation
    /// 
    /// # Errors
    /// Returns error if price is negative or zero
    pub fn new(value: Decimal) -> crate::Result<Self> {
        if value <= Decimal::ZERO {
            return Err(crate::MatchingEngineError::InvalidPrice(
                format!("Price must be positive, got: {}", value)
            ));
        }
        Ok(Self(value))
    }
    
    /// Creates a price from cents (e.g., 15000 cents = $150.00)
    pub fn from_cents(cents: i64) -> crate::Result<Self> {
        if cents <= 0 {
            return Err(crate::MatchingEngineError::InvalidPrice(
                format!("Price in cents must be positive, got: {}", cents)
            ));
        }
        let decimal = Decimal::new(cents, 2);
        Ok(Self(decimal))
    }
    
    /// Creates a price from a string representation
    pub fn from_str(s: &str) -> crate::Result<Self> {
        let decimal = s.parse::<Decimal>()
            .map_err(|e| crate::MatchingEngineError::InvalidPrice(
                format!("Invalid price format '{}': {}", s, e)
            ))?;
        Self::new(decimal)
    }
    
    /// Gets the underlying decimal value
    pub fn value(&self) -> Decimal {
        self.0
    }
    
    /// Gets the price as cents (useful for integer operations)
    pub fn as_cents(&self) -> i64 {
        (self.0 * Decimal::ONE_HUNDRED).to_i64().unwrap_or(0)
    }
}

impl std::fmt::Display for Price {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl PartialOrd for Price {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Price {
    fn cmp(&self, other: &Self) -> Ordering {
        self.0.cmp(&other.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal::Decimal;

    #[test]
    fn test_price_creation() {
        let price = Price::new(Decimal::new(15000, 2)).unwrap();
        assert_eq!(price.value(), Decimal::new(15000, 2));
    }

    #[test]
    fn test_price_from_cents() {
        let price = Price::from_cents(15000).unwrap();
        assert_eq!(price.value(), Decimal::new(15000, 2));
        assert_eq!(price.as_cents(), 15000);
    }

    #[test]
    fn test_invalid_price() {
        assert!(Price::new(Decimal::ZERO).is_err());
        assert!(Price::new(Decimal::new(-100, 2)).is_err());
        assert!(Price::from_cents(-100).is_err());
    }

    #[test]
    fn test_price_ordering() {
        let price1 = Price::from_cents(100).unwrap();
        let price2 = Price::from_cents(200).unwrap();
        
        assert!(price1 < price2);
        assert!(price2 > price1);
        assert_eq!(price1.cmp(&price1), Ordering::Equal);
    }
}