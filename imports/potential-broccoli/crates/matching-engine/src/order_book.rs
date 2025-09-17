//! Core limit order book implementation with high-performance operations

use crate::{
    Order, OrderSide, Price, Quantity, 
    types::{OrderId, Symbol}, MatchingEngineError
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};
use rust_decimal::Decimal;

/// Level II market data representation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MarketLevel {
    pub price: Price,
    pub quantity: Quantity,
    pub order_count: usize,
}

/// Market depth information
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MarketDepth {
    pub bids: Vec<MarketLevel>,
    pub asks: Vec<MarketLevel>,
    pub spread: Option<Decimal>,
}

/// Trade execution result
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Trade {
    pub buy_order_id: OrderId,
    pub sell_order_id: OrderId,
    pub price: Price,
    pub quantity: Quantity,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// High-performance limit order book implementation
/// 
/// Uses BTreeMap for O(log n) price-time priority and HashMap for O(1) order lookup.
/// Maintains market data invariants and provides comprehensive query capabilities.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimitOrderBook {
    /// Trading symbol for this order book
    symbol: Symbol,
    
    /// Buy orders sorted by price (highest first) then time (FIFO)
    /// BTreeMap<Price, Vec<Order>> allows multiple orders at same price level
    bids: BTreeMap<Price, Vec<Order>>,
    
    /// Sell orders sorted by price (lowest first) then time (FIFO)  
    asks: BTreeMap<Price, Vec<Order>>,
    
    /// Fast order lookup by ID for cancellations and modifications
    orders: HashMap<OrderId, (OrderSide, Price)>,
    
    /// Recent trades for audit trail
    recent_trades: Vec<Trade>,
    
    /// Maximum number of recent trades to keep
    max_recent_trades: usize,
}

impl LimitOrderBook {
    /// Creates a new empty order book for a symbol
    pub fn new(symbol: String) -> crate::Result<Self> {
        Ok(Self {
            symbol: Symbol::new(symbol)?,
            bids: BTreeMap::new(),
            asks: BTreeMap::new(),
            orders: HashMap::new(),
            recent_trades: Vec::new(),
            max_recent_trades: 1000,
        })
    }
    
    /// Gets the trading symbol for this order book
    pub fn symbol(&self) -> &Symbol {
        &self.symbol
    }
    
    // === Phase 1b Public API Enhancements ===
    
    /// Gets the best bid price (highest buy price)
    /// 
    /// Returns `None` if there are no active bid orders.
    pub fn best_bid(&self) -> Option<Price> {
        self.bids.keys().next_back().copied()
    }
    
    /// Gets the best ask price (lowest sell price)
    /// 
    /// Returns `None` if there are no active ask orders.
    pub fn best_ask(&self) -> Option<Price> {
        self.asks.keys().next().copied()
    }
    
    /// Calculates the bid-ask spread
    /// 
    /// Returns `None` if either best bid or best ask is not available.
    pub fn spread(&self) -> Option<Decimal> {
        match (self.best_bid(), self.best_ask()) {
            (Some(bid), Some(ask)) => Some(ask.value() - bid.value()),
            _ => None,
        }
    }
    
    /// Gets market depth information up to specified number of levels
    /// 
    /// # Arguments
    /// * `levels` - Maximum number of price levels to include on each side
    pub fn market_depth(&self, levels: usize) -> MarketDepth {
        let bids = self.bids
            .iter()
            .rev() // Highest prices first for bids
            .take(levels)
            .map(|(price, orders)| {
                let total_quantity = orders.iter()
                    .filter(|order| order.is_active())
                    .map(|order| order.remaining_quantity.value())
                    .sum::<u64>();
                
                let order_count = orders.iter()
                    .filter(|order| order.is_active())
                    .count();
                
                MarketLevel {
                    price: *price,
                    quantity: if total_quantity > 0 { 
                        Quantity::new(total_quantity).unwrap() 
                    } else { 
                        Quantity::new_allow_zero(0) 
                    },
                    order_count,
                }
            })
            .filter(|level| level.quantity.value() > 0)
            .collect();
            
        let asks = self.asks
            .iter()
            .take(levels) // Lowest prices first for asks
            .map(|(price, orders)| {
                let total_quantity = orders.iter()
                    .filter(|order| order.is_active())
                    .map(|order| order.remaining_quantity.value())
                    .sum::<u64>();
                
                let order_count = orders.iter()
                    .filter(|order| order.is_active())
                    .count();
                
                MarketLevel {
                    price: *price,
                    quantity: if total_quantity > 0 { 
                        Quantity::new(total_quantity).unwrap() 
                    } else { 
                        Quantity::new_allow_zero(0) 
                    },
                    order_count,
                }
            })
            .filter(|level| level.quantity.value() > 0)
            .collect();
            
        MarketDepth {
            bids,
            asks,
            spread: self.spread(),
        }
    }
    
