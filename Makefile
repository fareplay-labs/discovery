.PHONY: help install dev build start clean docker-build docker-run docker-stop deploy logs test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

dev: ## Start development server
	npm run dev

build: ## Build for production
	npm run build

start: ## Start production server
	npm start

prisma-generate: ## Generate Prisma Client
	npm run prisma:generate

prisma-migrate: ## Run database migrations
	npm run prisma:migrate

prisma-studio: ## Open Prisma Studio
	npm run prisma:studio

clean: ## Clean build artifacts
	rm -rf dist node_modules

docker-build: ## Build Docker image
	docker-compose build

docker-up: ## Start with Docker Compose
	docker-compose up -d

docker-down: ## Stop Docker Compose
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f

docker-clean: ## Clean Docker volumes
	docker-compose down -v

fly-deploy: ## Deploy to Fly.io
	fly deploy

fly-logs: ## View Fly.io logs
	fly logs

fly-status: ## Check Fly.io status
	fly status

fly-scale: ## Scale Fly.io app (usage: make fly-scale COUNT=2)
	fly scale count $(COUNT)

lint: ## Run linter
	npm run lint

format: ## Format code
	npm run format

test: ## Run tests (placeholder)
	@echo "Tests not yet implemented"

