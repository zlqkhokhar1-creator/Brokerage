//! Integration tests for the matching engine
//! 
//! Tests realistic trading scenarios and edge cases

use matching_engine::{
    LimitOrderBook, Order, OrderSide, OrderStatus, Price, Quantity,
    types::{OrderId, UserId},
};
use rust_decimal::Decimal;

fn create_order(side: OrderSide, price_cents: i64, quantity: u64, user: &str) -> Order {
    Order::new(
        OrderId::new(),
        UserId::new(user.to_string()),
        side,
        Price::from_cents(price_cents).unwrap(),
        Quantity::new(quantity).unwrap(),
    )
}

#[test]
fn test_basic_trading_scenario() {
    let mut book = LimitOrderBook::new("AAPL".to_string()).unwrap();
    
    // Market maker adds liquidity
    let bid1 = create_order(OrderSide::Buy, 14995, 500, "mm1");   // $149.95
    let bid2 = create_order(OrderSide::Buy, 14990, 300, "mm1");   // $149.90
    let ask1 = create_order(OrderSide::Sell, 15005, 400, "mm2");  // $150.05
    let ask2 = create_order(OrderSide::Sell, 15010, 600, "mm2");  // $150.10
    
    book.add_order(bid1).unwrap();
    book.add_order(bid2).unwrap(); 
    book.add_order(ask1).unwrap();
    book.add_order(ask2).unwrap();
    
    // Verify market structure
    assert_eq!(book.best_bid().unwrap().as_cents(), 14995);
    assert_eq!(book.best_ask().unwrap().as_cents(), 15005);
    assert_eq!(book.spread().unwrap(), Decimal::new(10, 2)); // $0.10 spread
    
    // Retail trader crosses the spread
    let market_buy = create_order(OrderSide::Buy, 15010, 350, "trader1");
    let trades = book.add_order(market_buy).unwrap();
    
    assert_eq!(trades.len(), 1);
    assert_eq!(trades[0].price.as_cents(), 15005);
    assert_eq!(trades[0].quantity.value(), 350);
    
    // Check remaining liquidity
    assert_eq!(book.best_ask_quantity().unwrap().value(), 50); // 400 - 350 = 50
}

#[test]
fn test_partial_fill_scenario() {
    let mut book = LimitOrderBook::new("MSFT".to_string()).unwrap();
    
    // Add liquidity in small chunks
    let sell1 = create_order(OrderSide::Sell, 30000, 100, "seller1");
    let sell2 = create_order(OrderSide::Sell, 30000, 150, "seller2"); // Same price
    let sell3 = create_order(OrderSide::Sell, 30005, 200, "seller3");
    
    book.add_order(sell1).unwrap();
    book.add_order(sell2).unwrap();
    book.add_order(sell3).unwrap();
    
    // Large buy order that will match multiple sells
    let big_buy = create_order(OrderSide::Buy, 30010, 300, "buyer1");
    let trades = book.add_order(big_buy).unwrap();
    
    // Should match against all sell orders
    assert_eq!(trades.len(), 3); // Should match all 3 sell orders
    assert_eq!(trades[0].quantity.value(), 100); // First sell order
    assert_eq!(trades[1].quantity.value(), 150); // Second sell order
    assert_eq!(trades[2].quantity.value(), 50);  // Part of third sell order (300 total - 100 - 150 = 50)
    
    // Check remaining sell quantity at 30005 level
    assert_eq!(book.best_ask().unwrap().as_cents(), 30005);
    assert_eq!(book.best_ask_quantity().unwrap().value(), 150); // 200 - 50 = 150
}

#[test]
fn test_price_time_priority() {
    let mut book = LimitOrderBook::new("GOOGL".to_string()).unwrap();
    
    // Add three buy orders at same price but different times
    let buy1 = create_order(OrderSide::Buy, 250000, 100, "trader1");
    let buy1_id = buy1.id;
    book.add_order(buy1).unwrap();
    
    std::thread::sleep(std::time::Duration::from_millis(1)); // Ensure different timestamps
    
    let buy2 = create_order(OrderSide::Buy, 250000, 200, "trader2");
    let _buy2_id = buy2.id;
    book.add_order(buy2).unwrap();
    
    std::thread::sleep(std::time::Duration::from_millis(1));
    
    let buy3 = create_order(OrderSide::Buy, 250000, 150, "trader3");
    let _buy3_id = buy3.id;
    book.add_order(buy3).unwrap();
    
    // Add sell order that matches first order exactly
    let sell1 = create_order(OrderSide::Sell, 250000, 100, "seller1");
    let trades = book.add_order(sell1).unwrap();
    
    assert_eq!(trades.len(), 1);
    assert_eq!(trades[0].buy_order_id, buy1_id); // First order should match first (FIFO)
    assert_eq!(trades[0].quantity.value(), 100);
    
    // Verify remaining orders
    let depth = book.market_depth(1);
    assert_eq!(depth.bids[0].quantity.value(), 350); // 200 + 150 remaining
    assert_eq!(depth.bids[0].order_count, 2);
}

