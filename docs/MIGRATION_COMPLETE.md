# Migration Complete

## Summary

The migration from Supabase to self-hosted NestJS backend + PostgreSQL has been completed.

## What Was Done

### Backend (NestJS)
✅ Created complete NestJS backend with:
- Authentication module (JWT, password hashing)
- All REST API endpoints for projects, tasks, time tracking, meetings, notifications, etc.
- Prisma ORM with complete schema
- S3-compatible file storage integration
- AI service moved to backend (API keys protected)
- All database functions converted to NestJS services

### Database
✅ Created PostgreSQL schema migration script
✅ Prisma schema with all tables and relationships
✅ Removed Supabase-specific features (RLS, auth.users references)

### Frontend Updates
✅ Created new API client (`api-client.ts`)
✅ Created new data service (`api-data.ts`) replacing `supabase-data.ts`
✅ Updated authentication to use REST API
✅ Updated all hooks to use new API client
✅ Updated imports across the codebase

## Remaining Tasks

### Files Still Using Supabase Directly
These files still have direct Supabase calls that need to be updated:
- `src/pages/TaskDetail.tsx` - File uploads (lines 373, 380, 428)
- `src/pages/Tasks.tsx` - Tag operations (lines 238, 246, 317, 319, 328, 336)
- `src/pages/Projects.tsx` - Tag operations (lines 134, 142)
- `src/pages/ProjectDetail.tsx` - Tag operations (lines 440, 448)
- `src/pages/Settings.tsx` - RPC call (line 419)
- `src/pages/Admin.tsx` - RPC call (line 97)
- `src/pages/MeetingDetail.tsx` - Direct queries (lines 296, 374)
- `src/lib/admin-service.ts` - RPC call (line 183)

### Next Steps

1. **Update file uploads in TaskDetail.tsx**:
   - Replace `supabase.storage` calls with `apiClient.uploadTaskAttachment()`
   - Use `apiClient.getAttachmentUrl()` for file URLs

2. **Update tag operations**:
   - Create tag endpoints in backend (or handle via project/task update endpoints)
   - Replace direct Supabase queries with API calls

3. **Update RPC calls**:
   - `get_current_user_role` → Use `/api/users/role` endpoint
   - `mark_all_notifications_read` → Use `/api/notifications/read-all` endpoint
   - `sync_users_from_auth` → Remove (no longer needed)

4. **Update MeetingDetail.tsx**:
   - Replace direct Supabase queries with API calls

5. **Environment Variables**:
   - Update `.env` files to use `VITE_API_URL` instead of Supabase URLs
   - Remove `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

6. **Testing**:
   - Test all endpoints
   - Test authentication flows
   - Test file uploads
   - Test all CRUD operations

## Configuration

### Backend `.env`
```env
DATABASE_URL="postgresql://user:password@localhost:5432/nexuspm"
JWT_SECRET="your-secret-key"
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="nexuspm-attachments"
AI_API_KEY="your-ai-api-key"
```

### Frontend `.env`
```env
VITE_API_URL="http://localhost:3000/api"
```

## Database Setup

1. Run the migration script:
```bash
psql -U postgres -d nexuspm -f backend/prisma/migrations/0001_initial_schema.sql
```

2. Or use Prisma migrations:
```bash
cd backend
npx prisma migrate dev
```

## Starting the Application

1. Start PostgreSQL database
2. Start backend:
```bash
cd backend
npm install
npm run start:dev
```

3. Start frontend:
```bash
npm install
npm run dev
```

## Notes

- The old `supabase-data.ts` file is still present but should be replaced with `api-data.ts`
- Some components may still import from `supabase.ts` - these need to be updated
- File storage uses S3-compatible storage (MinIO recommended for local development)
- AI API keys are now stored securely on the backend

