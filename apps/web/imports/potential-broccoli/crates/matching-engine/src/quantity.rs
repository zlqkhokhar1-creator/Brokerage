//! Quantity handling with validation and arithmetic operations

use serde::{Deserialize, Serialize};
use std::ops::{Add, Sub, Mul, Div};

/// Represents a quantity of shares/units in an order
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct Quantity(u64);

impl Quantity {
    /// Creates a new quantity with validation
    /// 
    /// # Errors
    /// Returns error if quantity is zero
    pub fn new(value: u64) -> crate::Result<Self> {
        if value == 0 {
            return Err(crate::MatchingEngineError::InvalidQuantity(
                "Quantity must be greater than zero".to_string()
            ));
        }
        Ok(Self(value))
    }
    
    /// Creates a quantity that can be zero (for internal use in filled orders)
    pub(crate) fn new_allow_zero(value: u64) -> Self {
        Self(value)
    }
    
    /// Gets the underlying value
    pub fn value(&self) -> u64 {
        self.0
    }
    
    /// Creates quantity from a string
    pub fn from_str(s: &str) -> crate::Result<Self> {
        let value = s.parse::<u64>()
            .map_err(|e| crate::MatchingEngineError::InvalidQuantity(
                format!("Invalid quantity format '{}': {}", s, e)
            ))?;
        Self::new(value)
    }
    
    /// Checks if this quantity can be fully satisfied by another quantity
    pub fn can_be_satisfied_by(&self, available: &Quantity) -> bool {
        self.0 <= available.0
    }
    
    /// Returns the minimum of two quantities
    pub fn min(self, other: Self) -> Self {
        if self.0 <= other.0 {
            self
        } else {
            other
        }
    }
    
    /// Returns the maximum of two quantities
    pub fn max(self, other: Self) -> Self {
        if self.0 >= other.0 {
            self
        } else {
            other
        }
    }
}

impl std::fmt::Display for Quantity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Add for Quantity {
    type Output = Self;
    
    fn add(self, other: Self) -> Self {
        Self(self.0 + other.0)
    }
}

impl Sub for Quantity {
    type Output = crate::Result<Self>;
    
    fn sub(self, other: Self) -> Self::Output {
        if self.0 < other.0 {
            return Err(crate::MatchingEngineError::InsufficientQuantity {
                requested: other.0,
                available: self.0,
            });
        }
        let result = self.0 - other.0;
        if result == 0 {
            return Err(crate::MatchingEngineError::InvalidQuantity(
                "Resulting quantity would be zero".to_string()
            ));
        }
        Ok(Self(result))
    }
}

impl Mul<u64> for Quantity {
    type Output = Self;
    
    fn mul(self, scalar: u64) -> Self {
        Self(self.0 * scalar)
    }
}

impl Div<u64> for Quantity {
    type Output = crate::Result<Self>;
    
    fn div(self, divisor: u64) -> Self::Output {
        if divisor == 0 {
            return Err(crate::MatchingEngineError::InvalidQuantity(
                "Cannot divide by zero".to_string()
            ));
        }
        let result = self.0 / divisor;
        if result == 0 {
            return Err(crate::MatchingEngineError::InvalidQuantity(
                "Division would result in zero quantity".to_string()
            ));
        }
        Ok(Self(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quantity_creation() {
        let qty = Quantity::new(100).unwrap();
        assert_eq!(qty.value(), 100);
        
        assert!(Quantity::new(0).is_err());
    }

    #[test]
    fn test_quantity_arithmetic() {
        let qty1 = Quantity::new(100).unwrap();
        let qty2 = Quantity::new(50).unwrap();
        
        // Addition
        let sum = qty1 + qty2;
        assert_eq!(sum.value(), 150);
        
        // Subtraction
        let diff = qty1 - qty2;
        assert!(diff.is_ok());
        assert_eq!(diff.unwrap().value(), 50);
        
        // Multiplication
        let product = qty2 * 2;
        assert_eq!(product.value(), 100);
        
        // Division
        let quotient = qty1 / 2;
        assert!(quotient.is_ok());
        assert_eq!(quotient.unwrap().value(), 50);
    }

    #[test]
    fn test_quantity_validation() {
        let qty1 = Quantity::new(100).unwrap();
        let qty2 = Quantity::new(150).unwrap();
        
        // Insufficient quantity
        let result = qty1 - qty2;
        assert!(result.is_err());
        
        // Zero result
        let result = qty1 - qty1;
        assert!(result.is_err());
    }

    #[test]
    fn test_quantity_comparison() {
        let qty1 = Quantity::new(100).unwrap();
        let qty2 = Quantity::new(50).unwrap();
        let qty3 = Quantity::new(150).unwrap();
        
        assert!(qty2.can_be_satisfied_by(&qty1));
        assert!(!qty3.can_be_satisfied_by(&qty1));
        
        assert_eq!(qty1.min(qty2), qty2);
        assert_eq!(qty1.max(qty2), qty1);
    }
}