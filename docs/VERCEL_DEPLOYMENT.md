# Vercel Deployment Guide

## Prerequisites

1. **Supabase Project Setup**
   - Create a Supabase account at https://supabase.com
   - Create a new project
   - Run the SQL migration from `supabase-migration.sql` in your Supabase SQL Editor

2. **Get Your Supabase Credentials**
   - Go to your Supabase project dashboard
   - Navigate to **Settings** → **API**
   - Copy your **Project URL** and **anon/public key**

## Step 1: Deploy to Vercel

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to https://vercel.com and sign in
3. Click **"New Project"**
4. Import your repository
5. Vercel will auto-detect it's a Vite project

## Step 2: Configure Environment Variables

In your Vercel project settings, go to **Settings** → **Environment Variables** and add:

### Required Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Optional: AI Configuration

If you want to use real AI functionality:

```
VITE_AI_API_KEY=sk-your-api-key-here
VITE_AI_API_URL=https://api.deepseek.com/v1/chat/completions
```

**For different AI providers:**

**OpenAI:**
```
VITE_AI_API_KEY=sk-your-openai-key
VITE_AI_API_URL=https://api.openai.com/v1/chat/completions
```

**Anthropic (Claude):**
```
VITE_AI_API_KEY=sk-ant-your-key
VITE_AI_API_URL=https://api.anthropic.com/v1/messages
```

## Step 3: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete
3. Your app will be live at `https://your-project.vercel.app`

## Step 4: Verify Database Setup

After deployment, make sure:

1. ✅ You've run `supabase-migration.sql` in your Supabase SQL Editor
2. ✅ All tables are created (projects, tasks, time_entries, meetings, ai_suggestions)
3. ✅ Row Level Security (RLS) policies are active

## Step 5: Configure SPA Routing (Important!)

For Vercel to properly handle client-side routing (React Router), you need a `vercel.json` file in your project root. This file has been created and should be committed to your repository.

**What it does:**
- Redirects all routes (like `/admin`, `/settings`, `/tasks/:id`) to `index.html`
- Allows React Router to handle routing on the client side
- Prevents 404 errors when navigating directly to routes

**If you still get 404 errors:**
1. Make sure `vercel.json` is in your project root
2. Redeploy your application in Vercel
3. Clear your browser cache and try again

## Troubleshooting

### 404 Errors on Routes (e.g., `/admin`, `/settings`)

**Cause**: Vercel doesn't know how to handle client-side routes.

**Solution**:
1. Ensure `vercel.json` exists in your project root
2. The file should contain the rewrite rules (already included)
3. Redeploy your application
4. Try accessing the route again

### "Failed to create project" Error

**Cause**: Database tables don't exist or RLS policies are blocking access.

**Solution**:
1. Go to your Supabase dashboard
2. Open **SQL Editor**
3. Copy and paste the entire `supabase-migration.sql` file
4. Click **Run**
5. Verify tables exist in **Table Editor**

### Blank Screen on Tasks Page

**Cause**: Database connection issue or tables missing.

**Solution**:
1. Check browser console for errors
2. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly in Vercel
3. Make sure you've run the SQL migration
4. Check Supabase project is active

### AI Not Working

**Cause**: API key not configured or incorrect.

**Solution**:
1. Verify `VITE_AI_API_KEY` is set in Vercel environment variables
2. Check API key is valid and has credits/quota
3. Verify `VITE_AI_API_URL` matches your provider
4. Check browser console for API errors

### Environment Variables Not Working

**Important**: After adding/changing environment variables in Vercel:
1. Go to **Deployments** tab
2. Click the **three dots** on the latest deployment
3. Click **Redeploy**
4. This ensures new environment variables are picked up

## Security Notes

⚠️ **Important for Production**:

1. **Supabase Keys**: The anon key is safe to expose in frontend code (it's designed for this)
2. **AI API Keys**: These are exposed in the frontend. For production, consider:
   - Using a backend proxy to hide API keys
   - Setting up Vercel serverless functions to handle AI calls
   - Using Supabase Edge Functions for AI processing

## Local Development

For local development, create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_AI_API_KEY=sk-your-api-key-here
VITE_AI_API_URL=https://api.deepseek.com/v1/chat/completions
```

**Never commit `.env` to git!** It should be in `.gitignore`.

## Quick Checklist

Before deploying:
- [ ] Supabase project created
- [ ] SQL migration run in Supabase
- [ ] Supabase URL and anon key copied
- [ ] Environment variables set in Vercel
- [ ] AI API key configured (optional)
- [ ] Code pushed to repository
- [ ] Vercel project connected to repository

After deployment:
- [ ] Test user registration
- [ ] Test project creation
- [ ] Test task creation
- [ ] Test time tracking
- [ ] Test AI meeting processor (if configured)

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify Supabase connection in Supabase dashboard
4. Review `SETUP_GUIDE.md` for database setup


