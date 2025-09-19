#!/bin/bash

# Brokerage Platform - Complete Shutdown Script
# This script stops all microservices and infrastructure components

set -e

echo "🛑 Stopping Brokerage Platform..."

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

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid_file="logs/$service_name.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            print_status "Stopping $service_name (PID: $pid)..."
            kill $pid
            
            # Wait for graceful shutdown
            local count=0
            while ps -p $pid > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                ((count++))
            done
            
            if ps -p $pid > /dev/null 2>&1; then
                print_warning "Force killing $service_name..."
                kill -9 $pid
            fi
            
            print_success "$service_name stopped"
        else
            print_warning "$service_name was not running"
        fi
        rm -f "$pid_file"
    else
        print_warning "PID file not found for $service_name"
    fi
}

# Stop all services
print_status "Stopping all services..."

# Stop microservices
stop_service "Onboarding Orchestrator"
stop_service "Identity Verification"
stop_service "Intelligent KYC"
stop_service "Notification System"
stop_service "Integration Hub"
stop_service "Zero-Trust Security"
stop_service "Custom Reporting Engine"
stop_service "Market Data Processing"
stop_service "Performance Analytics"
stop_service "Tax Optimization Engine"
stop_service "Fraud Detection System"
stop_service "Compliance Engine"
stop_service "Risk Monitoring System"
stop_service "Algorithmic Trading Framework"

# Stop infrastructure services
stop_service "Monitoring System"
stop_service "Event Bus"

# Kill any remaining Node.js processes related to our services
print_status "Cleaning up any remaining processes..."

# Get list of Node.js processes running our services
pids=$(ps aux | grep -E "(node.*apps/|node.*infrastructure/)" | grep -v grep | awk '{print $2}')

if [ ! -z "$pids" ]; then
    print_status "Found remaining Node.js processes: $pids"
    echo $pids | xargs kill -TERM 2>/dev/null || true
    
    # Wait a moment for graceful shutdown
    sleep 3
    
    # Force kill if still running
    pids=$(ps aux | grep -E "(node.*apps/|node.*infrastructure/)" | grep -v grep | awk '{print $2}')
    if [ ! -z "$pids" ]; then
        print_warning "Force killing remaining processes: $pids"
        echo $pids | xargs kill -9 2>/dev/null || true
    fi
fi

# Clean up log files
print_status "Cleaning up log files..."
rm -f logs/*.pid

print_success "🎉 All services stopped successfully!"
print_status "Platform shutdown complete"
