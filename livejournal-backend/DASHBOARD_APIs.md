# Dashboard API Integration Guide

## 📡 Available APIs for Dashboard

### 1. User Profile
**GET /api/auth/me**
- Returns: User profile information
- Headers: Authorization with access token

### 2. Writing Streak Info
**GET /api/analytics/streaks**
- Returns: 
  ```json
  {
    "data": {
      "current_streak": 5,
      "longest_streak": 12,
      "last_written_date": "2025-11-30"
    }
  }
  ```

### 3. Latest Draft
**GET /api/drafts/latest**
- Returns: Most recently updated draft or null
- Response:
  ```json
  {
    "draft": {
      "id": 1,
      "title": "Draft Title",
      "body": "Draft content...",
      "created_at": "2025-11-30T10:00:00Z",
      "updated_at": "2025-11-30T10:30:00Z"
    }
  }
  ```

### 4. Today's Mood Summary
**GET /api/analytics/today**
- Returns: Today's mood aggregation
- Response:
  ```json
  {
    "data": {
      "date": "2025-11-30",
      "avg_mood_score": 0.75,
      "mood_counts": {
        "happy": 2,
        "neutral": 1
      },
      "entry_count": 3
    }
  }
  ```

### 5. Recent Entries
**GET /api/entries?limit=5&sort=desc**
- Query params:
  - `limit`: Number of entries (default: 20)
  - `page`: Pagination (default: 1)
  - `start`: Start date filter
  - `end`: End date filter
  - `mood`: Filter by mood label
  - `tag`: Filter by tag
  - `q`: Search query
- Returns: Array of recent entries

### 6. 7-Day Mood Trend
**GET /api/analytics/trend?range=7d**
- Query params:
  - `range`: Time range (e.g., 7d, 30d)
  - `from`: Start date (YYYY-MM-DD)
  - `to`: End date (YYYY-MM-DD)
- Returns: Mood trend data for the specified range

### 7. Pinned/Highlighted Entries
**GET /api/entries/pinned?limit=3**
- Query params:
  - `limit`: Number of entries (default: 3)
- Returns: Top entries with highest mood scores
- Response:
  ```json
  {
    "data": [
      {
        "id": 1,
        "title": "Great Day!",
        "body": "Had an amazing day...",
        "mood_label": "happy",
        "mood_score": 0.92,
        "tags": ["motivation", "success"],
        "created_at": "2025-11-30T10:00:00Z",
        "updated_at": "2025-11-30T10:00:00Z"
      }
    ]
  }
  ```

## 🔄 Dashboard Data Loading Pattern

Use `Promise.all()` to parallelize API calls:

```javascript
async function loadDashboardData() {
  try {
    const [
      userProfile,
      streakInfo,
      latestDraft,
      todayMood,
      recentEntries,
      moodTrend,
      pinnedEntries
    ] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/analytics/streaks'),
      fetch('/api/drafts/latest'),
      fetch('/api/analytics/today'),
      fetch('/api/entries?limit=5'),
      fetch('/api/analytics/trend?range=7d'),
      fetch('/api/entries/pinned?limit=3')
    ]);

    // Process all responses...
  } catch (error) {
    console.error('Dashboard data loading failed:', error);
  }
}
```

## 📊 Additional Analytics APIs

### Happiest Day
**GET /api/analytics/happiest-day**
- Returns day with highest average mood score

### Lowest Day
**GET /api/analytics/lowest-day**
- Returns day with lowest average mood score

### Tags vs Mood
**GET /api/analytics/tags**
- Returns correlation between tags and mood scores

### Insights
**GET /api/analytics/insights**
- Returns AI-generated insights
- Limit: 20 most recent insights

**POST /api/analytics/insights**
- Generate new insights for a date range
- Body:
  ```json
  {
    "from": "2025-11-01",
    "to": "2025-11-30"
  }
  ```

## 🔐 Authentication

All APIs require authentication. Include the access token in the Authorization header or as a cookie:

```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`
}
```

Or using cookies (already set by the auth system):
```javascript
credentials: 'include'
```

## 🎯 Dashboard Component Structure

```
DashboardPage
 ├─ DashboardHeader (streak + quick actions)
 ├─ DraftResumeCard (if draft exists)
 ├─ TodayMoodCard (today mood summary)
 ├─ RecentEntriesSection
 │   └─ RecentEntryItem[]
 ├─ MoodTrendMiniChart (7-day trend)
 └─ HighlightsSection (pinned entries)
```

## 🚀 Quick Actions Available

1. **New Entry** - Navigate to `/dashboard/new-entry`
2. **Continue Draft** - Navigate to `/dashboard/draft/:id`
3. **Search** - Navigate to `/dashboard/search`
4. **View Analytics** - Navigate to `/dashboard/analytics`

## 📝 Notes

- All mood scores are rounded to 2 decimal places
- Dates are in ISO format (YYYY-MM-DD)
- All APIs return JSON
- Error responses have `{ error: "message" }` format
- Success responses typically have `{ data: ... }` format