    /// Gets the total quantity available at the best bid
    pub fn best_bid_quantity(&self) -> Option<Quantity> {
        self.best_bid().and_then(|price| {
            self.bids.get(&price).map(|orders| {
                let total = orders.iter()
                    .filter(|order| order.is_active())
                    .map(|order| order.remaining_quantity.value())
                    .sum::<u64>();
                if total > 0 {
                    Quantity::new(total).unwrap()
                } else {
                    Quantity::new_allow_zero(0)
                }
            })
        })
    }
    
    /// Gets the total quantity available at the best ask
    pub fn best_ask_quantity(&self) -> Option<Quantity> {
        self.best_ask().and_then(|price| {
            self.asks.get(&price).map(|orders| {
                let total = orders.iter()
                    .filter(|order| order.is_active())
                    .map(|order| order.remaining_quantity.value())
                    .sum::<u64>();
                if total > 0 {
                    Quantity::new(total).unwrap()
                } else {
                    Quantity::new_allow_zero(0)
                }
            })
        })
    }
    
    // === Core Order Book Operations ===
    
    /// Adds a new order to the book and attempts to match it
    /// 
    /// Returns a vector of trades that were executed.
    pub fn add_order(&mut self, mut order: Order) -> crate::Result<Vec<Trade>> {
        let mut trades = Vec::new();
        
        // Attempt to match the order
        trades.extend(self.match_order(&mut order)?);
        
        // If order has remaining quantity, add to book
        if order.remaining_quantity.value() > 0 && order.is_active() {
            self.insert_order(order)?;
        }
        
        Ok(trades)
    }
    
    /// Cancels an order by ID
    pub fn cancel_order(&mut self, order_id: OrderId) -> crate::Result<Order> {
        let (side, price) = self.orders.remove(&order_id)
            .ok_or_else(|| MatchingEngineError::OrderNotFound(order_id.to_string()))?;
            
        let orders = match side {
            OrderSide::Buy => self.bids.get_mut(&price),
            OrderSide::Sell => self.asks.get_mut(&price),
        }.ok_or_else(|| MatchingEngineError::InvariantViolation(
            "Order exists in lookup but not in book".to_string()
        ))?;
        
        let pos = orders.iter().position(|o| o.id == order_id)
            .ok_or_else(|| MatchingEngineError::InvariantViolation(
                "Order exists in lookup but not at price level".to_string()
            ))?;
            
        let mut order = orders.remove(pos);
        order.cancel();
        
        // Remove empty price level
        if orders.is_empty() {
            match side {
                OrderSide::Buy => self.bids.remove(&price),
                OrderSide::Sell => self.asks.remove(&price),
            };
        }
        
        Ok(order)
    }
    
    /// Gets an order by ID (for status queries)
    pub fn get_order(&self, order_id: OrderId) -> Option<&Order> {
        let (side, price) = self.orders.get(&order_id)?;
        let orders = match side {
            OrderSide::Buy => self.bids.get(price)?,
            OrderSide::Sell => self.asks.get(price)?,
        };
        orders.iter().find(|o| o.id == order_id)
    }
    
    /// Gets recent trades
    pub fn recent_trades(&self) -> &[Trade] {
        &self.recent_trades
    }
    
    /// Checks if the order book is empty
    pub fn is_empty(&self) -> bool {
        self.bids.is_empty() && self.asks.is_empty()
    }
    
    /// Gets total number of active orders
    pub fn order_count(&self) -> usize {
        self.orders.len()
    }
    
    // === Private Implementation ===
    
