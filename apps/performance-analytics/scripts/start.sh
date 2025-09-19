#!/bin/bash

# Performance Analytics Startup Script

echo "Starting Performance Analytics..."

# Set environment variables
export NODE_ENV=production
export PORT=3006
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=brokerage_performance
export DB_USER=postgres
export DB_PASSWORD=password
export REDIS_HOST=localhost
export REDIS_PORT=6379
export JWT_SECRET=your-secret-key
export LOG_LEVEL=info

# Create logs directory
mkdir -p logs

# Start the service
node src/index.js

echo "Performance Analytics started on port $PORT"

