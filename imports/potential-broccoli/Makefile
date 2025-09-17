# Brokerage Platform Makefile

.PHONY: help dev build test lint clean install migrate docker-up docker-down

# Default target
help: ## Show this help message
	@echo "Brokerage Platform - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Quick Start:"
	@echo "  make setup     # One-time development setup"
	@echo "  make dev       # Start all services in development mode"

# Development
setup: ## Set up development environment
	@echo "🚀 Setting up development environment..."
	@./ops/scripts/dev-setup.sh

install: ## Install all dependencies
	@echo "📦 Installing dependencies..."
	@npm ci
	@npm run build --workspace=packages/shared

dev: ## Start all services in development mode
	@echo "🚀 Starting development services..."
	@npm run dev

build: ## Build all services and packages
	@echo "🔨 Building all services..."
	@npm run build

# Testing
test: ## Run all tests
	@echo "🧪 Running all tests..."
	@npm run test
	@echo "🦀 Running Rust tests..."
	@cd engine/matching && cargo test

test-ts: ## Run TypeScript tests only
	@echo "🧪 Running TypeScript tests..."
	@npm run test

test-rust: ## Run Rust tests only
	@echo "🦀 Running Rust tests..."
	@cd engine/matching && cargo test

# Code Quality
lint: ## Lint all code
	@echo "🧹 Linting code..."
	@npm run lint
	@echo "🦀 Checking Rust formatting..."
	@cd engine/matching && cargo fmt -- --check
	@cd engine/matching && cargo clippy -- -D warnings

lint-fix: ## Fix linting issues
	@echo "🔧 Fixing lint issues..."
	@npm run lint --fix
	@cd engine/matching && cargo fmt

type-check: ## Run TypeScript type checking
	@echo "🔍 Type checking..."
	@npm run type-check

# Database
migrate: ## Run database migrations
	@echo "🗄️ Running database migrations..."
	@npm run migrate --workspace=services/ledger

migrate-reset: ## Reset and re-run migrations
	@echo "🔄 Resetting database..."
	@docker-compose exec postgres psql -U postgres -d brokerage -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@npm run migrate --workspace=services/ledger

# Docker
docker-up: ## Start all services with Docker Compose
	@echo "🐳 Starting Docker services..."
	@docker-compose up -d

docker-down: ## Stop all Docker services
	@echo "🛑 Stopping Docker services..."
	@docker-compose down

docker-logs: ## Show logs for all services
	@docker-compose logs -f

docker-build: ## Build Docker images for all services
	@echo "🔨 Building Docker images..."
	@docker-compose build

# Infrastructure
infra-up: ## Start only infrastructure services (DB, Kafka, etc.)
	@echo "🏗️ Starting infrastructure..."
	@docker-compose up -d postgres redis kafka zookeeper schema-registry jaeger prometheus grafana

infra-down: ## Stop infrastructure services
	@echo "🛑 Stopping infrastructure..."
	@docker-compose stop postgres redis kafka zookeeper schema-registry jaeger prometheus grafana

# Monitoring
logs-gateway: ## Show gateway service logs
	@docker-compose logs -f gateway

logs-risk: ## Show risk service logs
	@docker-compose logs -f risk

logs-ledger: ## Show ledger service logs
	@docker-compose logs -f ledger

logs-feature-store: ## Show feature store service logs
	@docker-compose logs -f feature-store

# Utilities  
clean: ## Clean build artifacts and dependencies
	@echo "🧹 Cleaning up..."
	@rm -rf node_modules
	@rm -rf packages/*/dist
	@rm -rf packages/*/node_modules
	@rm -rf services/*/dist
	@rm -rf services/*/node_modules
	@cd engine/matching && cargo clean
	@docker-compose down -v
	@docker system prune -f

health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@curl -s http://localhost:3001/health | jq '.' 2>/dev/null || echo "Gateway: Not responding"
	@curl -s http://localhost:3002/api/v1/health | jq '.' 2>/dev/null || echo "Risk: Not responding"
	@curl -s http://localhost:3003/api/v1/health | jq '.' 2>/dev/null || echo "Ledger: Not responding"
	@curl -s http://localhost:3004/api/v1/health | jq '.' 2>/dev/null || echo "Feature Store: Not responding"

# CI/CD
ci: lint type-check test ## Run CI pipeline locally

# Production
prod-build: ## Build for production
	@echo "🏭 Building for production..."
	@docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Rust specific
rust-check: ## Check Rust code
	@echo "🦀 Checking Rust code..."
	@cd engine/matching && cargo check

rust-doc: ## Generate Rust documentation
	@echo "📚 Generating Rust docs..."
	@cd engine/matching && cargo doc --open