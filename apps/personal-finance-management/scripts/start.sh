#!/bin/bash

# Personal Finance Management System Startup Script
# This script starts all services in the correct order

set -e

echo "🚀 Starting Personal Finance Management System..."

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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p ai-service/models
mkdir -p ai-service/logs

# Set permissions
chmod 755 logs
chmod 755 uploads
chmod 755 ai-service/models
chmod 755 ai-service/logs

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f env.example ]; then
        cp env.example .env
        print_success "Created .env file from template. Please update the configuration."
    else
        print_error "env.example file not found. Please create a .env file manually."
        exit 1
    fi
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Build and start services
print_status "Building Docker images..."
docker-compose build

print_status "Starting database services..."
docker-compose up -d postgres redis

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 10

# Check if database is ready
print_status "Checking database connection..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        print_success "Database is ready!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "Database failed to start after $max_attempts attempts"
        exit 1
    fi
    
    print_status "Waiting for database... (attempt $attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

# Check if Redis is ready
print_status "Checking Redis connection..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is ready!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "Redis failed to start after $max_attempts attempts"
        exit 1
    fi
    
    print_status "Waiting for Redis... (attempt $attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

# Run database migrations
print_status "Running database migrations..."
docker-compose exec -T postgres psql -U postgres -d personal_finance -f /docker-entrypoint-initdb.d/schema.sql

# Start AI service
print_status "Starting AI/ML service..."
docker-compose up -d ai

# Wait for AI service to be ready
print_status "Waiting for AI service to be ready..."
sleep 15

# Check if AI service is ready
print_status "Checking AI service connection..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        print_success "AI service is ready!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        print_warning "AI service may not be ready yet, but continuing..."
        break
    fi
    
    print_status "Waiting for AI service... (attempt $attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

# Start API service
print_status "Starting API service..."
docker-compose up -d api

# Wait for API service to be ready
print_status "Waiting for API service to be ready..."
sleep 10

# Check if API service is ready
print_status "Checking API service connection..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        print_success "API service is ready!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "API service failed to start after $max_attempts attempts"
        exit 1
    fi
    
    print_status "Waiting for API service... (attempt $attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

# Start monitoring services
print_status "Starting monitoring services..."
docker-compose up -d prometheus grafana

# Start Nginx reverse proxy
print_status "Starting Nginx reverse proxy..."
docker-compose up -d nginx

# Final status check
print_status "Checking all services..."

# Check API service
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    print_success "✅ API Service: Running on http://localhost:3000"
else
    print_error "❌ API Service: Not responding"
fi

# Check AI service
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    print_success "✅ AI Service: Running on http://localhost:8001"
else
    print_warning "⚠️  AI Service: Not responding (may still be starting)"
fi

# Check Grafana
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    print_success "✅ Grafana: Running on http://localhost:3001 (admin/admin)"
else
    print_warning "⚠️  Grafana: Not responding"
fi

# Check Prometheus
if curl -s http://localhost:9090 > /dev/null 2>&1; then
    print_success "✅ Prometheus: Running on http://localhost:9090"
else
    print_warning "⚠️  Prometheus: Not responding"
fi

# Check Nginx
if curl -s http://localhost:80 > /dev/null 2>&1; then
    print_success "✅ Nginx: Running on http://localhost:80"
else
    print_warning "⚠️  Nginx: Not responding"
fi

echo ""
print_success "🎉 Personal Finance Management System started successfully!"
echo ""
echo "📋 Service URLs:"
echo "   • API Service: http://localhost:3000"
echo "   • AI Service: http://localhost:8001"
echo "   • Grafana: http://localhost:3001 (admin/admin)"
echo "   • Prometheus: http://localhost:9090"
echo "   • Nginx: http://localhost:80"
echo ""
echo "📚 Documentation:"
echo "   • API Docs: http://localhost:3000/docs"
echo "   • AI Service Docs: http://localhost:8001/docs"
echo ""
echo "🔧 Management Commands:"
echo "   • View logs: docker-compose logs -f"
echo "   • Stop services: docker-compose down"
echo "   • Restart services: docker-compose restart"
echo "   • View status: docker-compose ps"
echo ""
print_status "System is ready for use! 🚀"
