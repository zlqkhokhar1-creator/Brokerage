//! Order representation and status management

use crate::{Price, Quantity, types::{OrderId, UserId}};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Order side (Buy or Sell)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OrderSide {
    Buy,
    Sell,
}

impl std::fmt::Display for OrderSide {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OrderSide::Buy => write!(f, "BUY"),
            OrderSide::Sell => write!(f, "SELL"),
        }
    }
}

/// Order status tracking
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OrderStatus {
    /// Order is active and can be matched
    Active,
    /// Order has been partially filled
    PartiallyFilled,
    /// Order has been completely filled
    Filled,
    /// Order has been cancelled
    Cancelled,
}

impl std::fmt::Display for OrderStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OrderStatus::Active => write!(f, "ACTIVE"),
            OrderStatus::PartiallyFilled => write!(f, "PARTIALLY_FILLED"),
            OrderStatus::Filled => write!(f, "FILLED"),
            OrderStatus::Cancelled => write!(f, "CANCELLED"),
        }
    }
}

/// Represents a limit order in the order book
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Order {
    /// Unique order identifier
    pub id: OrderId,
    /// User who placed the order
    pub user_id: UserId,
    /// Buy or sell side
    pub side: OrderSide,
    /// Order price
    pub price: Price,
    /// Original quantity
    pub original_quantity: Quantity,
    /// Remaining quantity (updated as order gets filled)
    pub remaining_quantity: Quantity,
    /// Current order status
    pub status: OrderStatus,
    /// Timestamp when order was created
    pub created_at: DateTime<Utc>,
    /// Timestamp when order was last updated
    pub updated_at: DateTime<Utc>,
}

impl Order {
    /// Creates a new order
    pub fn new(
        id: OrderId,
        user_id: UserId,
        side: OrderSide,
        price: Price,
        quantity: Quantity,
    ) -> Self {
        let now = Utc::now();
        Self {
            id,
            user_id,
            side,
            price,
            original_quantity: quantity,
            remaining_quantity: quantity,
            status: OrderStatus::Active,
            created_at: now,
            updated_at: now,
        }
    }
    
    /// Checks if the order can be matched against another order
    pub fn can_match(&self, other: &Order) -> bool {
        // Orders must be on opposite sides
        if self.side == other.side {
            return false;
        }
        
        // Both orders must be active or partially filled
        if !matches!(self.status, OrderStatus::Active | OrderStatus::PartiallyFilled) ||
           !matches!(other.status, OrderStatus::Active | OrderStatus::PartiallyFilled) {
            return false;
        }
        
        // Price compatibility check
        match self.side {
            OrderSide::Buy => self.price >= other.price,  // Buy price >= Sell price
            OrderSide::Sell => self.price <= other.price, // Sell price <= Buy price
        }
    }
    
    /// Fills a portion of the order
    pub fn fill(&mut self, quantity: Quantity) -> crate::Result<()> {
        if !quantity.can_be_satisfied_by(&self.remaining_quantity) {
            return Err(crate::MatchingEngineError::InsufficientQuantity {
                requested: quantity.value(),
                available: self.remaining_quantity.value(),
            });
        }
        
        let new_remaining = self.remaining_quantity.value() - quantity.value();
        self.remaining_quantity = Quantity::new_allow_zero(new_remaining);
        self.updated_at = Utc::now();
        
        // Update status based on remaining quantity
        if self.remaining_quantity.value() == 0 {
            self.status = OrderStatus::Filled;
        } else {
            self.status = OrderStatus::PartiallyFilled;
        }
        
        Ok(())
    }
    
    /// Cancels the order
    pub fn cancel(&mut self) {
        self.status = OrderStatus::Cancelled;
        self.updated_at = Utc::now();
    }
    
    /// Checks if the order is active (can participate in matching)
    pub fn is_active(&self) -> bool {
        matches!(self.status, OrderStatus::Active | OrderStatus::PartiallyFilled)
    }
    
    /// Checks if the order is completely filled
    pub fn is_filled(&self) -> bool {
        self.status == OrderStatus::Filled
    }
    
    /// Gets the filled quantity
    pub fn filled_quantity(&self) -> Quantity {
        let filled_amount = self.original_quantity.value() - self.remaining_quantity.value();
        Quantity::new_allow_zero(filled_amount)
    }
}

impl PartialOrd for Order {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Order {
    /// Orders are sorted by price (and then by creation time for same prices)
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        use std::cmp::Ordering;
        
        // Primary sort: by price
        let price_cmp = match self.side {
            // For buy orders, higher prices have priority (descending)
            OrderSide::Buy => other.price.cmp(&self.price),
            // For sell orders, lower prices have priority (ascending)
            OrderSide::Sell => self.price.cmp(&other.price),
        };
        
        if price_cmp != Ordering::Equal {
            return price_cmp;
        }
        
        // Secondary sort: by creation time (FIFO - first in, first out)
        self.created_at.cmp(&other.created_at)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::OrderId;

    fn create_test_order(side: OrderSide, price_cents: i64, quantity: u64) -> Order {
        Order::new(
            OrderId::new(),
            UserId::new("test_user".to_string()),
            side,
            Price::from_cents(price_cents).unwrap(),
            Quantity::new(quantity).unwrap(),
        )
    }

    #[test]
    fn test_order_creation() {
        let order = create_test_order(OrderSide::Buy, 15000, 100);
        
        assert_eq!(order.side, OrderSide::Buy);
        assert_eq!(order.price.as_cents(), 15000);
        assert_eq!(order.original_quantity.value(), 100);
        assert_eq!(order.remaining_quantity.value(), 100);
        assert_eq!(order.status, OrderStatus::Active);
    }

    #[test]
    fn test_order_matching() {
        let buy_order = create_test_order(OrderSide::Buy, 15000, 100);
        let sell_order = create_test_order(OrderSide::Sell, 15000, 50);
        let higher_sell = create_test_order(OrderSide::Sell, 15100, 50);
        
        assert!(buy_order.can_match(&sell_order));
        assert!(!buy_order.can_match(&higher_sell)); // Buy at 150, sell at 151 - no match
        assert!(!buy_order.can_match(&buy_order)); // Same side - no match
    }

    #[test]
    fn test_order_filling() {
        let mut order = create_test_order(OrderSide::Buy, 15000, 100);
        
        // Partial fill
        assert!(order.fill(Quantity::new(30).unwrap()).is_ok());
        assert_eq!(order.remaining_quantity.value(), 70);
        assert_eq!(order.status, OrderStatus::PartiallyFilled);
        
        // Complete the fill
        assert!(order.fill(Quantity::new(70).unwrap()).is_ok());
        assert_eq!(order.remaining_quantity.value(), 0);
        assert_eq!(order.status, OrderStatus::Filled);
        
        // Try to overfill
        assert!(order.fill(Quantity::new(1).unwrap()).is_err());
    }

    #[test]
    fn test_order_priority() {
        let order1 = create_test_order(OrderSide::Buy, 15000, 100); // $150.00
        let order2 = create_test_order(OrderSide::Buy, 15100, 100); // $151.00 (higher)
        let order3 = create_test_order(OrderSide::Sell, 14900, 100); // $149.00
        let order4 = create_test_order(OrderSide::Sell, 15000, 100); // $150.00 (higher)
        
        // For buy orders, higher prices should come first
        assert!(order2 < order1); // $151 < $150 in buy priority
        
        // For sell orders, lower prices should come first  
        assert!(order3 < order4); // $149 < $150 in sell priority
    }
}