//! Common types used throughout the matching engine

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Unique identifier for orders
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct OrderId(Uuid);

impl OrderId {
    /// Creates a new random order ID
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
    
    /// Creates an order ID from a UUID
    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }
    
    /// Gets the underlying UUID
    pub fn as_uuid(&self) -> Uuid {
        self.0
    }
}

impl Default for OrderId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for OrderId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Trading symbol identifier
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Symbol(String);

impl Symbol {
    /// Creates a new symbol with validation
    pub fn new(symbol: String) -> crate::Result<Self> {
        if symbol.is_empty() {
            return Err(crate::MatchingEngineError::InvalidPrice(
                "Symbol cannot be empty".to_string(),
            ));
        }
        if symbol.len() > 10 {
            return Err(crate::MatchingEngineError::InvalidPrice(
                "Symbol too long (max 10 characters)".to_string(),
            ));
        }
        Ok(Self(symbol.to_uppercase()))
    }
    
    /// Gets the symbol string
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for Symbol {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// User identifier
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct UserId(String);

impl UserId {
    /// Creates a new user ID
    pub fn new(user_id: String) -> Self {
        Self(user_id)
    }
    
    /// Gets the user ID string
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for UserId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}