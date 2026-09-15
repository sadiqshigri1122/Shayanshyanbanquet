import cors from 'cors';
import express from 'express';
import { apiRouter } from './routes/api.js';
import { startEventReminderScheduler } from './services/eventReminderService.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.set('trust proxy', 1);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));

app.get('/', (_req, res) => {
  res.json({
    service: 'Shayan Banquet API',
    status: 'running',
    note: 'This is the backend API only. Open the frontend at http://localhost:5173',
    endpoints: {
      health: '/api/health',
      state: '/api/state',
      bookings: '/api/bookings',
      availability: '/api/availability?venueId=va-red&date=2026-12-01',
    },
  });
});

app.use('/api', apiRouter);

app.listen(port, '0.0.0.0', () => {
  console.log(`Shayan Banquet API listening on http://0.0.0.0:${port}`);
  startEventReminderScheduler();
});
