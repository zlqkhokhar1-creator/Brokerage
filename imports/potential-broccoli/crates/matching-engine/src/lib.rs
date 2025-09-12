//! # Matching Engine
//!
//! A high-performance, production-ready matching engine for financial markets.
//! 
//! ## Features
//! - **High Performance**: O(log n) order operations using BTreeMap
//! - **Type Safety**: Strong typing for prices, quantities, and order IDs
//! - **Serialization**: Full serde support for snapshot persistence
//! - **Invariants**: Property-based testing ensures correctness
//! - **Observability**: Comprehensive metrics and benchmarking
//!
//! ## Example
//! ```rust
//! use matching_engine::{LimitOrderBook, Order, OrderSide, Price, Quantity};
//! use rust_decimal::Decimal;
//! use uuid::Uuid;
//!
//! let mut book = LimitOrderBook::new("AAPL".to_string());
//! 
//! let buy_order = Order::new(
//!     Uuid::new_v4(),
//!     "user1".to_string(),
//!     OrderSide::Buy,
//!     Price::new(Decimal::new(15000, 2))?, // $150.00
//!     Quantity::new(100)?,
//! );
//!
//! book.add_order(buy_order)?;
//! 
//! if let Some(best_bid) = book.best_bid() {
//!     println!("Best bid: ${}", best_bid.value());
//! }
//! # Ok::<(), matching_engine::error::MatchingEngineError>(())
//! ```

pub mod error;
pub mod order;
pub mod order_book;
pub mod price;
pub mod quantity;
pub mod types;

pub use error::MatchingEngineError;
pub use order::{Order, OrderSide, OrderStatus};
pub use order_book::LimitOrderBook;
pub use price::Price;
pub use quantity::Quantity;
pub use types::{OrderId, Symbol, UserId};

/// Result type for matching engine operations
pub type Result<T> = std::result::Result<T, MatchingEngineError>;