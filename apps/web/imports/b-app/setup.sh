#!/bin/bash

# InvestPro Development Setup Script
# This script sets up the development environment for the InvestPro brokerage platform

set -e

echo "🚀 Setting up InvestPro Development Environment"
echo "=============================================="

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

# Check if required tools are installed
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) is installed"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    print_success "npm $(npm --version) is installed"
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        print_success "Docker $(docker --version) is available"
    else
        print_warning "Docker is not installed. You can install it for containerized development"
    fi
    
    # Check PostgreSQL (optional)
    if command -v psql &> /dev/null; then
        print_success "PostgreSQL client is available"
    else
        print_warning "PostgreSQL client is not installed. You can use Docker for the database"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Install backend dependencies
    print_status "Installing backend dependencies..."
    cd apps/backend
    npm install
    cd ../..
    
    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    cd apps/web
    npm install
    cd ../..
    
    print_success "All dependencies installed successfully"
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    # Backend .env
    if [ ! -f "apps/backend/.env" ]; then
        print_status "Creating backend .env file..."
        cat > apps/backend/.env << EOF
NODE_ENV=development
DATABASE_URL=postgres://investpro:secure_password_123@localhost:5432/brokerage
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
PORT=5000
FRONTEND_URL=http://localhost:3000
EOF
        print_success "Backend .env file created"
    else
        print_warning "Backend .env file already exists"
    fi
    
    # Frontend .env.local
    if [ ! -f "apps/web/.env.local" ]; then
        print_status "Creating frontend .env.local file..."
        cat > apps/web/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
EOF
        print_success "Frontend .env.local file created"
    else
        print_warning "Frontend .env.local file already exists"
    fi
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if Docker is available
    if command -v docker &> /dev/null; then
        print_status "Starting PostgreSQL with Docker..."
        docker-compose up -d postgres
        
        # Wait for database to be ready
        print_status "Waiting for database to be ready..."
        sleep 10
        
        # Check if database is accessible
        if docker-compose exec postgres pg_isready -U investpro -d brokerage; then
            print_success "Database is ready"
        else
            print_error "Database failed to start"
            exit 1
        fi
    else
        print_warning "Docker not available. Please set up PostgreSQL manually:"
        print_warning "1. Install PostgreSQL 15+"
        print_warning "2. Create database: brokerage"
        print_warning "3. Run: psql -U postgres -d brokerage -f backend/db/schema.sql"
        print_warning "4. Run: psql -U postgres -d brokerage -f backend/db/seed.sql"
    fi
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    if command -v docker &> /dev/null; then
        # Run migrations using Docker
        docker-compose exec postgres psql -U investpro -d brokerage -f /docker-entrypoint-initdb.d/01-schema.sql
        docker-compose exec postgres psql -U investpro -d brokerage -f /docker-entrypoint-initdb.d/02-seed.sql
        print_success "Database migrations completed"
    else
        print_warning "Please run database migrations manually:"
        print_warning "psql -U postgres -d brokerage -f backend/db/schema.sql"
        print_warning "psql -U postgres -d brokerage -f backend/db/seed.sql"
    fi
}

# Build applications
build_applications() {
    print_status "Building applications..."
    
    # Build frontend
    print_status "Building frontend..."
    cd apps/web
    npm run build
    cd ../..
    
    print_success "Applications built successfully"
}

# Create development scripts
create_scripts() {
    print_status "Creating development scripts..."
    
    # Create start script
    cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting InvestPro Development Environment"
echo "============================================="

# Start backend
echo "Starting backend server..."
cd apps/backend
npm run dev &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend server..."
cd ../web
npm run dev &
FRONTEND_PID=$!

echo "✅ Development servers started!"
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
wait
EOF

    chmod +x start-dev.sh
    
    # Create stop script
    cat > stop-dev.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping InvestPro Development Environment"
echo "============================================="

# Kill Node.js processes
pkill -f "node.*backend"
pkill -f "next.*dev"

echo "✅ Development servers stopped"
EOF

    chmod +x stop-dev.sh
    
    print_success "Development scripts created"
}

# Main setup function
main() {
    echo ""
    print_status "Starting InvestPro setup process..."
    echo ""
    
    check_requirements
    echo ""
    
    install_dependencies
    echo ""
    
    setup_environment
    echo ""
    
    setup_database
    echo ""
    
    run_migrations
    echo ""
    
    build_applications
    echo ""
    
    create_scripts
    echo ""
    
    print_success "🎉 InvestPro setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Start the development environment: ./start-dev.sh"
    echo "2. Open http://localhost:3000 in your browser"
    echo "3. Use demo@investpro.com / demo123 to login"
    echo ""
    echo "Available commands:"
    echo "- ./start-dev.sh    : Start development servers"
    echo "- ./stop-dev.sh     : Stop development servers"
    echo "- docker-compose up : Start all services with Docker"
    echo "- docker-compose down: Stop all Docker services"
    echo ""
    echo "Happy coding! 🚀"
}

# Run main function
main "$@"


