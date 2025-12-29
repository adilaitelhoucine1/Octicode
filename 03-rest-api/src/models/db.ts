import Database from 'better-sqlite3';
import { join } from 'path';

const db = new Database(join(process.cwd(), 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    medical_record_number TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS voice_notes (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    title TEXT NOT NULL,
    duration INTEGER NOT NULL,
    recorded_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS summaries (
    id TEXT PRIMARY KEY,
    voice_note_id TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    key_points TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (voice_note_id) REFERENCES voice_notes(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_voice_notes_patient ON voice_notes(patient_id);
  CREATE INDEX IF NOT EXISTS idx_summaries_voice_note ON summaries(voice_note_id);
`);

export default db;
