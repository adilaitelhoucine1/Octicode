# Notes & Summaries REST API

A clean, minimal REST API for managing patients, voice notes, and AI-generated summaries.

## Features

- ✅ TypeScript with strict type checking
- ✅ Express.js framework
- ✅ Zod validation
- ✅ SQLite persistence
- ✅ Vitest testing
- ✅ Pino logger with request IDs
- ✅ API key authentication
- ✅ Rate limiting (100 req/15min per API key)
- ✅ Health endpoint
- ✅ ESLint + Prettier configured

## Installation

```bash
npm install
```

## Running

```bash
# Development with hot reload
npm run dev

# Production build
npm run build
npm start

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```

## API Documentation

### Authentication

All `/api/*` endpoints require an API key header:
```
X-API-Key: dev-api-key-12345
```

### Endpoints

#### Health Check
```
GET /health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Patients

**List all patients**
```
GET /api/patients
```

**Get patient by ID**
```
GET /api/patients/:id
```

**Create patient**
```
POST /api/patients
Content-Type: application/json

{
  "name": "John Doe",
  "dateOfBirth": "1990-01-15",
  "medicalRecordNumber": "MRN12345"
}
```

**Update patient**
```
PATCH /api/patients/:id
Content-Type: application/json

{
  "name": "Jane Doe"
}
```

**Delete patient**
```
DELETE /api/patients/:id
```

#### Voice Notes

**List all voice notes (optional filter by patient)**
```
GET /api/voice-notes?patientId=<uuid>
```

**Get voice note by ID**
```
GET /api/voice-notes/:id
```

**Create voice note**
```
POST /api/voice-notes
Content-Type: application/json

{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Initial Consultation",
  "duration": 180,
  "recordedAt": "2024-01-15T10:30:00.000Z"
}
```

**Delete voice note**
```
DELETE /api/voice-notes/:id
```

#### Summaries

**List all summaries**
```
GET /api/summaries
```

**Get summary by ID**
```
GET /api/summaries/:id
```

**Create summary**
```
POST /api/summaries
Content-Type: application/json

{
  "voiceNoteId": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Patient presented with symptoms of...",
  "keyPoints": [
    "Fever for 3 days",
    "Persistent cough",
    "No travel history"
  ]
}
```

**Delete summary**
```
DELETE /api/summaries/:id
```

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "details": [] // Optional validation details
}
```

Status codes:
- `400` - Validation error
- `401` - Invalid API key
- `404` - Resource not found
- `409` - Conflict (duplicate)
- `429` - Rate limit exceeded
- `500` - Internal server error

## Database Schema

### patients
- `id` (TEXT, PRIMARY KEY)
- `name` (TEXT)
- `date_of_birth` (TEXT)
- `medical_record_number` (TEXT, UNIQUE)
- `created_at` (TEXT)
- `updated_at` (TEXT)

### voice_notes
- `id` (TEXT, PRIMARY KEY)
- `patient_id` (TEXT, FOREIGN KEY)
- `title` (TEXT)
- `duration` (INTEGER, seconds)
- `recorded_at` (TEXT)
- `created_at` (TEXT)

### summaries
- `id` (TEXT, PRIMARY KEY)
- `voice_note_id` (TEXT, FOREIGN KEY, UNIQUE)
- `content` (TEXT)
- `key_points` (TEXT, JSON array)
- `created_at` (TEXT)

## Testing

Run tests with:
```bash
npm test
```

Tests cover:
- Patient CRUD operations
- Voice note creation and retrieval
- Summary creation with constraints
- Cascade deletion
- Foreign key relationships

## Architecture Decisions

**Why SQLite?**
- Simple setup, no external dependencies
- Perfect for demo/prototype
- ACID compliance
- Easy to migrate to PostgreSQL later

**Why Zod?**
- Runtime type safety
- Clear validation errors
- TypeScript integration

**Why Pino?**
- Fast, structured logging
- Request ID tracking
- Production-ready

## Security

- API key authentication
- Rate limiting per key
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- Request ID tracking for audit trails

## Future Improvements

- JWT authentication
- Pagination for list endpoints
- File upload for actual audio files
- Real AI integration for summaries
- PostgreSQL migration
- Docker containerization
- OpenAPI/Swagger documentation
