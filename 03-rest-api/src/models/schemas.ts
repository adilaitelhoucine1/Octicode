import { z } from 'zod';

export const createPatientSchema = z.object({
  name: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  medicalRecordNumber: z.string().min(1).max(50)
});

export const updatePatientSchema = createPatientSchema.partial();

export const createVoiceNoteSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().min(1).max(200),
  duration: z.number().int().positive(),
  recordedAt: z.string().datetime()
});

export const createSummarySchema = z.object({
  voiceNoteId: z.string().uuid(),
  content: z.string().min(1),
  keyPoints: z.array(z.string()).min(1)
});

export type CreatePatient = z.infer<typeof createPatientSchema>;
export type UpdatePatient = z.infer<typeof updatePatientSchema>;
export type CreateVoiceNote = z.infer<typeof createVoiceNoteSchema>;
export type CreateSummary = z.infer<typeof createSummarySchema>;
