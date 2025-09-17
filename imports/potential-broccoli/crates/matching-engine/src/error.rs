//! Error types for the matching engine

use thiserror::Error;

/// Comprehensive error handling for all matching engine operations
#[derive(Error, Debug, Clone, PartialEq)]
pub enum MatchingEngineError {
    #[error("Invalid price: {0}")]
    InvalidPrice(String),
    
    #[error("Invalid quantity: {0}")]
    InvalidQuantity(String),
    
    #[error("Order not found: {0}")]
    OrderNotFound(String),
    
    #[error("Insufficient quantity available. Requested: {requested}, Available: {available}")]
    InsufficientQuantity { requested: u64, available: u64 },
    
    #[error("Invalid order side")]
    InvalidOrderSide,
    
    #[error("Order book is empty")]
    EmptyOrderBook,
    
    #[error("Serialization error: {0}")]
    SerializationError(String),
    
    #[error("Deserialization error: {0}")]
    DeserializationError(String),
    
    #[error("Invariant violation: {0}")]
    InvariantViolation(String),
}