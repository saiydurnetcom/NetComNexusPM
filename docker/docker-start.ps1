# Docker Quick Start Script for Windows PowerShell
# This script helps you get started with Docker development

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NexusPM Docker Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from env.example..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "✓ .env file created. Please edit it with your configuration." -ForegroundColor Green
    Write-Host ""
}

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting Docker containers..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Running database migrations..." -ForegroundColor Yellow
docker-compose exec -T backend pnpm prisma generate
docker-compose exec -T backend pnpm prisma migrate deploy

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend:   http://localhost:3000/api" -ForegroundColor Cyan
Write-Host "Database:  localhost:5432" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f          # View logs" -ForegroundColor White
Write-Host "  docker-compose down             # Stop services" -ForegroundColor White
Write-Host "  docker-compose exec backend sh  # Backend shell" -ForegroundColor White
Write-Host "  make help                       # See all commands" -ForegroundColor White
Write-Host ""

