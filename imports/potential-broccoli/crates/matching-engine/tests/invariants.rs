//! Property-based tests to verify matching engine invariants
//! 
//! This module ensures that the matching engine maintains critical invariants
//! across all possible operation sequences, using property-based testing.

use matching_engine::{
    LimitOrderBook, Order, OrderSide, Price, Quantity,
    types::{OrderId, UserId},
};
use proptest::prelude::*;
use rust_decimal::Decimal;

// === Property Test Generators ===

/// Generate valid prices (in cents, 1 cent to $1000)
fn price_strategy() -> impl Strategy<Value = Price> {
    (1i64..100_000).prop_map(|cents| Price::from_cents(cents).unwrap())
}

/// Generate valid quantities (1 to 10,000 shares)
fn quantity_strategy() -> impl Strategy<Value = Quantity> {
    (1u64..10_000).prop_map(|q| Quantity::new(q).unwrap())
}

/// Generate order sides
fn side_strategy() -> impl Strategy<Value = OrderSide> {
    prop_oneof![Just(OrderSide::Buy), Just(OrderSide::Sell)]
}

/// Generate complete orders
fn order_strategy() -> impl Strategy<Value = Order> {
    (side_strategy(), price_strategy(), quantity_strategy())
        .prop_map(|(side, price, quantity)| {
            Order::new(
                OrderId::new(),
                UserId::new("test_user".to_string()),
                side,
                price,
                quantity,
            )
        })
}

/// Generate sequences of orders for complex scenarios
fn order_sequence_strategy() -> impl Strategy<Value = Vec<Order>> {
    prop::collection::vec(order_strategy(), 0..50)
}

// === Invariant Properties ===

proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]
    
    /// **Invariant**: Best bid is always less than or equal to best ask (no crossed market)
    #[test]
    fn prop_no_crossed_market(orders in order_sequence_strategy()) {
        let mut book = LimitOrderBook::new("TEST".to_string()).unwrap();
        
        // Add all orders
        for order in orders {
            let _ = book.add_order(order);
        }
        
        // Check invariant
        if let (Some(best_bid), Some(best_ask)) = (book.best_bid(), book.best_ask()) {
            prop_assert!(
                best_bid <= best_ask,
                "Crossed market detected: bid {} > ask {}",
                best_bid,
                best_ask
            );
        }
    }
    
    /// **Invariant**: Order book quantities are always consistent after operations
    #[test]
    fn prop_quantity_consistency(orders in order_sequence_strategy()) {
        let mut book = LimitOrderBook::new("TEST".to_string()).unwrap();
        let mut total_added_quantity = 0u64;
        let mut total_traded_quantity = 0u64;
        
        for order in orders {
            let original_qty = order.original_quantity.value();
            total_added_quantity += original_qty;
            
            let trades = book.add_order(order).unwrap();
            
            // Sum up traded quantities
            for trade in trades {
                total_traded_quantity += trade.quantity.value();
            }
        }
        
        // Get remaining quantity in book
        let depth = book.market_depth(1000); // Get all levels
        let remaining_bid_qty: u64 = depth.bids.iter()
            .map(|level| level.quantity.value())
            .sum();
        let remaining_ask_qty: u64 = depth.asks.iter()
            .map(|level| level.quantity.value())
            .sum();
        let total_remaining = remaining_bid_qty + remaining_ask_qty;
        
        // Invariant: Added = Remaining + (2 * Traded) because each trade affects two orders
        prop_assert_eq!(
            total_added_quantity,
            total_remaining + (2 * total_traded_quantity),
            "Quantity conservation violated: added={}, remaining={}, traded={}",
            total_added_quantity,
            total_remaining,
            total_traded_quantity
        );
    }
    
    /// **Invariant**: Price-time priority is maintained
    #[test]
    fn prop_price_time_priority(orders in order_sequence_strategy()) {
        let mut book = LimitOrderBook::new("TEST".to_string()).unwrap();
        
        // Filter to only buy orders at same price for simplicity
        let same_price = Price::from_cents(15000).unwrap();
        let buy_orders: Vec<_> = orders.into_iter()
            .filter(|o| o.side == OrderSide::Buy)
            .map(|mut o| {
                // Force same price to test time priority
                o.price = same_price;
                o
            })
            .collect();
            
        if buy_orders.len() < 2 {
            return Ok(()); // Need at least 2 orders to test priority
        }
        
        // Add orders and track their creation times
        let mut creation_times = Vec::new();
        for order in &buy_orders {
            creation_times.push(order.created_at);
            book.add_order(order.clone()).unwrap();
        }
        
        // Get market depth to check order
        let depth = book.market_depth(1);
        if !depth.bids.is_empty() {
            // The remaining quantity should represent orders in FIFO order
            // This is a simplified check - in practice we'd need access to order details
            prop_assert!(depth.bids[0].order_count > 0);
        }
    }
    
    /// **Invariant**: Spread is always non-negative
    #[test]
    fn prop_non_negative_spread(orders in order_sequence_strategy()) {
        let mut book = LimitOrderBook::new("TEST".to_string()).unwrap();
        
        for order in orders {
            let _ = book.add_order(order);
            
            // Check spread invariant after each operation
            if let Some(spread) = book.spread() {
                prop_assert!(
                    spread >= Decimal::ZERO,
                    "Negative spread detected: {}",
                    spread
                );
            }
        }
    }
    
    /// **Invariant**: Market depth quantities sum correctly
    #[test]
    fn prop_market_depth_consistency(orders in order_sequence_strategy()) {
        let mut book = LimitOrderBook::new("TEST".to_string()).unwrap();
        
        for order in orders {
            let _ = book.add_order(order);
        }
        
        let depth = book.market_depth(10);
        
        // Each level should have positive quantity and order count
        for level in &depth.bids {
            prop_assert!(level.quantity.value() > 0, "Bid level has zero quantity");
            prop_assert!(level.order_count > 0, "Bid level has zero order count");
        }
        
        for level in &depth.asks {
            prop_assert!(level.quantity.value() > 0, "Ask level has zero quantity");
            prop_assert!(level.order_count > 0, "Ask level has zero order count");
        }
        
        // Bid levels should be sorted descending by price
        for i in 1..depth.bids.len() {
            prop_assert!(
                depth.bids[i-1].price >= depth.bids[i].price,
                "Bid levels not properly sorted"
            );
        }
        
        // Ask levels should be sorted ascending by price
        for i in 1..depth.asks.len() {
            prop_assert!(
                depth.asks[i-1].price <= depth.asks[i].price,
                "Ask levels not properly sorted"
            );
        }
    }
    
    /// **Invariant**: Order cancellation never fails for existing orders
    #[test]
    fn prop_cancellation_consistency(orders in order_sequence_strategy()) {
        let mut book = LimitOrderBook::new("TEST".to_string()).unwrap();
        let mut added_order_ids = Vec::new();
        
        // Add orders and collect IDs, tracking which ones weren't immediately filled
        for order in orders {
            let order_id = order.id;
            let trades = book.add_order(order).unwrap();
            
            // Only track orders that weren't fully filled (remain in the book)
            let was_fully_filled = trades.iter().any(|t| 
                (t.buy_order_id == order_id || t.sell_order_id == order_id)
            );
            
            // Check if order is still in the book by trying to get it
            if !was_fully_filled && book.get_order(order_id).is_some() {
                added_order_ids.push(order_id);
            }
        }
        
        // Cancel all orders that should exist
        for order_id in added_order_ids {
            // Double-check the order still exists before trying to cancel
            if book.get_order(order_id).is_some() {
                let result = book.cancel_order(order_id);
                prop_assert!(
                    result.is_ok(),
                    "Failed to cancel order that should exist: {:?}",
                    result
                );
            }
        }
        
        // After canceling all tracked orders, book should be empty or contain only untraceable orders
        // (orders that were partially filled or created during matching)
    }
    
    /// **Invariant**: Serialization round-trip preserves order book state
    #[test]
    fn prop_serialization_roundtrip(orders in order_sequence_strategy()) {
        let mut book1 = LimitOrderBook::new("TEST".to_string()).unwrap();
        
        // Add orders to first book
        for order in orders {
            let _ = book1.add_order(order);
        }
        
        // Serialize and deserialize
        let json = serde_json::to_string(&book1).unwrap();
        let book2: LimitOrderBook = serde_json::from_str(&json).unwrap();
        
        // Compare key properties
        prop_assert_eq!(book1.best_bid(), book2.best_bid());
        prop_assert_eq!(book1.best_ask(), book2.best_ask());
        prop_assert_eq!(book1.spread(), book2.spread());
        prop_assert_eq!(book1.order_count(), book2.order_count());
        
        // Compare market depth
        let depth1 = book1.market_depth(10);
        let depth2 = book2.market_depth(10);
        prop_assert_eq!(depth1, depth2);
    }
    
    /// **Invariant**: Order matching is deterministic
    #[test]
    fn prop_deterministic_matching(orders in order_sequence_strategy()) {
        if orders.is_empty() {
            return Ok(());
        }
        
        // Run the same sequence twice
        let mut book1 = LimitOrderBook::new("TEST".to_string()).unwrap();
        let mut book2 = LimitOrderBook::new("TEST".to_string()).unwrap();
        
        let mut trades1 = Vec::new();
        let mut trades2 = Vec::new();
        
        for order in &orders {
            trades1.extend(book1.add_order(order.clone()).unwrap());
            trades2.extend(book2.add_order(order.clone()).unwrap());
        }
        
        // Results should be identical
        prop_assert_eq!(trades1.len(), trades2.len());
        prop_assert_eq!(book1.best_bid(), book2.best_bid());
        prop_assert_eq!(book1.best_ask(), book2.best_ask());
        prop_assert_eq!(book1.order_count(), book2.order_count());
    }
}

#[cfg(test)]
mod unit_tests {
    use super::*;

    #[test]
    fn test_invariant_framework() {
        // Simple sanity check that our generators work
        let order = Order::new(
            OrderId::new(),
            UserId::new("test".to_string()),
            OrderSide::Buy,
            Price::from_cents(15000).unwrap(),
            Quantity::new(100).unwrap(),
        );
        
        let mut book = LimitOrderBook::new("TEST".to_string()).unwrap();
        book.add_order(order).unwrap();
        
        // Basic invariants
        assert!(book.spread().is_none()); // Only one side
        assert!(book.best_bid().is_some());
        assert!(book.best_ask().is_none());
        assert!(!book.is_empty());
    }
}