    fn insert_order(&mut self, order: Order) -> crate::Result<()> {
        let side = order.side;
        let price = order.price;
        let order_id = order.id;
        
        // Add to order lookup
        self.orders.insert(order_id, (side, price));
        
        // Add to appropriate side of the book
        match side {
            OrderSide::Buy => {
                self.bids.entry(price).or_insert_with(Vec::new).push(order);
            },
            OrderSide::Sell => {
                self.asks.entry(price).or_insert_with(Vec::new).push(order);
            },
        }
        
        Ok(())
    }
    
    fn match_order(&mut self, incoming_order: &mut Order) -> crate::Result<Vec<Trade>> {
        let mut trades = Vec::new();
        
        loop {
            // Find the best opposing order (must re-evaluate each time as orders may be removed)
            let best_opposing_price = match incoming_order.side {
                OrderSide::Buy => {
                    // For buy orders, match against lowest sell price
                    self.asks.keys().next().copied()
                },
                OrderSide::Sell => {
                    // For sell orders, match against highest buy price  
                    self.bids.keys().next_back().copied()
                },
            };
            
            let best_price = match best_opposing_price {
                Some(price) => price,
                None => break, // No opposing orders
            };
            
            // Check if incoming order can match at this price level
            let can_match_at_price = match incoming_order.side {
                OrderSide::Buy => incoming_order.price >= best_price,
                OrderSide::Sell => incoming_order.price <= best_price,
            };
            
            if !can_match_at_price {
                break; // Price levels don't cross
            }
            
            // Get the first order at the best price level (FIFO within price level)
            let opposing_order = match incoming_order.side {
                OrderSide::Buy => self.asks.get_mut(&best_price)
                    .and_then(|orders| orders.first_mut()),
                OrderSide::Sell => self.bids.get_mut(&best_price)
                    .and_then(|orders| orders.first_mut()),
            };
            
            let opposing_order = match opposing_order {
                Some(order) if order.is_active() => order,
                _ => break, // No active orders at this level
            };
            
            // Execute the trade
            let trade_quantity = incoming_order.remaining_quantity.min(opposing_order.remaining_quantity);
            let trade_price = opposing_order.price; // Use price of resting order
            
            // Save order info before modification  
            let opposing_order_id = opposing_order.id;
            let opposing_side = opposing_order.side;
            
            // Create trade record
            let trade = Trade {
                buy_order_id: match incoming_order.side {
                    OrderSide::Buy => incoming_order.id,
                    OrderSide::Sell => opposing_order.id,
                },
                sell_order_id: match incoming_order.side {
                    OrderSide::Sell => incoming_order.id,
                    OrderSide::Buy => opposing_order.id,
                },
                price: trade_price,
                quantity: trade_quantity,
                timestamp: chrono::Utc::now(),
            };
            
            // Update order quantities
            incoming_order.fill(trade_quantity)?;
            opposing_order.fill(trade_quantity)?;
            
            trades.push(trade);
            
            // Remove filled order if completely filled
            if opposing_order.is_filled() {
                self.remove_filled_order(opposing_order_id, opposing_side, best_price)?;
            }
            
            // Stop if incoming order is fully filled
            if incoming_order.is_filled() {
                break;
            }
        }
        
        // Add trades to recent history
        self.recent_trades.extend(trades.iter().cloned());
        if self.recent_trades.len() > self.max_recent_trades {
            self.recent_trades.drain(0..self.recent_trades.len() - self.max_recent_trades);
        }
        
        Ok(trades)
    }
    
    fn remove_filled_order(&mut self, order_id: OrderId, side: OrderSide, price: Price) -> crate::Result<()> {
        // Remove from lookup
        self.orders.remove(&order_id);
        
        // Remove from book
        let orders = match side {
            OrderSide::Buy => self.bids.get_mut(&price),
            OrderSide::Sell => self.asks.get_mut(&price),
        }.ok_or_else(|| MatchingEngineError::InvariantViolation(
            "Filled order not found in book".to_string()
        ))?;
        
        orders.retain(|o| o.id != order_id);
        
        // Remove empty price level
        if orders.is_empty() {
            match side {
                OrderSide::Buy => self.bids.remove(&price),
                OrderSide::Sell => self.asks.remove(&price),
            };
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{OrderId, UserId};
    use crate::OrderStatus;
    use rust_decimal::Decimal;

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
    fn test_order_book_creation() {
        let book = LimitOrderBook::new("AAPL".to_string()).unwrap();
        assert_eq!(book.symbol().as_str(), "AAPL");
        assert!(book.is_empty());
        assert_eq!(book.order_count(), 0);
    }

    #[test]
    fn test_best_bid_ask() {
        let mut book = LimitOrderBook::new("AAPL".to_string()).unwrap();
        
        // Initially empty
        assert_eq!(book.best_bid(), None);
        assert_eq!(book.best_ask(), None);
        assert_eq!(book.spread(), None);
        
        // Add some orders
        let buy1 = create_test_order(OrderSide::Buy, 15000, 100);  // $150.00
        let buy2 = create_test_order(OrderSide::Buy, 14950, 200);  // $149.50
        let sell1 = create_test_order(OrderSide::Sell, 15050, 100); // $150.50
        let sell2 = create_test_order(OrderSide::Sell, 15100, 150); // $151.00
        
        book.add_order(buy1).unwrap();
        book.add_order(buy2).unwrap();
        book.add_order(sell1).unwrap();
        book.add_order(sell2).unwrap();
        
        // Check best prices
        assert_eq!(book.best_bid().unwrap().as_cents(), 15000); // Highest buy
        assert_eq!(book.best_ask().unwrap().as_cents(), 15050); // Lowest sell
        
        // Check spread
        let spread = book.spread().unwrap();
        assert_eq!(spread, Decimal::new(50, 2)); // $0.50 spread
    }

    #[test]
    fn test_market_depth() {
        let mut book = LimitOrderBook::new("AAPL".to_string()).unwrap();
        
        // Add multiple orders at different levels
        book.add_order(create_test_order(OrderSide::Buy, 15000, 100)).unwrap();
        book.add_order(create_test_order(OrderSide::Buy, 15000, 200)).unwrap(); // Same price
        book.add_order(create_test_order(OrderSide::Buy, 14950, 150)).unwrap();
        
        book.add_order(create_test_order(OrderSide::Sell, 15050, 80)).unwrap();
        book.add_order(create_test_order(OrderSide::Sell, 15100, 120)).unwrap();
        
        let depth = book.market_depth(3);
        
        // Check bid levels (should be sorted highest to lowest)
        assert_eq!(depth.bids.len(), 2);
        assert_eq!(depth.bids[0].price.as_cents(), 15000);
        assert_eq!(depth.bids[0].quantity.value(), 300); // 100 + 200
        assert_eq!(depth.bids[0].order_count, 2);
        
        assert_eq!(depth.bids[1].price.as_cents(), 14950);
        assert_eq!(depth.bids[1].quantity.value(), 150);
        assert_eq!(depth.bids[1].order_count, 1);
        
        // Check ask levels (should be sorted lowest to highest)
        assert_eq!(depth.asks.len(), 2);
        assert_eq!(depth.asks[0].price.as_cents(), 15050);
        assert_eq!(depth.asks[0].quantity.value(), 80);
        
        assert_eq!(depth.asks[1].price.as_cents(), 15100);
        assert_eq!(depth.asks[1].quantity.value(), 120);
    }

    #[test]
    fn test_order_matching() {
        let mut book = LimitOrderBook::new("AAPL".to_string()).unwrap();
        
        // Add a sell order first
        let sell_order = create_test_order(OrderSide::Sell, 15000, 100);
        book.add_order(sell_order).unwrap();
        
        // Add a matching buy order
        let buy_order = create_test_order(OrderSide::Buy, 15000, 80);
        let trades = book.add_order(buy_order).unwrap();
        
        // Should have executed one trade
        assert_eq!(trades.len(), 1);
        assert_eq!(trades[0].price.as_cents(), 15000);
        assert_eq!(trades[0].quantity.value(), 80);
        
        // Sell order should have remaining quantity
        assert_eq!(book.best_ask_quantity().unwrap().value(), 20);
    }
    
    #[test]
    fn test_order_cancellation() {
        let mut book = LimitOrderBook::new("AAPL".to_string()).unwrap();
        
        let order = create_test_order(OrderSide::Buy, 15000, 100);
        let order_id = order.id;
        
        book.add_order(order).unwrap();
        assert_eq!(book.order_count(), 1);
        
        let cancelled_order = book.cancel_order(order_id).unwrap();
        assert_eq!(cancelled_order.status, OrderStatus::Cancelled);
        assert_eq!(book.order_count(), 0);
        assert!(book.is_empty());
    }
}