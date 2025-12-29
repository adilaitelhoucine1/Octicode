import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import db from '../models/db.js';

describe('Database Operations', () => {
  let testPatientId: string;
  let testVoiceNoteId: string;

  beforeAll(() => {
    db.exec('DELETE FROM summaries');
    db.exec('DELETE FROM voice_notes');
    db.exec('DELETE FROM patients');
  });

  afterAll(() => {
    db.close();
  });

  describe('Patients', () => {
    it('should create a patient', () => {
      testPatientId = randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO patients (id, name, date_of_birth, medical_record_number, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(testPatientId, 'John Doe', '1990-01-01', 'MRN001', now, now);

      const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(testPatientId);
      expect(patient).toBeDefined();
      expect((patient as any).name).toBe('John Doe');
    });

    it('should retrieve all patients', () => {
      const patients = db.prepare('SELECT * FROM patients').all();
      expect(patients.length).toBeGreaterThan(0);
    });

    it('should update a patient', () => {
      const now = new Date().toISOString();
      db.prepare('UPDATE patients SET name = ?, updated_at = ? WHERE id = ?')
        .run('Jane Doe', now, testPatientId);

      const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(testPatientId);
      expect((patient as any).name).toBe('Jane Doe');
    });
  });

  describe('Voice Notes', () => {
    it('should create a voice note', () => {
      testVoiceNoteId = randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO voice_notes (id, patient_id, title, duration, recorded_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(testVoiceNoteId, testPatientId, 'Consultation Note', 120, now, now);

      const note = db.prepare('SELECT * FROM voice_notes WHERE id = ?').get(testVoiceNoteId);
      expect(note).toBeDefined();
      expect((note as any).title).toBe('Consultation Note');
    });

    it('should retrieve voice notes by patient', () => {
      const notes = db.prepare('SELECT * FROM voice_notes WHERE patient_id = ?').all(testPatientId);
      expect(notes.length).toBeGreaterThan(0);
    });

    it('should cascade delete voice notes when patient is deleted', () => {
      const tempPatientId = randomUUID();
      const tempNoteId = randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO patients (id, name, date_of_birth, medical_record_number, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(tempPatientId, 'Temp Patient', '1995-05-05', 'MRN999', now, now);

      db.prepare(`
        INSERT INTO voice_notes (id, patient_id, title, duration, recorded_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(tempNoteId, tempPatientId, 'Temp Note', 60, now, now);

      db.prepare('DELETE FROM patients WHERE id = ?').run(tempPatientId);

      const note = db.prepare('SELECT * FROM voice_notes WHERE id = ?').get(tempNoteId);
      expect(note).toBeUndefined();
    });
  });

  describe('Summaries', () => {
    it('should create a summary', () => {
      const summaryId = randomUUID();
      const now = new Date().toISOString();
      const keyPoints = JSON.stringify(['Point 1', 'Point 2']);

      db.prepare(`
        INSERT INTO summaries (id, voice_note_id, content, key_points, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(summaryId, testVoiceNoteId, 'Patient presented with symptoms...', keyPoints, now);

      const summary = db.prepare('SELECT * FROM summaries WHERE id = ?').get(summaryId);
      expect(summary).toBeDefined();
      expect((summary as any).content).toContain('symptoms');
    });

    it('should enforce unique constraint on voice_note_id', () => {
      const summaryId = randomUUID();
      const now = new Date().toISOString();
      const keyPoints = JSON.stringify(['Point 3']);

      expect(() => {
        db.prepare(`
          INSERT INTO summaries (id, voice_note_id, content, key_points, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(summaryId, testVoiceNoteId, 'Duplicate summary', keyPoints, now);
      }).toThrow();
    });

    it('should join summaries with voice notes', () => {
      const result = db.prepare(`
        SELECT s.*, v.title as voice_note_title
        FROM summaries s
        JOIN voice_notes v ON s.voice_note_id = v.id
      `).all();

      expect(result.length).toBeGreaterThan(0);
      expect((result[0] as any).voice_note_title).toBeDefined();
    });
  });
});
