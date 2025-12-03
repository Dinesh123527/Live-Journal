# Writing Streaks - Implementation Summary

## Overview
The writing streaks feature tracks how many consecutive days a user has written journal entries, motivating them to maintain their journaling habit.

## What Was Fixed

### Problem
- Streak data existed in the `writing_streaks` table but was only calculated by a background job
- When users created new entries, their streaks wouldn't update in real-time
- Dashboard showed streak data but it was often outdated or zero

### Solution
Created a real-time streak calculator that updates immediately when entries are created or deleted.

## Implementation Details

### 1. New Utility File: `streakCalculator.js`
**Location:** `livejournal-backend/utils/streakCalculator.js`

**Key Functions:**
- `updateUserStreak(userId)` - Calculates and updates streaks in real-time
- `getUserStreak(userId)` - Retrieves current streak data

**How It Works:**
1. Fetches all distinct dates the user has written entries (descending order)
2. Calculates **Current Streak**:
   - Counts consecutive days backward from today
   - If user wrote today or yesterday, streak is active
   - Otherwise, streak is reset to 0
3. Calculates **Longest Streak**:
   - Finds the longest sequence of consecutive days in history
   - Ensures longest streak is at least as long as current streak
4. Updates the `writing_streaks` table in the database

### 2. Integration with Entries Controller
**Updated:** `livejournal-backend/controllers/entriesController.js`

**Changes Made:**
- Imported `updateUserStreak` from streakCalculator utility
- Added streak update call in `createEntry()` function (after entry is created)
- Added streak update call in `deleteEntry()` function (after entry is deleted)
- Streak updates are non-blocking - if they fail, the entry operation still succeeds

### 3. Analytics API Endpoint
**Endpoint:** `GET /api/analytics/streaks`
**Controller:** `analyticsController.js`

**Returns:**
```json
{
  "data": {
    "current_streak": 5,
    "longest_streak": 12,
    "last_written_date": "2025-12-01"
  }
}
```

## How Streaks Are Calculated

### Current Streak
- Starts from today and counts backward
- Only counts consecutive days
- Examples:
  - Wrote today: streak continues
  - Wrote yesterday but not today: streak continues (grace period)
  - Last entry was 2+ days ago: streak = 0 (broken)

### Longest Streak
- Scans entire entry history
- Finds the longest sequence of consecutive days
- Always at least as long as current streak
- Persists even when current streak breaks

## Dashboard Integration

The dashboard displays:
1. **Current Streak** - Shows with a flame icon (🔥)
2. **Longest Streak** - Shows with a trophy icon (🏆)
3. Updates in real-time when users create new entries

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS writing_streaks (
  user_id INT PRIMARY KEY,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_written_date DATE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
```

## Example User Flow

1. **Day 1:** User writes first entry
   - Current streak: 1 day
   - Longest streak: 1 day

2. **Day 2:** User writes another entry
   - Current streak: 2 days
   - Longest streak: 2 days

3. **Day 3:** User writes again
   - Current streak: 3 days
   - Longest streak: 3 days

4. **Day 5:** User writes (skipped Day 4)
   - Current streak: 1 day (reset)
   - Longest streak: 3 days (preserved)

5. **Days 6-10:** User writes daily
   - Current streak: 6 days
   - Longest streak: 6 days (new record!)

## Benefits

✅ **Real-time Updates** - Streaks update immediately when entries are created
✅ **Motivation** - Users can see their progress and maintain their writing habit
✅ **Gamification** - Longest streak provides a long-term goal
✅ **Performance** - Non-blocking updates don't slow down entry creation
✅ **Reliability** - Streak updates won't cause entry creation to fail

## Testing Recommendations

1. Create an entry and verify streak increments
2. Create entries on consecutive days and verify streak grows
3. Skip a day and verify current streak resets but longest streak persists
4. Delete an entry and verify streaks recalculate correctly
5. Check dashboard displays correct streak data

## Future Enhancements

- Add streak notifications when users reach milestones (7 days, 30 days, etc.)
- Display streak history/graph showing ups and downs
- Add streak recovery mechanic (allow 1 missed day per week)
- Streak achievements and badges

