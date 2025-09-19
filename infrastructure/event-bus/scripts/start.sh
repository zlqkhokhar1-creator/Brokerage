#!/bin/bash

# Event Bus Service Startup Script

echo "Starting Event Bus Service..."

# Set environment variables
export NODE_ENV=${NODE_ENV:-development}
export PORT=${PORT:-3020}
export DB_HOST=${DB_HOST:-localhost}
export DB_PORT=${DB_PORT:-5432}
export DB_NAME=${DB_NAME:-brokerage_events}
export DB_USER=${DB_USER:-postgres}
export DB_PASSWORD=${DB_PASSWORD:-password}
export REDIS_HOST=${REDIS_HOST:-localhost}
export REDIS_PORT=${REDIS_PORT:-6379}
export JWT_SECRET=${JWT_SECRET:-your-secret-key}
export LOG_LEVEL=${LOG_LEVEL:-info}

# Create logs directory
mkdir -p logs

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the service
echo "Starting Event Bus Service on port $PORT..."
node src/index.js