#[test]
fn test_order_cancellation_and_modification() {
    let mut book = LimitOrderBook::new("TSLA".to_string()).unwrap();
    
    // Add orders
    let buy1 = create_order(OrderSide::Buy, 80000, 100, "trader1");
    let buy1_id = buy1.id;
    let buy2 = create_order(OrderSide::Buy, 79500, 200, "trader2");
    let sell1 = create_order(OrderSide::Sell, 80500, 150, "trader3");
    let sell1_id = sell1.id;
    
    book.add_order(buy1).unwrap();
    book.add_order(buy2).unwrap();
    book.add_order(sell1).unwrap();
    
    assert_eq!(book.order_count(), 3);
    
    // Cancel the best bid
    let cancelled_order = book.cancel_order(buy1_id).unwrap();
    assert_eq!(cancelled_order.status, OrderStatus::Cancelled);
    assert_eq!(book.order_count(), 2);
    assert_eq!(book.best_bid().unwrap().as_cents(), 79500); // Second order now best
    
    // Try to cancel again (should fail)
    assert!(book.cancel_order(buy1_id).is_err());
    
    // Cancel sell order
    book.cancel_order(sell1_id).unwrap();
    assert!(book.best_ask().is_none());
    assert_eq!(book.order_count(), 1);
}

#[test]
fn test_market_depth_aggregation() {
    let mut book = LimitOrderBook::new("AMZN".to_string()).unwrap();
    
    // Add multiple orders at same price levels
    book.add_order(create_order(OrderSide::Buy, 100000, 100, "trader1")).unwrap();
    book.add_order(create_order(OrderSide::Buy, 100000, 200, "trader2")).unwrap();
    book.add_order(create_order(OrderSide::Buy, 100000, 150, "trader3")).unwrap();
    book.add_order(create_order(OrderSide::Buy, 99500, 300, "trader4")).unwrap();
    book.add_order(create_order(OrderSide::Buy, 99000, 250, "trader5")).unwrap();
    
    book.add_order(create_order(OrderSide::Sell, 100500, 180, "seller1")).unwrap();
    book.add_order(create_order(OrderSide::Sell, 100500, 220, "seller2")).unwrap();
    book.add_order(create_order(OrderSide::Sell, 101000, 300, "seller3")).unwrap();
    
    let depth = book.market_depth(3);
    
    // Check bid aggregation
    assert_eq!(depth.bids.len(), 3);
    assert_eq!(depth.bids[0].price.as_cents(), 100000);
    assert_eq!(depth.bids[0].quantity.value(), 450); // 100 + 200 + 150
    assert_eq!(depth.bids[0].order_count, 3);
    
    assert_eq!(depth.bids[1].price.as_cents(), 99500);
    assert_eq!(depth.bids[1].quantity.value(), 300);
    assert_eq!(depth.bids[1].order_count, 1);
    
    // Check ask aggregation
    assert_eq!(depth.asks.len(), 2);
    assert_eq!(depth.asks[0].price.as_cents(), 100500);
    assert_eq!(depth.asks[0].quantity.value(), 400); // 180 + 220
    assert_eq!(depth.asks[0].order_count, 2);
    
    // Check spread
    assert_eq!(depth.spread.unwrap(), Decimal::new(500, 2)); // $5.00
}

