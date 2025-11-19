# AI Functionality Explained

## What Does the AI Do?

The AI functionality in this application is designed to **automatically extract actionable tasks from meeting notes**.

### Workflow:

1. **User enters meeting notes** on the Meeting Processor page (`/meeting-processor`)
2. **AI analyzes the notes** and identifies action items, tasks, and follow-ups
3. **AI generates task suggestions** with:
   - Task title (what needs to be done)
   - Original text (excerpt from meeting notes that led to this suggestion)
   - Confidence score (0-1, how certain the AI is about this suggestion)
4. **User reviews suggestions** and can:
   - **Approve** → Creates an actual task in the system
   - **Reject** → Discards the suggestion (with optional reason)
5. **Approved suggestions become tasks** that can be tracked, assigned, and managed

### Example:

**Input (Meeting Notes):**
```
Team meeting - Q4 Planning
- Need to update the dashboard by Friday
- Sarah will review the design mockups
- Schedule client presentation for next week
- Follow up on the budget approval
```

**AI Output (Suggestions):**
1. "Update dashboard by Friday" (Confidence: 0.92)
2. "Review design mockups" (Confidence: 0.85)
3. "Schedule client presentation" (Confidence: 0.88)
4. "Follow up on budget approval" (Confidence: 0.79)

## Where is the AI Code?

- **File**: `src/lib/deepseek.ts`
- **Function**: `deepseekService.processMeetingNotes()`
- **Used by**: Meeting Processor page (`src/pages/MeetingProcessor.tsx`)

## Security: API Key Configuration

⚠️ **IMPORTANT**: API keys are **NEVER hardcoded** in the codebase!

### How It Works:

1. The code reads from environment variables: `VITE_AI_API_KEY` and `VITE_AI_API_URL`
2. If environment variables are set → Uses real AI API
3. If not set → Uses mock data (for development/testing)

### Configuration Methods:

#### Option 1: Local Development (.env file)

Create a `.env` file in the project root (this file is in `.gitignore`):

```env
VITE_AI_API_KEY=sk-your-api-key-here
VITE_AI_API_URL=https://api.deepseek.com/v1/chat/completions
```

**Never commit `.env` to git!**

#### Option 2: Vercel Deployment

1. Go to Vercel project → **Settings** → **Environment Variables**
2. Add:
   - `VITE_AI_API_KEY` = your API key
   - `VITE_AI_API_URL` = API endpoint URL
3. **Redeploy** after adding variables

See `VERCEL_DEPLOYMENT.md` for detailed instructions.

## Supported AI Providers

The code supports any **OpenAI-compatible API**, including:

- **Deepseek** (default)
- **OpenAI** (GPT-3.5, GPT-4)
- **Anthropic** (Claude) - may need request format adjustment
- **Any OpenAI-compatible service**

### Provider-Specific Configuration:

**Deepseek:**
```env
VITE_AI_API_KEY=sk-your-deepseek-key
VITE_AI_API_URL=https://api.deepseek.com/v1/chat/completions
```

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
*Note: Anthropic uses a different API format, so you may need to modify `src/lib/deepseek.ts`*

## How to Test

1. **Without API Key** (Mock Mode):
   - Don't set any environment variables
   - Go to `/meeting-processor`
   - Enter meeting notes
   - Click "Process Meeting Notes"
   - You'll see mock suggestions (for testing UI)

2. **With API Key** (Real AI):
   - Set `VITE_AI_API_KEY` and `VITE_AI_API_URL`
   - Restart dev server
   - Go to `/meeting-processor`
   - Enter meeting notes
   - Click "Process Meeting Notes"
   - You'll see real AI-generated suggestions

## Current Implementation

The AI service:
- ✅ Uses environment variables (secure)
- ✅ Falls back to mock data if no API key
- ✅ Supports OpenAI-compatible APIs
- ✅ Extracts actionable tasks from meeting notes
- ✅ Returns structured suggestions with confidence scores

## Security Best Practices

✅ **DO:**
- Use environment variables
- Add `.env` to `.gitignore`
- Use Vercel environment variables for production
- Rotate API keys regularly

❌ **DON'T:**
- Hardcode API keys in source files
- Commit `.env` files to git
- Share API keys in screenshots or documentation
- Use the same key for development and production

## Troubleshooting

### AI not working / showing mock data
- Check environment variables are set correctly
- Restart dev server after adding `.env` file
- For Vercel: Redeploy after adding environment variables
- Check browser console for API errors

### API errors
- Verify API key is valid
- Check API quota/limits
- Verify API URL is correct
- Check CORS settings (if testing locally)

## Future Enhancements

Potential improvements:
- Support for multiple AI providers with automatic fallback
- Custom prompts per project
- Learning from user approvals/rejections
- Integration with calendar for automatic meeting note import
- Email integration for meeting summaries

