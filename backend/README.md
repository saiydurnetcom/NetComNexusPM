# NexusPM Backend

NestJS backend for NexusPM - migrated from Supabase to self-hosted PostgreSQL.

## Setup

1. Install dependencies:
```bash
npm install
# or
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up database:
```bash
# Run Prisma migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

4. Start the server:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api`

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `S3_ENDPOINT` - S3-compatible storage endpoint (MinIO, AWS S3, etc.)
- `AI_API_KEY` - API key for AI service (DeepSeek, etc.)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get current user profile

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/tasks` - List tasks (optional `?projectId=...`)
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task details
- `PATCH /api/tasks/:id` - Update task
- `PATCH /api/tasks/:id/status` - Update task status
- `DELETE /api/tasks/:id` - Delete task

### Time Tracking
- `GET /api/time/entries` - Get time entries
- `GET /api/time/active` - Get active timer
- `POST /api/time/start` - Start timer
- `POST /api/time/:id/stop` - Stop timer
- `POST /api/time/entries` - Create manual time entry
- `PATCH /api/time/entries/:id` - Update time entry
- `DELETE /api/time/entries/:id` - Delete time entry

### Meetings & AI
- `GET /api/meetings` - List meetings
- `POST /api/meetings` - Create meeting
- `POST /api/meetings/:id/process` - Process meeting with AI
- `GET /api/suggestions` - Get AI suggestions
- `POST /api/suggestions/:id/approve` - Approve suggestion
- `POST /api/suggestions/:id/reject` - Reject suggestion

### Notifications
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Storage
- `POST /api/storage/tasks/:taskId/attachments` - Upload file
- `GET /api/storage/attachments/:id/url` - Get signed URL
- `DELETE /api/storage/attachments/:id` - Delete attachment

## Database Schema

The database schema is defined in `prisma/schema.prisma`. Run migrations to apply changes:

```bash
npx prisma migrate dev
```

## Development

- `npm run start:dev` - Start in development mode with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run lint` - Run linter
- `npm run test` - Run tests

## Architecture

- **NestJS** - Framework
- **Prisma** - ORM
- **PostgreSQL** - Database
- **JWT** - Authentication
- **S3-compatible storage** - File storage (MinIO, AWS S3, etc.)

## Migration from Supabase

This backend replaces Supabase with:
- NestJS REST API instead of Supabase client
- JWT authentication instead of Supabase Auth
- Self-hosted PostgreSQL instead of Supabase PostgreSQL
- S3-compatible storage instead of Supabase Storage
- NestJS services instead of Supabase RPC functions

