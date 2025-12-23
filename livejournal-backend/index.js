require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const entriesRoutes = require('./routes/entries');
const draftsRoutes = require('./routes/drafts');
const analyticsRoutes = require('./routes/analytics');
const aiRoutes = require('./routes/ai');
const searchRoutes = require('./routes/search');
const vapiRoutes = require('./routes/vapi');
const eventsRoutes = require('./routes/events');
const remindersRoutes = require('./routes/reminders');
const contactRoutes = require('./routes/contact');
const learningRoutes = require('./routes/learning');
const feedbackRoutes = require('./routes/feedback');
const timeCapsuleRoutes = require('./routes/timeCapsule');
const lifeChapterRoutes = require('./routes/lifeChapter');
const lettersRoutes = require('./routes/letters');
const memoryRouletteRoutes = require('./routes/memoryRoulette');
const reflectionCardsRoutes = require('./routes/reflectionCards');
const gardenRoutes = require('./routes/garden');

const cleanup = require('./jobs/cleanupDrafts');
const moodAggregator = require('./jobs/moodAggregator');

console.log('🔧 DEBUG env:', {
  PORT: process.env.PORT,
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  OPENAI: !!process.env.OPENAI_API_KEY,
});

const app = express();

// CORS configuration for credentials
app.use(cors({
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true, // Allow credentials (cookies)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/drafts', draftsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/vapi', vapiRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/time-capsule', timeCapsuleRoutes);
app.use('/api/life-chapters', lifeChapterRoutes);
app.use('/api/letters', lettersRoutes);
app.use('/api/memory-roulette', memoryRouletteRoutes);
app.use('/api/reflection-cards', reflectionCardsRoutes);
app.use('/api/garden', gardenRoutes);

cleanup.start();
moodAggregator.start();

app.get('/', (req, res) => res.json({ ok: true, name: 'LiveJournal Backend' }));

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION', err);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('UNHANDLED REJECTION at', p, 'reason:', reason);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
