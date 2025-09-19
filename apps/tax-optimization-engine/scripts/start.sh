#!/bin/bash

# Tax Optimization Engine Startup Script

echo "Starting Tax Optimization Engine..."

# Set environment variables
export NODE_ENV=production
export PORT=3005
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=brokerage_tax
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

echo "Tax Optimization Engine started on port $PORT"

