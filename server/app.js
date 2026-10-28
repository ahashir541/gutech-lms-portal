import express from 'express';
import cors from 'cors';
import { requireAuth, HttpError } from './middleware.js';
import { isConfigured } from './supabase.js';
import profileRoutes from './routes/profile.js';
import courseRoutes from './routes/courses.js';
import assignmentRoutes from './routes/assignments.js';
import submissionRoutes from './routes/submissions.js';
import announcementRoutes from './routes/announcements.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const api = express.Router();

api.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'gutech-lms-api', supabase: isConfigured, time: new Date().toISOString() });
});

// Everything below requires a valid Supabase session.
api.use(requireAuth);
api.use('/', profileRoutes);
api.use('/dashboard', dashboardRoutes);
api.use('/courses', courseRoutes);
api.use('/assignments', assignmentRoutes);
api.use('/submissions', submissionRoutes);
api.use('/announcements', announcementRoutes);
api.use((_req, _res, next) => next(new HttpError(404, 'Route not found')));

app.use('/api', api);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on the server' : err.message });
});

export default app;
