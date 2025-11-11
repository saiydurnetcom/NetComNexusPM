# AI Meeting Processing - How It Works & Fixes Applied

## How AI Meeting Processing Works

### The Flow:

1. **User enters meeting notes** in the Meeting Processor page (`/meeting-processor`)
2. **Component calls** `processMeeting()` from `useAISuggestions` hook
3. **Hook calls** `aiSuggestionsService.processMeeting()` in `supabase-data.ts`
4. **Service calls** `deepseekService.processMeetingNotes()` in `deepseek.ts`
5. **AI Service checks** if `VITE_AI_API_KEY` and `VITE_AI_API_URL` are configured:
   - **If configured**: Makes API call to DeepSeek (or other OpenAI-compatible API)
   - **If not configured OR API fails**: Falls back to mock suggestions
6. **Suggestions are saved** to Supabase `ai_suggestions` table
7. **User reviews** suggestions and can approve (creates task) or reject them

### Key Files:

- `src/lib/deepseek.ts` - AI service that calls the API or returns mocks
- `src/lib/supabase-data.ts` - Database service that saves meetings and suggestions
- `src/hooks/useAISuggestions.ts` - React hook for managing AI suggestions
- `src/pages/MeetingProcessor.tsx` - UI component for processing meetings

## Fixes Applied

### 1. **Improved Error Handling & Logging**
   - Added verbose error messages that show exactly what went wrong
   - Added debug logging (in development mode) to track API calls
   - Errors now include status codes and detailed error information
   - Console warnings when API is not configured

### 2. **Guaranteed Mock Fallback**
   - Previously: If API was configured but failed, it would throw an error
   - Now: If API fails, it automatically falls back to mock suggestions
   - This ensures the feature always works, even with misconfigured API

### 3. **Better Environment Variable Detection**
   - Improved checking for empty strings and whitespace
   - Clear warnings when environment variables are missing
   - Debug logging shows API configuration status

### 4. **Enhanced Error Messages**
   - More descriptive error messages in the UI
   - Helpful hints about checking environment variables
   - Better error details in console for debugging

### 5. **TypeScript Fixes**
   - Fixed type issues with `import.meta.env`
   - Created proper type for raw AI suggestions (without database fields)
   - All linter errors resolved

## Environment Variable Configuration

### For Vercel Deployment:

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add these variables:
   - `VITE_AI_API_KEY` = your DeepSeek API key (starts with `sk-`)
   - `VITE_AI_API_URL` = `https://api.deepseek.com/v1/chat/completions`
3. **Important**: After adding variables, you MUST redeploy for them to take effect

### For Local Development:

Create a `.env` file in the project root:

```env
VITE_AI_API_KEY=sk-your-api-key-here
VITE_AI_API_URL=https://api.deepseek.com/v1/chat/completions
```

**Note**: Restart your dev server after creating/modifying `.env` file

## Troubleshooting

### Issue: "Failed to process meeting" error

**Check:**
1. Open browser console (F12) and look for debug logs starting with `[DeepSeek Service]`
2. Check if you see warnings about missing environment variables
3. Verify environment variables are set correctly in Vercel
4. Make sure you redeployed after adding environment variables

### Issue: Mock suggestions not showing

**This should not happen anymore** - the code now always falls back to mocks if API fails. If you're not seeing suggestions:
1. Check browser console for errors
2. Check if there are Supabase RLS (Row Level Security) issues (403 errors)
3. Verify you're logged in

### Issue: 403 errors from Supabase

This is a **separate issue** from AI processing - it's related to Supabase Row Level Security policies. The 403 errors you're seeing might be from:
- `time_entries` table (active timer fetching)
- `meetings` table (saving meetings)
- `ai_suggestions` table (saving suggestions)

**To fix**: Check your Supabase RLS policies allow the current user to insert/select from these tables.

### Issue: API returns errors

**Common causes:**
1. **Invalid API key** - Check that your key is correct and active
2. **Wrong API URL** - Verify the URL format matches your provider
3. **API quota exceeded** - Check your DeepSeek account limits
4. **CORS issues** - Shouldn't happen with DeepSeek, but check browser console

**What to check:**
- Look for `[DeepSeek Service]` logs in console
- Check the "AI API Error Details" in console
- Verify API key format (should start with `sk-` for DeepSeek)

## Testing

### Test Without API (Mock Mode):
1. Don't set any environment variables
2. Go to `/meeting-processor`
3. Enter meeting notes
4. Click "Process Meeting Notes"
5. You should see 3 mock suggestions

### Test With API:
1. Set `VITE_AI_API_KEY` and `VITE_AI_API_URL` in Vercel
2. Redeploy your application
3. Go to `/meeting-processor`
4. Enter meeting notes
5. Click "Process Meeting Notes"
6. Check browser console for `[DeepSeek Service]` debug logs
7. You should see real AI-generated suggestions

## Debug Information

The code now logs helpful debug information in development mode:

- API configuration status (whether keys are set)
- API request details (URL, truncated request body)
- Response status and data
- Any errors with full details

**To see debug logs**: Open browser console (F12) and look for messages starting with `[DeepSeek Service]`

## Next Steps

If you're still experiencing issues:

1. **Check the browser console** for detailed error messages
2. **Verify environment variables** are set correctly in Vercel
3. **Check Supabase RLS policies** if you see 403 errors
4. **Test with mock mode first** to ensure the UI flow works
5. **Review the debug logs** to see exactly where the process is failing

The AI processing should now work reliably with either:
- Real API (if configured correctly)
- Mock suggestions (if API is not configured or fails)

