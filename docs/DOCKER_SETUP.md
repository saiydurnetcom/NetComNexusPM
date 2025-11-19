# Docker Setup Guide

This guide explains how to run the NexusPM application using Docker and Docker Compose for development.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Git

## Quick Start

### Option 1: Using Quick Start Scripts (Recommended)

**Windows (PowerShell):**
```powershell
.\docker-start.ps1
```

**Linux/Mac:**
```bash
chmod +x docker-start.sh
./docker-start.sh
```

### Option 2: Manual Setup

1. **Clone the repository** (if you haven't already)
   ```bash
   git clone <your-repo-url>
   cd NetComNexusPM
   ```

2. **Create environment file**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and update the values as needed (especially `JWT_SECRET` for production).

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   docker-compose exec backend pnpm prisma migrate deploy
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/api
   - PostgreSQL: localhost:5432

## Development Workflow

### Starting Services

```bash
# Start all services in detached mode
docker-compose up -d

# Start with logs visible
docker-compose up

# Start specific service only
docker-compose up frontend
docker-compose up backend
docker-compose up postgres
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Running Commands

```bash
# Backend commands
docker-compose exec backend pnpm prisma migrate dev
docker-compose exec backend pnpm prisma studio
docker-compose exec backend pnpm test

# Frontend commands
docker-compose exec frontend pnpm lint
docker-compose exec frontend pnpm build
```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d nexuspm

# Run Prisma migrations
docker-compose exec backend pnpm prisma migrate deploy

# Open Prisma Studio
docker-compose exec backend pnpm prisma studio
```

## Environment Variables

Key environment variables (see `env.example`):

### Database
- `POSTGRES_USER` - PostgreSQL username (default: postgres)
- `POSTGRES_PASSWORD` - PostgreSQL password (default: postgres)
- `POSTGRES_DB` - Database name (default: nexuspm)
- `POSTGRES_PORT` - PostgreSQL port (default: 5432)

### Backend
- `JWT_SECRET` - Secret key for JWT tokens (**CHANGE IN PRODUCTION**)
- `JWT_EXPIRES_IN` - JWT expiration time (default: 7d)
- `CORS_ORIGIN` - Allowed CORS origins (default: http://localhost:5173)
- `DATABASE_URL` - Automatically set from PostgreSQL config

### Frontend
- `VITE_API_URL` - Backend API URL (default: http://localhost:3000/api)

### Optional: S3 Storage
- `S3_ENDPOINT` - S3-compatible storage endpoint
- `S3_ACCESS_KEY` - S3 access key
- `S3_SECRET_KEY` - S3 secret key
- `S3_BUCKET` - S3 bucket name
- `S3_REGION` - S3 region (default: us-east-1)
- `S3_USE_SSL` - Use SSL for S3 (default: false)

### Optional: AI Configuration
- `AI_API_KEY` - DeepSeek API key
- `AI_API_URL` - AI API endpoint
- `AI_MODEL` - AI model name

## Production Deployment

For production, use the production Docker Compose file:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Important**: Before running in production:
1. Change `JWT_SECRET` to a strong random string
2. Update `CORS_ORIGIN` to your production domain
3. Set secure `POSTGRES_PASSWORD`
4. Configure S3 storage for file uploads
5. Set up proper SSL/TLS certificates

## Troubleshooting

### Port Already in Use

If ports 3000, 5173, or 5432 are already in use, update them in `.env`:
```env
BACKEND_PORT=3001
FRONTEND_PORT=5174
POSTGRES_PORT=5433
```

### Database Connection Issues

1. Check if PostgreSQL is healthy:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify DATABASE_URL in backend:
   ```bash
   docker-compose exec backend env | grep DATABASE_URL
   ```

### Backend Won't Start

1. Check backend logs:
   ```bash
   docker-compose logs backend
   ```

2. Ensure Prisma Client is generated:
   ```bash
   docker-compose exec backend pnpm prisma generate
   ```

3. Run migrations:
   ```bash
   docker-compose exec backend pnpm prisma migrate deploy
   ```

### Frontend Build Issues

1. Clear node_modules and rebuild:
   ```bash
   docker-compose down
   docker-compose build --no-cache frontend
   docker-compose up frontend
   ```

### Reset Everything

To completely reset (WARNING: deletes all data):
```bash
docker-compose down -v
docker-compose up -d
docker-compose exec backend pnpm prisma migrate deploy
```

## Development Tips

1. **Hot Reload**: Both frontend and backend support hot reload in development mode
2. **Volume Mounts**: Source code is mounted as volumes, so changes reflect immediately
3. **Database Persistence**: Database data persists in Docker volume `postgres_data`
4. **Prisma Studio**: Access at http://localhost:5555 when running `pnpm prisma studio`

## File Structure

```
.
├── docker-compose.yml          # Development compose file
├── docker-compose.prod.yml     # Production compose file
├── Dockerfile.frontend         # Frontend Dockerfile
├── Dockerfile.backend          # Backend Dockerfile
├── .dockerignore              # Docker ignore file
├── backend/.dockerignore       # Backend-specific ignore file
├── nginx.conf                  # Nginx config for production frontend
├── env.example                # Environment variables template
├── Makefile                    # Make commands for common tasks
├── docker-start.ps1           # Windows quick start script
├── docker-start.sh            # Linux/Mac quick start script
└── DOCKER_SETUP.md            # This file
```

## Using Make Commands

For convenience, a `Makefile` is provided with common commands:

```bash
make help          # Show all available commands
make up            # Start all services
make down          # Stop all services
make logs          # View logs
make migrate       # Run database migrations
make studio        # Open Prisma Studio
make shell-backend # Open backend shell
make shell-db      # Connect to database
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Vite Documentation](https://vitejs.dev/)

