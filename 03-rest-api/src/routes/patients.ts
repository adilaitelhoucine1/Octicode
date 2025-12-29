import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../models/db.js';
import { createPatientSchema, updatePatientSchema } from '../models/schemas.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const patients = db.prepare('SELECT * FROM patients ORDER BY created_at DESC').all();
    res.json({ data: patients });
  } catch (error) {
    logger.error({ requestId: req.id, error }, 'Failed to fetch patients');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ data: patient });
  } catch (error) {
    logger.error({ requestId: req.id, error }, 'Failed to fetch patient');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', (req, res) => {
  try {
    const validated = createPatientSchema.parse(req.body);
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO patients (id, name, date_of_birth, medical_record_number, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, validated.name, validated.dateOfBirth, validated.medicalRecordNumber, now, now);

    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    logger.info({ requestId: req.id, patientId: id }, 'Patient created');
    res.status(201).json({ data: patient });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Medical record number already exists' });
    }
    logger.error({ requestId: req.id, error }, 'Failed to create patient');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', (req, res) => {
  try {
    const validated = updatePatientSchema.parse(req.body);
    const updates: string[] = [];
    const values: any[] = [];

    if (validated.name) {
      updates.push('name = ?');
      values.push(validated.name);
    }
    if (validated.dateOfBirth) {
      updates.push('date_of_birth = ?');
      values.push(validated.dateOfBirth);
    }
    if (validated.medicalRecordNumber) {
      updates.push('medical_record_number = ?');
      values.push(validated.medicalRecordNumber);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);

    const result = db.prepare(`UPDATE patients SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    logger.info({ requestId: req.id, patientId: req.params.id }, 'Patient updated');
    res.json({ data: patient });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error({ requestId: req.id, error }, 'Failed to update patient');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    logger.info({ requestId: req.id, patientId: req.params.id }, 'Patient deleted');
    res.status(204).send();
  } catch (error) {
    logger.error({ requestId: req.id, error }, 'Failed to delete patient');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
