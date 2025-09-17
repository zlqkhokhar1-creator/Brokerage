#!/bin/bash

# Enhanced UI Development Server Setup
echo "🚀 Starting Enhanced UI Development Server..."

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "next dev" 2>/dev/null || true

# Clean build cache
echo "🗑️  Cleaning build cache..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Ensure required CSS dependencies are installed
echo "🎨 Ensuring CSS dependencies..."
npm install autoprefixer postcss tailwindcss --save-dev

# Start development server
echo "🌟 Starting Next.js development server..."
echo "📍 Preview URL: http://localhost:3000/preview"
echo "🎨 Enhanced UI components ready!"
echo ""

# Start with error handling
npm run dev 2>&1 | while IFS= read -r line; do
    echo "$line"
    if [[ "$line" == *"Ready in"* ]]; then
        echo ""
        echo "✅ Server ready! Open http://localhost:3000/preview to see enhanced UI"
        echo "🎯 Features: Enhanced Risk Dashboard, Navigation, Design System"
        echo ""
    fi
done
