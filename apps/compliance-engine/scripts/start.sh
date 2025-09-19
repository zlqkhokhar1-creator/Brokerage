#!/bin/bash

# Compliance Engine Startup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="compliance-engine"
SERVICE_PORT=${PORT:-3004}
LOG_DIR="../../logs"
PID_FILE="../../pids/compliance-engine.pid"

# Create necessary directories
mkdir -p "$LOG_DIR"
mkdir -p "../../pids"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if service is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Function to start the service
start_service() {
    print_status "Starting $SERVICE_NAME..."
    
    if is_running; then
        print_warning "$SERVICE_NAME is already running"
        return 0
    fi
    
    # Check if port is available
    if lsof -Pi :$SERVICE_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_error "Port $SERVICE_PORT is already in use"
        exit 1
    fi
    
    # Start the service
    nohup node src/index.js > "$LOG_DIR/compliance-engine.log" 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"
    
    # Wait a moment and check if it started successfully
    sleep 2
    if is_running; then
        print_status "$SERVICE_NAME started successfully (PID: $pid)"
        print_status "Service running on port $SERVICE_PORT"
        print_status "Logs: $LOG_DIR/compliance-engine.log"
    else
        print_error "Failed to start $SERVICE_NAME"
        exit 1
    fi
}

# Function to stop the service
stop_service() {
    print_status "Stopping $SERVICE_NAME..."
    
    if ! is_running; then
        print_warning "$SERVICE_NAME is not running"
        return 0
    fi
    
    local pid=$(cat "$PID_FILE")
    kill "$pid"
    
    # Wait for graceful shutdown
    local count=0
    while [ $count -lt 10 ] && is_running; do
        sleep 1
        count=$((count + 1))
    done
    
    if is_running; then
        print_warning "Graceful shutdown failed, forcing kill..."
        kill -9 "$pid"
        sleep 1
    fi
    
    rm -f "$PID_FILE"
    print_status "$SERVICE_NAME stopped"
}

# Function to restart the service
restart_service() {
    print_status "Restarting $SERVICE_NAME..."
    stop_service
    sleep 2
    start_service
}

# Function to show service status
show_status() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        print_status "$SERVICE_NAME is running (PID: $pid)"
        
        # Show port usage
        if lsof -Pi :$SERVICE_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_status "Service is listening on port $SERVICE_PORT"
        else
            print_warning "Service is running but not listening on port $SERVICE_PORT"
        fi
        
        # Show memory usage
        local memory=$(ps -p "$pid" -o rss= | awk '{print $1/1024 " MB"}')
        print_status "Memory usage: $memory"
        
        # Show uptime
        local uptime=$(ps -p "$pid" -o etime= | awk '{print $1}')
        print_status "Uptime: $uptime"
    else
        print_warning "$SERVICE_NAME is not running"
    fi
}

# Function to show logs
show_logs() {
    local lines=${1:-50}
    print_status "Showing last $lines lines of logs:"
    echo "----------------------------------------"
    tail -n "$lines" "$LOG_DIR/compliance-engine.log"
}

# Function to show help
show_help() {
    echo "Usage: $0 {start|stop|restart|status|logs|help}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the $SERVICE_NAME"
    echo "  stop    - Stop the $SERVICE_NAME"
    echo "  restart - Restart the $SERVICE_NAME"
    echo "  status  - Show the $SERVICE_NAME status"
    echo "  logs    - Show the last 50 lines of logs"
    echo "  help    - Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  PORT    - Port to run the service on (default: 3004)"
    echo "  NODE_ENV - Node environment (development|production)"
}

# Main script logic
case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

