#!/bin/bash
# Docker Quick Start Script for Linux/Mac
# This script helps you get started with Docker development

echo "========================================"
echo "  NexusPM Docker Setup"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from env.example..."
    cp env.example .env
    echo "✓ .env file created. Please edit it with your configuration."
    echo ""
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "✗ Docker is not running. Please start Docker."
    exit 1
fi

echo "✓ Docker is running"
echo ""
echo "Starting Docker containers..."
docker-compose up -d

echo ""
echo "Waiting for services to be ready..."
sleep 5

echo ""
echo "Running database migrations..."
docker-compose exec -T backend pnpm prisma generate
docker-compose exec -T backend pnpm prisma migrate deploy

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Frontend:  http://localhost:5173"
echo "Backend:   http://localhost:3000/api"
echo "Database:  localhost:5432"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f          # View logs"
echo "  docker-compose down             # Stop services"
echo "  docker-compose exec backend sh  # Backend shell"
echo "  make help                       # See all commands"
echo ""

