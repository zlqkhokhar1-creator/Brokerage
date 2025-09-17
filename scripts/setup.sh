#!/bin/bash

# Invest Pro Trading Platform Setup Script
echo "🚀 Setting up Invest Pro Trading Platform..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "npm install -g pnpm"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version 20+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo "✅ pnpm $(pnpm -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Set up environment variables
echo "⚙️ Setting up environment variables..."

# Frontend environment
if [ ! -f "apps/web-portal/.env.local" ]; then
    cat > apps/web-portal/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_NAME=Invest Pro
NEXT_PUBLIC_APP_VERSION=1.0.0
EOF
    echo "✅ Created frontend environment file"
fi

# Backend environment
if [ ! -f "apps/api-gateway/.env" ]; then
    cat > apps/api-gateway/.env << EOF
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/investpro
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
TEMP_JWT_SECRET=your-temp-secret-for-2fa
FRONTEND_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:5001
EOF
    echo "✅ Created backend environment file"
fi

# Create database setup script
echo "🗄️ Creating database setup script..."
cat > scripts/setup-db.sh << 'EOF'
#!/bin/bash

echo "🗄️ Setting up database..."

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Create database
echo "Creating database..."
createdb investpro 2>/dev/null || echo "Database already exists"

# Run schema
echo "Running schema..."
psql -d investpro -f apps/api-gateway/db/feature_system_schema.sql

echo "✅ Database setup complete"
EOF

chmod +x scripts/setup-db.sh

# Create start script
echo "🚀 Creating start script..."
cat > scripts/start-dev.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Invest Pro Trading Platform..."

# Start backend
echo "Starting backend server..."
cd apps/api-gateway
pnpm dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
echo "Starting frontend server..."
cd ../web-portal
pnpm dev &
FRONTEND_PID=$!

echo "✅ Servers started!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:3001"
echo "Health Check: http://localhost:3001/health"

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Trap Ctrl+C
trap cleanup INT

# Wait for processes
wait
EOF

chmod +x scripts/start-dev.sh

# Create build script
echo "🏗️ Creating build script..."
cat > scripts/build.sh << 'EOF'
#!/bin/bash

echo "🏗️ Building Invest Pro Trading Platform..."

# Build backend
echo "Building backend..."
cd apps/api-gateway
pnpm build

# Build frontend
echo "Building frontend..."
cd ../web-portal
pnpm build

echo "✅ Build complete!"
EOF

chmod +x scripts/build.sh

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up PostgreSQL and Redis"
echo "2. Run: ./scripts/setup-db.sh"
echo "3. Run: ./scripts/start-dev.sh"
echo ""
echo "Or start manually:"
echo "  Backend:  cd apps/api-gateway && pnpm dev"
echo "  Frontend: cd apps/web-portal && pnpm dev"
echo ""
echo "📚 Documentation: README.md"
echo "🔧 Configuration: apps/*/package.json"
