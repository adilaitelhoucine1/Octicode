import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../models/db.js';
import { createSummarySchema } from '../models/schemas.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const summaries = db.prepare(`
      SELECT s.*, v.title as voice_note_title, v.patient_id
      FROM summaries s
      JOIN voice_notes v ON s.voice_note_id = v.id
      ORDER BY s.created_at DESC
    `).all();
    res.json({ data: summaries });
  } catch (error) {
    logger.error({ requestId: req.id, error }, 'Failed to fetch summaries');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT s.*, v.title as voice_note_title, v.patient_id
      FROM summaries s
      JOIN voice_notes v ON s.voice_note_id = v.id
      WHERE s.id = ?
    `).get(req.params.id);
    
    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }
    res.json({ data: summary });
  } catch (error) {
    logger.error({ requestId: req.id, error }, 'Failed to fetch summary');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', (req, res) => {
  try {
    const validated = createSummarySchema.parse(req.body);
    
    const voiceNote = db.prepare('SELECT id FROM voice_notes WHERE id = ?').get(validated.voiceNoteId);
    if (!voiceNote) {
      return res.status(404).json({ error: 'Voice note not found' });
    }

    const existing = db.prepare('SELECT id FROM summaries WHERE voice_note_id = ?').get(validated.voiceNoteId);
    if (existing) {
      return res.status(409).json({ error: 'Summary already exists for this voice note' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const keyPointsJson = JSON.stringify(validated.keyPoints);

    db.prepare(`
      INSERT INTO summaries (id, voice_note_id, content, key_points, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, validated.voiceNoteId, validated.content, keyPointsJson, now);

    const summary = db.prepare('SELECT * FROM summaries WHERE id = ?').get(id);
    logger.info({ requestId: req.id, summaryId: id }, 'Summary created');
    res.status(201).json({ data: summary });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error({ requestId: req.id, error }, 'Failed to create summary');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM summaries WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Summary not found' });
    }
    logger.info({ requestId: req.id, summaryId: req.params.id }, 'Summary deleted');
    res.status(204).send();
  } catch (error) {
    logger.error({ requestId: req.id, error }, 'Failed to delete summary');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
