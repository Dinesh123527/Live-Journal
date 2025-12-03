# Voice Journal Commands Guide 🎤

## Overview
Your voice journal now supports intelligent voice commands that automatically parse your speech to fill in the entry fields and execute actions!

## How It Works

When you speak, the system listens for specific command patterns and automatically:
- Sets the title field
- Adds content to the body
- Adds tags
- Publishes the entry
- Clears content

## Voice Commands You Can Use

### 1. Set Title
**Command:** `"Title is [your title]"` or `"Title: [your title]"` or `"[your title] as title"`

**Examples:**
- "Title is My Amazing Day"
- "Title: Weekend Adventure"
- "The title is Reflections on Life"
- "Hello as title"
- "Morning Reflections as the title"

**Result:** The title field will be automatically filled with your spoken title, and you'll see a success message.

---

### 2. Add Body Content
**Command:** `"Body is [your content]"` or `"Content is [your content]"`

**Examples:**
- "Body is Today was an incredible day full of surprises"
- "Content is I learned something new about myself today"
- "Write Today I felt grateful for my family"

**Result:** Your spoken content will be added to the body field. If there's existing content, it will append with a line break.

---

### 3. Add Tags
**Command:** `"Add tags [tag1, tag2, tag3]"` or `"Tags are [tag1, tag2]"`

**Examples:**
- "Add tags fitness, health, motivation"
- "Tags are personal growth and mindfulness"
- "Add tag grateful"

**Result:** Tags will be automatically added to your entry. The system splits by commas, "and", or spaces. Maximum 10 tags allowed.

---

### 4. Publish Entry
**Command:** `"Publish entry"` or `"Submit"` or `"Save entry"`

**Examples:**
- "Publish entry"
- "Submit this"
- "Save entry"

**Result:** Your entry will be automatically published and you'll be redirected to the dashboard after 1 second. Note: Body content is required to publish.

---

### 5. Clear All Content
**Command:** `"Clear all"` or `"Reset"` or `"Start over"`

**Examples:**
- "Clear all"
- "Reset everything"
- "Start over"

**Result:** All fields (title, body, and tags) will be cleared.

---

## Usage Examples

### Example 1: Complete Entry via Voice
```
1. Click "Start Voice Journal" on dashboard
2. Click "Start Recording" button
3. Say: "Title is My Meditation Journey"
4. Say: "Body is Today I practiced mindfulness for 20 minutes. I felt calm and centered."
5. Say: "Add tags meditation, mindfulness, wellness"
6. Say: "Publish entry"
```

### Example 2: Partial Voice + Manual Edit
```
1. Start recording
2. Say: "Title is Weekend Hiking Trip"
3. Say: "Body is Started early morning at 6am"
4. Stop recording
5. Manually type additional details
6. Manually add more tags
7. Click "Publish Entry" button
```

### Example 3: Free-form Speech + Manual Organization
```
1. Start recording
2. Speak freely: "Today was amazing. I woke up feeling energized..."
3. Stop recording
4. Click "Add to Entry" to append transcript
5. Manually set title
6. Manually add tags
7. Publish
```

---

## How Voice Commands Are Parsed

The system uses intelligent pattern matching to detect commands in your speech:

### Title Detection
- Looks for: `title is`, `title:`, `the title is`
- Extracts everything after the command until it encounters: period, "body", "tags", or "add"

### Body Detection
- Looks for: `body is`, `content is`, `write`
- Extracts everything after until: period, "title", "tags", "publish"

### Tags Detection
- Looks for: `add tags`, `tags are`, `tag is`, `tags:`
- Splits by: commas, "and", spaces
- Removes duplicates and limits to 10 tags

### Action Detection
- Publish: `publish`, `submit`, `save entry`
- Clear: `clear all`, `reset`, `start over`

---

## Visual Feedback

When voice commands are recognized, you'll see:
- ✅ **Success Alert**: "Title set: [title]"
- ✅ **Success Alert**: "Body content added!"
- ✅ **Success Alert**: "Tags added: [tag1, tag2]"
- ✅ **Success Alert**: "Publishing entry via voice command..."
- ✅ **Success Alert**: "Entry cleared!"

---

## Tips for Best Results

1. **Speak Clearly**: Enunciate commands clearly for better recognition
2. **Use Command Keywords**: Always say "Title is", "Body is", "Add tags" for best results
3. **Pause Between Commands**: Give a brief pause between different commands
4. **Check Visual Fields**: Watch the form fields update in real-time as you speak
5. **Combine with Manual**: Feel free to mix voice commands with manual typing

---

## Current Limitations

1. **Internet Required**: Voice recognition requires active internet connection
2. **English Only**: Currently optimized for English language
3. **Browser Compatibility**: Requires WebRTC support (Chrome, Edge, Firefox, Safari)
4. **Microphone Access**: Must grant microphone permission

---

## Troubleshooting

### Commands Not Working?
- Ensure you clicked "Start Recording" first
- Check that your microphone is working
- Speak clearly and at normal pace
- Try using exact command phrases from examples above

### Transcript Not Appearing?
- Check browser console for errors
- Verify internet connection
- Refresh the page and try again
- Check that backend server is running

### Can't Publish?
- Ensure body field has content (required)
- Check that you're not in edit or draft mode
- Look for error messages in red alert boxes

---

## Advanced Usage

### Chaining Multiple Commands
You can speak multiple commands in sequence:
```
"Title is Daily Reflection. 
Body is Today I learned the importance of patience. 
Add tags personal growth, learning, patience. 
Publish entry."
```

The system will parse all commands and execute them in order!

---

## What's Different from Before?

**Previously:**
- Voice just transcribed everything you said into one text block
- You had to manually click "Add to Entry"
- No automatic field population

**Now:**
- Voice intelligently parses your commands
- Automatically fills title, body, and tags
- Can automatically publish
- Real-time feedback with success messages
- Visual indicators when fields update

---

## Need Help?

If voice commands aren't working as expected:
1. Check the browser console (F12) for error messages
2. Verify the transcript is appearing
3. Try using the exact command phrases from this guide
4. Fall back to manual "Add to Entry" button if needed

---

## Future Enhancements (Coming Soon)

- [ ] Voice command to change privacy setting
- [ ] Voice command to discard draft
- [ ] Multi-language support
- [ ] Custom command keywords
- [ ] Voice command history
- [ ] Undo voice command

---

**Enjoy your enhanced voice journaling experience!** 🎤✨
