# Setup Guide - NexusPM Application

## What Was Fixed

✅ **All major issues have been resolved:**

1. **Replaced missing backend API with Supabase direct integration**
   - All hooks now use Supabase directly instead of the non-existent API
   - Data operations (projects, tasks, time tracking) now work

2. **Added Time Sheet Entry functionality**
   - New "Add Time Sheet" button on Time Tracking page
   - Manual time entry form with task selection, start/end times, description, and billable flag

3. **Fixed missing UI features**
   - Added "Start Timer" button to tasks in Project Detail page
   - Fixed Dashboard quick action buttons to navigate properly
   - Implemented approve/reject functionality in Meeting Processor
   - Added back navigation to Project Detail page

4. **Improved error handling**
   - Added toast notifications for success/error states
   - Better user feedback throughout the application

## Database Setup

### Step 1: Run the SQL Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase-migration.sql` from this project
4. Copy and paste the entire SQL script into the SQL Editor
5. Click **Run** to execute the migration

This will create:
- `projects` table
- `tasks` table
- `time_entries` table
- `meetings` table
- `ai_suggestions` table
- All necessary indexes
- Row Level Security (RLS) policies

### Step 2: Verify Tables

After running the migration, verify that all tables were created:
- Go to **Table Editor** in Supabase
- You should see all 5 tables listed

## Application Features

### ✅ Working Features

1. **Authentication**
   - User registration
   - User login/logout
   - Protected routes

2. **Project Management**
   - Create projects
   - View project list
   - View project details
   - Search projects

3. **Task Management**
   - Create tasks within projects
   - Update task status (todo, in_progress, completed)
   - View tasks by project

4. **Time Tracking**
   - Start timer for tasks
   - Stop active timer
   - **Add manual time sheet entries** (NEW!)
   - View time entries by date
   - See active timer status

5. **AI Meeting Processor**
   - Process meeting notes
   - View AI-generated task suggestions
   - Approve suggestions (creates tasks)
   - Reject suggestions with reason

6. **Dashboard**
   - View project/task statistics
   - Quick navigation to key features
   - Recent projects and tasks

## How to Use

### Adding a Time Sheet Entry

1. Navigate to **Time Tracking** page
2. Click **"Add Time Sheet"** button
3. Select a task from the dropdown
4. Enter start and end times
5. Add a description (optional)
6. Check "Billable" if applicable
7. Click **"Add Time Entry"**

### Starting a Timer

1. Go to a project detail page
2. Find the task you want to track
3. Click the **"Start"** button next to the task
4. The timer will run until you stop it
5. Stop the timer from the Time Tracking page

### Processing Meeting Notes

1. Navigate to **Meeting Processor** page
2. Enter meeting title
3. Select a project
4. Enter meeting date
5. Paste meeting notes
6. Click **"Process Meeting Notes"**
7. Review AI suggestions
8. Approve or reject each suggestion

## Important Notes

⚠️ **AI Functionality**: The AI meeting processor currently uses mock data. To enable real AI processing:
- Integrate with Deepseek API or another AI service
- Update `src/lib/deepseek.ts` with actual API calls
- Add API keys to environment variables

⚠️ **Row Level Security**: The database uses RLS policies to ensure users can only access their own data. All policies are configured in the migration file.

## Troubleshooting

### "Failed to fetch projects" error
- Make sure you've run the SQL migration
- Check that you're logged in
- Verify Supabase connection in browser console

### Timer won't start
- Make sure you've stopped any existing active timer
- Check that the task exists and belongs to a project

### Can't see time entries
- Make sure you've created time entries (either via timer or manual entry)
- Check the date filter on the Time Tracking page

## Next Steps

1. **Set up real AI integration** (optional)
   - Get API key from Deepseek, OpenAI, or similar service
   - **NEVER hardcode API keys in source files!**
   - For local: Create `.env` file with `VITE_AI_API_KEY` and `VITE_AI_API_URL`
   - For Vercel: Add environment variables in project settings
   - See `AI_FUNCTIONALITY_EXPLAINED.md` for details

2. **Customize UI** (optional)
   - Modify colors, fonts, layouts in Tailwind config
   - Update component styles

3. **Add more features** (optional)
   - Export time entries
   - Project reports
   - Team collaboration features