#[test]
fn test_high_frequency_scenario() {
    let mut book = LimitOrderBook::new("SPY".to_string()).unwrap();
    
    // Simulate high-frequency trading scenario
    for i in 0..1000 {
        let price_offset = (i % 20) as i64 - 10; // Price variation
        let quantity = 100 + (i % 500) as u64;
        
        match i % 3 {
            0 => {
                // Add buy order
                let order = create_order(
                    OrderSide::Buy, 
                    40000 + price_offset, 
                    quantity, 
                    &format!("hft_buyer_{}", i)
                );
                book.add_order(order).unwrap();
            },
            1 => {
                // Add sell order  
                let order = create_order(
                    OrderSide::Sell,
                    40010 + price_offset,
                    quantity,
                    &format!("hft_seller_{}", i)
                );
                book.add_order(order).unwrap();
            },
            2 => {
                // Query market data (typical HFT pattern)
                let _best_bid = book.best_bid();
                let _best_ask = book.best_ask();
                let _spread = book.spread();
                let _depth = book.market_depth(5);
            },
            _ => unreachable!(),
        }
        
        // Occasionally cancel orders if book gets too large
        if book.order_count() > 100 {
            // In real scenario, we'd track order IDs to cancel
            // For test, just verify queries still work under load
            assert!(book.best_bid().is_some() || book.best_ask().is_some());
        }
    }
    
    // Verify book is still functional
    if let (Some(bid), Some(ask)) = (book.best_bid(), book.best_ask()) {
        assert!(bid <= ask, "Market should not be crossed after HFT activity");
    }
}

#[test]
fn test_edge_case_scenarios() {
    let mut book = LimitOrderBook::new("EDGE".to_string()).unwrap();
    
    // Test 1: Single share orders
    let tiny_buy = create_order(OrderSide::Buy, 10000, 1, "tiny_trader");
    let tiny_sell = create_order(OrderSide::Sell, 10000, 1, "tiny_seller");
    
    book.add_order(tiny_buy).unwrap();
    let trades = book.add_order(tiny_sell).unwrap();
    
    assert_eq!(trades.len(), 1);
    assert_eq!(trades[0].quantity.value(), 1);
    assert!(book.is_empty());
    
    // Test 2: Very large orders
    let large_buy = create_order(OrderSide::Buy, 10000, 1_000_000, "whale");
    book.add_order(large_buy).unwrap();
    assert_eq!(book.best_bid_quantity().unwrap().value(), 1_000_000);
    
    // Test 3: Extreme price levels
    let expensive = create_order(OrderSide::Sell, 999_999, 100, "expensive");
    let cheap = create_order(OrderSide::Buy, 1, 100, "cheap");
    
    book.add_order(expensive).unwrap();
    book.add_order(cheap).unwrap();
    
    // Should have massive spread
    let spread = book.spread().unwrap();
    // Spread should be 9999.99 - 0.01 = 9999.98
    let expected_min_spread = Decimal::new(99999, 2) - Decimal::new(1, 2); // 999.99 - 0.01 
    assert!(spread >= expected_min_spread, "Expected spread >= {}, got {}", expected_min_spread, spread);
}

#[test]
fn test_serialization_with_complex_state() {
    let mut book = LimitOrderBook::new("COMPLEX".to_string()).unwrap();
    
    // Create complex order book state
    for i in 0..50 {
        let buy_order = create_order(OrderSide::Buy, 50000 - i * 10, 100 + (i as u64), &format!("buyer_{}", i));
        let sell_order = create_order(OrderSide::Sell, 50100 + i * 10, 100 + (i as u64), &format!("seller_{}", i));
        book.add_order(buy_order).unwrap();
        book.add_order(sell_order).unwrap();
    }
    
    // Execute some trades
    let crossing_order = create_order(OrderSide::Buy, 50150, 500, "crosser");
    let trades = book.add_order(crossing_order).unwrap();
    assert!(!trades.is_empty());
    
    // Serialize and deserialize
    let json = serde_json::to_string(&book).unwrap();
    let deserialized_book: LimitOrderBook = serde_json::from_str(&json).unwrap();
    
    // Verify state is preserved
    assert_eq!(book.symbol().as_str(), deserialized_book.symbol().as_str());
    assert_eq!(book.best_bid(), deserialized_book.best_bid());
    assert_eq!(book.best_ask(), deserialized_book.best_ask());
    assert_eq!(book.spread(), deserialized_book.spread());
    assert_eq!(book.order_count(), deserialized_book.order_count());
    
    let original_depth = book.market_depth(10);
    let deserialized_depth = deserialized_book.market_depth(10);
    assert_eq!(original_depth, deserialized_depth);
    
    // Verify both books continue to work identically
    let test_order = create_order(OrderSide::Sell, 49900, 100, "test");
    let trades1 = book.add_order(test_order.clone()).unwrap();
    
    // Reset book state by deserializing again
    let mut book2: LimitOrderBook = serde_json::from_str(&json).unwrap();
    let trades2 = book2.add_order(test_order).unwrap();
    
    assert_eq!(trades1.len(), trades2.len());
}