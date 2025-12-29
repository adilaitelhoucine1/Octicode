import express from 'express';
import { logger } from './utils/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { authenticateApiKey } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import patientsRouter from './routes/patients.js';
import voiceNotesRouter from './routes/voiceNotes.js';
import summariesRouter from './routes/summaries.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(requestIdMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', rateLimiter, authenticateApiKey);
app.use('/api/patients', patientsRouter);
app.use('/api/voice-notes', voiceNotesRouter);
app.use('/api/summaries', summariesRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
