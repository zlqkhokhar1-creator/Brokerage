#!/bin/bash

# Integration Hub Startup Script

echo "Starting Integration Hub..."

# Set environment variables
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3010}
export DB_HOST=${DB_HOST:-localhost}
export DB_PORT=${DB_PORT:-5432}
export DB_NAME=${DB_NAME:-brokerage}
export DB_USER=${DB_USER:-postgres}
export DB_PASSWORD=${DB_PASSWORD:-password}
export REDIS_HOST=${REDIS_HOST:-localhost}
export REDIS_PORT=${REDIS_PORT:-6379}
export REDIS_PASSWORD=${REDIS_PASSWORD:-}
export JWT_SECRET=${JWT_SECRET:-your-secret-key}
export LOG_LEVEL=${LOG_LEVEL:-info}

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT &> /dev/null; then
    echo "Warning: PostgreSQL is not running on $DB_HOST:$DB_PORT"
    echo "Please start PostgreSQL before running the Integration Hub"
fi

# Check if Redis is running
if ! redis-cli -h $REDIS_HOST -p $REDIS_PORT ping &> /dev/null; then
    echo "Warning: Redis is not running on $REDIS_HOST:$REDIS_PORT"
    echo "Please start Redis before running the Integration Hub"
fi

# Start the application
echo "Starting Integration Hub on port $PORT..."
node src/index.js

