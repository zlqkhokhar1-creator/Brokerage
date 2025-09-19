#!/bin/bash

# Algorithmic Trading Framework Startup Script
# This script starts the Algorithmic Trading Framework with all required services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="algorithmic-trading-framework"
SERVICE_PORT=${PORT:-5006}
LOG_LEVEL=${LOG_LEVEL:-info}
NODE_ENV=${NODE_ENV:-development}

# Database configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-brokerage}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-password}

# Redis configuration
REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-}

# JWT configuration
JWT_SECRET=${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-24h}

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    log "Node.js version: $(node --version)"
}

# Check if required dependencies are installed
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        warn "Dependencies not found. Installing..."
        npm install
    fi
    
    log "Dependencies check passed"
}

# Check if database is accessible
check_database() {
    info "Checking database connection..."
    
    # Try to connect to PostgreSQL
    if command -v psql &> /dev/null; then
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
            log "Database connection successful"
        else
            warn "Cannot connect to database. Make sure PostgreSQL is running and accessible."
            warn "You may need to create the database and run migrations manually."
        fi
    else
        warn "psql not found. Cannot verify database connection."
    fi
}

# Check if Redis is accessible
check_redis() {
    info "Checking Redis connection..."
    
    if command -v redis-cli &> /dev/null; then
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping &> /dev/null; then
            log "Redis connection successful"
        else
            warn "Cannot connect to Redis. Make sure Redis is running and accessible."
        fi
    else
        warn "redis-cli not found. Cannot verify Redis connection."
    fi
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p plugins
    mkdir -p data
    mkdir -p temp
    
    log "Directories created"
}

# Set environment variables
set_environment() {
    log "Setting environment variables..."
    
    export NODE_ENV="$NODE_ENV"
    export PORT="$SERVICE_PORT"
    export LOG_LEVEL="$LOG_LEVEL"
    export DB_HOST="$DB_HOST"
    export DB_PORT="$DB_PORT"
    export DB_NAME="$DB_NAME"
    export DB_USER="$DB_USER"
    export DB_PASSWORD="$DB_PASSWORD"
    export REDIS_HOST="$REDIS_HOST"
    export REDIS_PORT="$REDIS_PORT"
    export REDIS_PASSWORD="$REDIS_PASSWORD"
    export JWT_SECRET="$JWT_SECRET"
    export JWT_EXPIRES_IN="$JWT_EXPIRES_IN"
    
    log "Environment variables set"
}

# Run database migrations
run_migrations() {
    info "Running database migrations..."
    
    if [ -f "db/schema.sql" ]; then
        if command -v psql &> /dev/null; then
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/schema.sql
            log "Database migrations completed"
        else
            warn "psql not found. Please run migrations manually:"
            warn "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/schema.sql"
        fi
    else
        warn "Schema file not found. Please ensure db/schema.sql exists."
    fi
}

# Start the service
start_service() {
    log "Starting $SERVICE_NAME on port $SERVICE_PORT..."
    
    # Set process title
    export PROCESS_TITLE="$SERVICE_NAME"
    
    # Start the service
    if [ "$NODE_ENV" = "production" ]; then
        log "Starting in production mode..."
        node src/index.js
    else
        log "Starting in development mode..."
        node src/index.js
    fi
}

# Handle signals
handle_signals() {
    trap 'log "Received SIGINT, shutting down gracefully..."; exit 0' INT
    trap 'log "Received SIGTERM, shutting down gracefully..."; exit 0' TERM
}

# Main function
main() {
    log "Starting Algorithmic Trading Framework..."
    
    # Handle signals
    handle_signals
    
    # Run checks
    check_node
    check_dependencies
    check_database
    check_redis
    
    # Setup
    create_directories
    set_environment
    
    # Run migrations if needed
    if [ "$1" = "--migrate" ]; then
        run_migrations
    fi
    
    # Start service
    start_service
}

# Show help
show_help() {
    echo "Algorithmic Trading Framework Startup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --migrate    Run database migrations before starting"
    echo "  --help       Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  PORT              Service port (default: 5006)"
    echo "  LOG_LEVEL         Log level (default: info)"
    echo "  NODE_ENV          Node environment (default: development)"
    echo "  DB_HOST           Database host (default: localhost)"
    echo "  DB_PORT           Database port (default: 5432)"
    echo "  DB_NAME           Database name (default: brokerage)"
    echo "  DB_USER           Database user (default: postgres)"
    echo "  DB_PASSWORD       Database password (default: password)"
    echo "  REDIS_HOST        Redis host (default: localhost)"
    echo "  REDIS_PORT        Redis port (default: 6379)"
    echo "  REDIS_PASSWORD    Redis password (default: empty)"
    echo "  JWT_SECRET        JWT secret key (default: your-super-secret-jwt-key-change-in-production)"
    echo "  JWT_EXPIRES_IN    JWT expiration time (default: 24h)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Start with default settings"
    echo "  $0 --migrate          # Run migrations and start"
    echo "  PORT=3000 $0          # Start on port 3000"
    echo "  NODE_ENV=production $0 # Start in production mode"
}

# Parse arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac

