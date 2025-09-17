#!/bin/bash
echo "🛑 Stopping InvestPro Development Environment"
echo "============================================="

# Kill Node.js processes
pkill -f "node.*backend"
pkill -f "next.*dev"

echo "✅ Development servers stopped"
