# Code Review: User Authentication API

## Critical Security Issues

### 1. SQL Injection Vulnerability (CRITICAL)
**Location:** `/login` endpoint, line 8
```typescript
const sql = `SELECT * FROM users WHERE email='${email}' AND password='${hash}'`;
```
**Issue:** Direct string interpolation allows SQL injection attacks.

**Fix:**
```typescript
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1 AND password = $2',
  [email, hash]
);
```

**Same issue in `/invite` endpoint:**
```typescript
const q = await pool.query(
  'INSERT INTO users(email, password, role) VALUES($1, $2, $3)',
  [req.body.email, hash, 'admin']
);
```

### 2. Weak Password Hashing (CRITICAL)
**Location:** Both endpoints
```typescript
const hash = crypto.createHash("md5").update(password).digest("hex");
```
**Issue:** MD5 is cryptographically broken and unsuitable for passwords. No salt used.

**Fix:** Use bcrypt or argon2:
```typescript
import bcrypt from 'bcrypt';

// For login
const isValid = await bcrypt.compare(password, user.password);

// For invite
const hash = await bcrypt.hash(pw, 12);
```

### 3. Insecure Session Management (CRITICAL)
**Location:** `/login` endpoint, lines 11-13
```typescript
const token = Buffer.from(email + ":" + Date.now()).toString("base64");
(global as any).SESSIONS = (global as any).SESSIONS || {};
(global as any).SESSIONS[token] = { email };
```
**Issues:**
- Token is predictable (just base64 encoded email + timestamp)
- Sessions stored in global memory (lost on restart, not scalable)
- No expiration mechanism
- No secure flag or httpOnly cookie

**Fix:**
```typescript
import { randomBytes } from 'crypto';
import session from 'express-session';
import RedisStore from 'connect-redis';

// Use proper session middleware
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true, 
    httpOnly: true, 
    maxAge: 3600000 
  }
}));

// Generate secure token
const token = randomBytes(32).toString('hex');
```

### 4. Hardcoded Admin Role (HIGH)
**Location:** `/invite` endpoint
```typescript
VALUES('${req.body.email}','${hash}','admin')
```
**Issue:** All invited users get admin role automatically.

**Fix:**
```typescript
const role = req.body.role || 'user';
if (!['user', 'admin', 'moderator'].includes(role)) {
  return res.status(400).json({ error: 'Invalid role' });
}
await pool.query(
  'INSERT INTO users(email, password, role) VALUES($1, $2, $3)',
  [req.body.email, hash, role]
);
```

## Input Validation Issues

### 5. Missing Input Validation (HIGH)
**Location:** Both endpoints

**Issues:**
- No email format validation
- No password strength requirements
- No request body validation
- Missing fields not checked

**Fix:** Use Zod for validation:
```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    // ... rest of logic
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input' });
  }
});
```

### 6. Weak Password Generation (MEDIUM)
**Location:** `/invite` endpoint
```typescript
const pw = Math.random().toString(36).slice(2);
```
**Issue:** Math.random() is not cryptographically secure.

**Fix:**
```typescript
import { randomBytes } from 'crypto';

const pw = randomBytes(16).toString('base64').slice(0, 16);
```

## Architecture & Design Issues

### 7. No Authentication Middleware (HIGH)
**Issue:** `/invite` endpoint has no authentication check. Anyone can create admin users.

**Fix:**
```typescript
import { authenticateToken } from '../middleware/auth';

router.post("/invite", authenticateToken, requireRole('admin'), async (req, res) => {
  // ... logic
});
```

### 8. Missing Error Handling (MEDIUM)
**Issue:** Database errors expose internal details.

**Fix:**
```typescript
router.post("/login", async (req, res) => {
  try {
    // ... logic
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 9. No Rate Limiting (MEDIUM)
**Issue:** Vulnerable to brute force attacks.

**Fix:**
```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts'
});

router.post("/login", loginLimiter, async (req, res) => {
  // ... logic
});
```

### 10. Poor Type Safety (LOW)
**Issue:** Using `(global as any)` bypasses TypeScript safety.

**Fix:**
```typescript
declare global {
  var SESSIONS: Record<string, { email: string; expiresAt: number }>;
}
```

## Performance Issues

### 11. No Connection Pooling Configuration (LOW)
**Issue:** Pool created without size limits or timeout configuration.

**Fix:**
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 12. Missing Database Indexes (LOW)
**Recommendation:** Ensure indexes exist:
```sql
CREATE INDEX idx_users_email ON users(email);
```

## Summary

**Critical fixes required:**
1. Replace string interpolation with parameterized queries
2. Replace MD5 with bcrypt/argon2
3. Implement proper session management
4. Add authentication to `/invite` endpoint
5. Add input validation with Zod
6. Implement rate limiting

**Estimated effort:** 4-6 hours to fix all critical issues.
