# Vapi Assistant Configuration Guide

## Issue: "Meeting ended due to ejection" Error

This error occurs when the Vapi assistant isn't properly configured on the Vapi dashboard. Here's how to fix it:

## Step 1: Check Your Vapi Dashboard

1. Go to https://dashboard.vapi.ai
2. Log in with your account
3. Navigate to "Assistants" section
4. Find your assistant with ID: `f723c343-5c56-4a41-b943-14908d976aea`

## Step 2: Configure the Assistant Properly

Your assistant needs these basic settings:

### Basic Configuration:
- **Name**: Journal Voice Assistant
- **Model**: Choose a provider (OpenAI GPT-4, GPT-3.5-turbo, or Claude)
- **Voice**: Select a voice provider (ElevenLabs, PlayHT, or Deepgram)
- **First Message**: "Hello! I'm your voice journal assistant. You can dictate your journal entry, and I'll help you organize it. Try saying 'Title is...' or 'Body is...' to get started."

### Required Settings:
1. **Transcription Provider**: Must be configured (Deepgram recommended)
2. **End Call Conditions**: Set appropriate timeout (e.g., 300 seconds of silence)
3. **Background Messages**: Enabled for real-time transcription

## Step 3: Optional Function Calling (Advanced)

If you want the assistant to be more intelligent, add these function definitions:

```json
{
  "functions": [
    {
      "name": "setTitle",
      "description": "Sets the journal entry title",
      "parameters": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "description": "The title of the journal entry"
          }
        },
        "required": ["title"]
      }
    },
    {
      "name": "setBody",
      "description": "Sets or appends to the journal entry body content",
      "parameters": {
        "type": "object",
        "properties": {
          "body": {
            "type": "string",
            "description": "The body content of the journal entry"
          }
        },
        "required": ["body"]
      }
    },
    {
      "name": "addTags",
      "description": "Adds tags to the journal entry",
      "parameters": {
        "type": "object",
        "properties": {
          "tags": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Array of tags to add"
          }
        },
        "required": ["tags"]
      }
    },
    {
      "name": "publishEntry",
      "description": "Publishes the journal entry",
      "parameters": {
        "type": "object",
        "properties": {}
      }
    }
  ]
}
```

## Step 4: Check Account Status

1. Verify your Vapi account has sufficient credits
2. Check if your assistant is in "Active" status
3. Ensure your Public Key is valid

## Alternative: Create a New Assistant

If the existing assistant is broken, create a new one:

1. Click "Create Assistant" on Vapi dashboard
2. Fill in the basic details:
   - **Name**: Voice Journal Assistant
   - **First Message**: "I'm ready to help you journal. Start speaking!"
   - **Model**: GPT-3.5-turbo or GPT-4
   - **Voice Provider**: Choose any (ElevenLabs Nova recommended)
   
3. Under "Advanced Settings":
   - Enable background messages
   - Set transcription provider to Deepgram
   - Set end call on silence: 60 seconds
   
4. Copy the new Assistant ID

5. Update your backend `.env` file:
   ```
   VAPI_ASSISTANT_ID=<your-new-assistant-id>
   ```

6. Restart your backend server

## Simplified Mode (No Functions)

The app now works in simplified mode even if function calling isn't configured:
- Voice commands are parsed from the transcript using regex
- "Title is...", "Body is...", "Add tags..." still work
- No need for complex assistant configuration

## Testing

After configuration, test with:
1. Click "Start Voice Journal"
2. Click "Start Recording"
3. Say: "Title is Test Entry"
4. Check if the title field updates
5. Say: "Body is This is a test"
6. Check if the body field updates

## Common Issues

### Issue: Call starts then immediately ends
**Solution**: Check that your assistant has:
- A valid model selected
- A voice provider configured
- Transcription provider enabled

### Issue: No transcript appearing
**Solution**: 
- Ensure transcription provider is Deepgram
- Enable "Background Messages" in assistant settings
- Check browser console for detailed errors

### Issue: Commands not parsing
**Solution**: 
- This is handled by the frontend now
- Even without function calling, commands will be parsed from transcript
- Make sure to use exact phrases: "Title is...", "Body is..."

## Current Configuration Status

Your current credentials:
- Public Key: `91048021-e8c7-4052-9bc8-4b8b5fff3b3e`
- Assistant ID: `f723c343-5c56-4a41-b943-14908d976aea`
- Private Key: `fb320eb9-2be9-4443-863a-c6004949c2b3`

## Need Help?

If issues persist:
1. Check Vapi dashboard logs for detailed errors
2. Verify your account is active and has credits
3. Try creating a completely new assistant from scratch
4. Contact Vapi support at support@vapi.ai

## Fallback Option

If Vapi continues to have issues, you can temporarily disable the voice journal feature by:
1. Removing the "Start Voice Journal" button from Dashboard.jsx
2. Or implementing a different voice recognition solution (Web Speech API)

---

**Updated**: Added better error messages in the frontend to help diagnose issues.

