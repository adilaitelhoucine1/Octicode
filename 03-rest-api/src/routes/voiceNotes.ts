import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../models/db.js';
import { createVoiceNoteSchema } from '../models/schemas.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { patientId } = req.query;
    let notes;

    if (patientId) {
      notes = db.prepare('SELECT * FROM voice_notes WHERE patient_id = ? ORDER BY recorded_at DESC').all(patientId);
    } else {
      notes = db.prepare('SELECT * FROM voice_notes ORDER BY recorded_at DESC').all();
    }

    res.json({ data: notes });
  } catch (error) {
    logger.error({ requestId: req.id, error }, 'Failed to fetch voice notes');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM voice_notes WHERE id = ?').get(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Voice note not found' });
    }
    res.json({ data: note });
  } catch (error) {
    logger.error({ requestId: req.id, error }, 'Failed to fetch voice note');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', (req, res) => {
  try {
    const validated = createVoiceNoteSchema.parse(req.body);
    
    const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(validated.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO voice_notes (id, patient_id, title, duration, recorded_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, validated.patientId, validated.title, validated.duration, validated.recordedAt, now);

    const note = db.prepare('SELECT * FROM voice_notes WHERE id = ?').get(id);
    logger.info({ requestId: req.id, voiceNoteId: id }, 'Voice note created');
    res.status(201).json({ data: note });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error({ requestId: req.id, error }, 'Failed to create voice note');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM voice_notes WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Voice note not found' });
    }
    logger.info({ requestId: req.id, voiceNoteId: req.params.id }, 'Voice note deleted');
    res.status(204).send();
  } catch (error) {
    logger.error({ requestId: req.id, error }, 'Failed to delete voice note');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
