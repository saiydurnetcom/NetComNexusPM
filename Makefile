.PHONY: help build up down restart logs clean migrate studio test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker-compose build

up: ## Start all services in detached mode
	docker-compose up -d

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## Show logs from all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

logs-db: ## Show database logs
	docker-compose logs -f postgres

migrate: ## Run database migrations
	docker-compose exec backend pnpm prisma migrate deploy

migrate-dev: ## Create and run new migration
	docker-compose exec backend pnpm prisma migrate dev

studio: ## Open Prisma Studio
	docker-compose exec backend pnpm prisma studio

generate: ## Generate Prisma Client
	docker-compose exec backend pnpm prisma generate

shell-backend: ## Open shell in backend container
	docker-compose exec backend sh

shell-db: ## Connect to PostgreSQL database
	docker-compose exec postgres psql -U postgres -d nexuspm

test: ## Run backend tests
	docker-compose exec backend pnpm test

clean: ## Stop services and remove volumes (WARNING: deletes database data)
	docker-compose down -v

clean-all: clean ## Remove all containers, volumes, and images
	docker-compose down -v --rmi all

prod-build: ## Build production images
	docker-compose -f docker-compose.prod.yml build

prod-up: ## Start production services
	docker-compose -f docker-compose.prod.yml up -d

prod-down: ## Stop production services
	docker-compose -f docker-compose.prod.yml down

