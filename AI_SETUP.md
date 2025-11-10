# AI Integration Setup Guide

## Overview

The AI functionality in this application is located in `src/lib/deepseek.ts`. By default, it uses mock data, but you can configure it to use a real AI API.

## Current Location

- **File**: `src/lib/deepseek.ts`
- **Service**: `deepseekService.processMeetingNotes()`
- **Used by**: Meeting Processor page (`/meeting-processor`)

## Setting Up Real AI Integration

### Step 1: Get an API Key

Choose an AI service provider:
- **Deepseek**: https://platform.deepseek.com/
- **OpenAI**: https://platform.openai.com/
- **Anthropic (Claude)**: https://console.anthropic.com/
- **Any OpenAI-compatible API**

### Step 2: Create Environment File

Create a `.env` file in the root of your project:

```env
VITE_AI_API_KEY=sk-your-api-key-here
VITE_AI_API_URL=https://api.deepseek.com/v1/chat/completions
```

**For different providers:**

**OpenAI:**
```env
VITE_AI_API_KEY=sk-your-openai-key
VITE_AI_API_URL=https://api.openai.com/v1/chat/completions
```

**Anthropic (Claude):**
```env
VITE_AI_API_KEY=sk-ant-your-key
VITE_AI_API_URL=https://api.anthropic.com/v1/messages
```

### Step 3: Update the Service (if needed)

The current implementation in `src/lib/deepseek.ts` supports OpenAI-compatible APIs. If you're using a different API format, you may need to modify the request format.

### Step 4: Restart Development Server

After adding the environment variables, restart your development server:

```bash
pnpm run dev
```

## How It Works

1. When you process meeting notes on the Meeting Processor page, it calls `deepseekService.processMeetingNotes()`
2. If `VITE_AI_API_KEY` is set, it makes a real API call
3. If not set, it uses mock data (for development/testing)

## Testing

1. Navigate to `/meeting-processor`
2. Enter meeting notes
3. Click "Process Meeting Notes"
4. If configured correctly, you'll see real AI-generated task suggestions
5. If not configured, you'll see mock suggestions

## Security Notes

⚠️ **CRITICAL SECURITY RULES**:

1. **NEVER hardcode API keys in source files!**
   - The code uses environment variables (`VITE_AI_API_KEY`)
   - Never add API keys directly to `src/lib/deepseek.ts` or any other code file

2. **Never commit `.env` file to version control!**
   - `.env` should be in `.gitignore` (already configured)
   - Use `.env.example` as a template (without real keys)

3. **For Production (Vercel)**:
   - Use Vercel environment variables (not `.env` file)
   - API keys are exposed in frontend code (VITE_ prefix makes them public)
   - Consider using a backend proxy for better security

## Troubleshooting

### "AI API error" in console
- Check that your API key is correct
- Verify the API URL is correct for your provider
- Check your API quota/limits
- Ensure CORS is enabled if testing locally

### Still seeing mock data
- Make sure `.env` file is in the project root
- Restart the dev server after creating `.env`
- Check that variable names start with `VITE_`
- Check browser console for errors

## Customizing the AI Prompt

To change how the AI processes meeting notes, edit the `system` message in `src/lib/deepseek.ts`:

```typescript
{
  role: 'system',
  content: 'Your custom prompt here...',
}
```

