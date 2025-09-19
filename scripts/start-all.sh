#!/bin/bash

# Brokerage Platform - Complete Startup Script
# This script starts all microservices and infrastructure components

set -e

echo "🚀 Starting Brokerage Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a service is running
check_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Checking $service_name on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "http://localhost:$port/health" > /dev/null 2>&1; then
            print_success "$service_name is healthy"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - Waiting for $service_name..."
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name failed to start or is not healthy"
    return 1
}

# Function to start a service
start_service() {
    local service_name=$1
    local service_path=$2
    local port=$3
    
    print_status "Starting $service_name..."
    
    if [ -d "$service_path" ]; then
        cd "$service_path"
        
        # Install dependencies if needed
        if [ ! -d "node_modules" ]; then
            print_status "Installing dependencies for $service_name..."
            npm install --silent
        fi
        
        # Start the service in background
        nohup npm start > "../logs/$service_name.log" 2>&1 &
        local pid=$!
        echo $pid > "../logs/$service_name.pid"
        
        print_success "$service_name started with PID $pid"
        
        # Wait a moment for the service to initialize
        sleep 3
        
        # Check if service is healthy
        if check_service "$service_name" "$port"; then
            print_success "$service_name is running and healthy"
        else
            print_error "$service_name failed health check"
            return 1
        fi
        
        cd - > /dev/null
    else
        print_error "Service directory not found: $service_path"
        return 1
    fi
}

# Create logs directory
mkdir -p logs

# Set environment variables
export NODE_ENV=${NODE_ENV:-development}
export DB_HOST=${DB_HOST:-localhost}
export DB_PORT=${DB_PORT:-5432}
export DB_NAME=${DB_NAME:-brokerage}
export DB_USER=${DB_USER:-postgres}
export DB_PASSWORD=${DB_PASSWORD:-password}
export REDIS_HOST=${REDIS_HOST:-localhost}
export REDIS_PORT=${REDIS_PORT:-6379}
export JWT_SECRET=${JWT_SECRET:-your-secret-key}
export LOG_LEVEL=${LOG_LEVEL:-info}

print_status "Environment: $NODE_ENV"
print_status "Database: $DB_HOST:$DB_PORT/$DB_NAME"
print_status "Redis: $REDIS_HOST:$REDIS_PORT"

# Check prerequisites
print_status "Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    print_warning "PostgreSQL is not running. Please start PostgreSQL and try again."
    print_status "You can start PostgreSQL with: brew services start postgresql (macOS) or systemctl start postgresql (Linux)"
    exit 1
fi

# Check if Redis is running
if ! redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
    print_warning "Redis is not running. Please start Redis and try again."
    print_status "You can start Redis with: brew services start redis (macOS) or systemctl start redis (Linux)"
    exit 1
fi

print_success "Prerequisites check passed"

# Start infrastructure services first
print_status "Starting infrastructure services..."

# Start Event Bus
start_service "Event Bus" "infrastructure/event-bus" 3020

# Start Monitoring System
start_service "Monitoring System" "infrastructure/monitoring" 3021

# Wait for infrastructure services to be ready
sleep 5

# Start core microservices
print_status "Starting core microservices..."

# Start Algorithmic Trading Framework
start_service "Algorithmic Trading Framework" "apps/algorithmic-trading-framework" 3001

# Start Risk Monitoring System
start_service "Risk Monitoring System" "apps/risk-monitoring-system" 3002

# Start Compliance Engine
start_service "Compliance Engine" "apps/compliance-engine" 3003

# Start Fraud Detection System
start_service "Fraud Detection System" "apps/fraud-detection-system" 3004

# Start Tax Optimization Engine
start_service "Tax Optimization Engine" "apps/tax-optimization-engine" 3005

# Start Performance Analytics
start_service "Performance Analytics" "apps/performance-analytics" 3006

# Start Market Data Processing
start_service "Market Data Processing" "apps/market-data-processing" 3007

# Start Custom Reporting Engine
start_service "Custom Reporting Engine" "apps/custom-reporting-engine" 3008

# Start Zero-Trust Security
start_service "Zero-Trust Security" "apps/zero-trust-security" 3009

# Start Integration Hub
start_service "Integration Hub" "apps/integration-hub" 3010

# Start Notification System
start_service "Notification System" "apps/notification-system" 3011

# Start Intelligent KYC
start_service "Intelligent KYC" "apps/intelligent-kyc" 3012

# Start Identity Verification
start_service "Identity Verification" "apps/identity-verification" 3013

# Start Onboarding Orchestrator
start_service "Onboarding Orchestrator" "apps/onboarding-orchestrator" 3014

# Final health check
print_status "Performing final health check..."

# Check all services
services=(
    "Event Bus:3020"
    "Monitoring System:3021"
    "Algorithmic Trading Framework:3001"
    "Risk Monitoring System:3002"
    "Compliance Engine:3003"
    "Fraud Detection System:3004"
    "Tax Optimization Engine:3005"
    "Performance Analytics:3006"
    "Market Data Processing:3007"
    "Custom Reporting Engine:3008"
    "Zero-Trust Security:3009"
    "Integration Hub:3010"
    "Notification System:3011"
    "Intelligent KYC:3012"
    "Identity Verification:3013"
    "Onboarding Orchestrator:3014"
)

all_healthy=true

for service_info in "${services[@]}"; do
    IFS=':' read -r service_name port <<< "$service_info"
    if ! check_service "$service_name" "$port"; then
        all_healthy=false
    fi
done

if [ "$all_healthy" = true ]; then
    print_success "🎉 All services are running and healthy!"
    print_status "Platform is ready for use"
    print_status "API Gateway: http://localhost:3010"
    print_status "Monitoring Dashboard: http://localhost:3021"
    print_status "Event Bus: http://localhost:3020"
    print_status ""
    print_status "Service Status:"
    for service_info in "${services[@]}"; do
        IFS=':' read -r service_name port <<< "$service_info"
        echo "  ✅ $service_name (port $port)"
    done
else
    print_error "❌ Some services failed to start or are not healthy"
    print_status "Check the logs in the logs/ directory for more information"
    exit 1
fi
