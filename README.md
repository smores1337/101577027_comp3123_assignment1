# COMP3123 Assignment 1 – Secure Employee Management REST API

**Student ID:** 101577027  
**Course:** COMP3123 – Full Stack Development I  

A secure REST API built with **Node.js, Express, MongoDB (Mongoose) and JWT**. Users sign up, log in, and manage **only the employees they created**.

- **GitHub:** https://github.com/smores1337/101577027_comp3123_assignment1
- **Deployed API (Vercel):** `https://<your-project>.vercel.app` *(update after deploying – see [Deploying to Vercel](#deploying-to-vercel))*

---

## Tech stack

| Concern | Library |
|---|---|
| Web framework | Express 5 (Express Router) |
| Database | MongoDB + Mongoose (database `comp3123_assignment1`) |
| Password hashing | bcryptjs (10 salt rounds) |
| Authentication | jsonwebtoken (JWT, `Authorization: Bearer <token>`) |
| Security headers | helmet |
| Rate limiting | express-rate-limit |
| Input validation | express-validator |
| Logging | winston (JSON lines in `logs/app.log`, errors in `logs/error.log`) |
| Config | dotenv (`.env`) |
| Tests | Jest + Supertest (+ mongodb-memory-server) |

## Project structure

```
├── index.js                  # Local entry point – connects to MongoDB and starts the server
├── api/index.js              # Vercel serverless entry point
├── vercel.json               # Vercel routing
├── src/
│   ├── app.js                # Express app: helmet, cors, JSON parser, logging, routes, errors
│   ├── config/  env.js, db.js
│   ├── models/  User.js, Employee.js
│   ├── controllers/  userController.js, employeeController.js
│   ├── routes/  userRoutes.js, employeeRoutes.js
│   ├── middleware/  auth.js, validate.js, rateLimiters.js, requestLogger.js, errorHandler.js
│   ├── validators/  userValidators.js, employeeValidators.js
│   ├── services/  tokenService.js
│   └── utils/  logger.js, ApiError.js
├── tests/                    # Jest + Supertest tests (43 tests)
├── postman/                  # Postman collection + environment
├── logs/                     # Local log files (git-ignored)
├── .env.example
└── .gitignore
```

## Setup

**Requirements:** Node.js 18+ and a MongoDB database (local MongoDB or MongoDB Atlas).

```bash
git clone https://github.com/smores1337/101577027_comp3123_assignment1.git
cd 101577027_comp3123_assignment1
npm install
cp .env.example .env      # Windows: copy .env.example .env
# edit .env and set MONGODB_URI and JWT_SECRET
npm start                 # or: npm run dev  (nodemon)
```

The server runs on `http://localhost:3000` by default.

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | ✅ | – | MongoDB connection string |
| `JWT_SECRET` | ✅ | – | Secret used to sign JWTs (use a long random string) |
| `PORT` | | `3000` | HTTP port |
| `DB_NAME` | | `comp3123_assignment1` | Database name |
| `JWT_EXPIRES_IN` | | `1h` | Token lifetime |
| `BCRYPT_SALT_ROUNDS` | | `10` | bcrypt cost |
| `AUTH_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_WINDOW_MS` | | `10` / `900000` | Signup + login limit (10 per 15 min per IP) |
| `API_RATE_LIMIT_MAX` / `API_RATE_LIMIT_WINDOW_MS` | | `100` / `900000` | General `/api` limit (100 per 15 min per IP) |
| `LOG_DIR` | | `logs` | Log directory (`/tmp/logs` on Vercel) |

`.env` is git-ignored – only `.env.example` is committed.

## API documentation

All responses are JSON. Errors always look like:

```json
{ "status": false, "message": "Validation failed", "errors": [ { "field": "email", "message": "Email is not valid" } ] }
```

### Health

| Method | Endpoint | Auth | Success |
|---|---|---|---|
| GET | `/health` | – | `200` (`503` if the DB is down) |

```json
{ "status": true, "message": "API is healthy", "database": "connected", "uptime_seconds": 12, "timestamp": "2026-10-19T01:07:00.418Z" }
```

### User APIs – `/api/v1/user`

#### `POST /api/v1/user/signup` → `201 Created`
```json
{ "username": "alice", "email": "alice@example.com", "password": "Passw0rd123" }
```
Rules: username 3–30 chars (letters, numbers, `_ . -`), valid email, password 8–128 chars with at least one letter and one number.
```json
{
  "status": true,
  "message": "User created successfully.",
  "user_id": "6ad56d34eaa776e746342766",
  "user": { "_id": "6ad56d34eaa776e746342766", "username": "alice", "email": "alice@example.com", "created_at": "...", "updated_at": "..." }
}
```
Errors: `400` validation / malformed JSON, `409` username or email already exists, `429` too many attempts.

#### `POST /api/v1/user/login` → `200 OK`
Log in with **username or email** plus password:
```json
{ "username": "alice", "password": "Passw0rd123" }
```
```json
{ "email": "alice@example.com", "password": "Passw0rd123" }
```
Response:
```json
{
  "status": true,
  "message": "Login successful.",
  "jwt_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": "1h",
  "user": { "_id": "...", "username": "alice", "email": "alice@example.com" }
}
```
Errors: `400` missing fields, `401` invalid username/email or password, `429` too many attempts.

### Employee APIs – `/api/v1/emp` (JWT required)

Send the token from login in every request:
```
Authorization: Bearer <jwt_token>
```

| Method | Endpoint | Success | Description |
|---|---|---|---|
| GET | `/api/v1/emp/employees` | `200` | List **your** employees |
| POST | `/api/v1/emp/employees` | `201` | Create an employee owned by you |
| GET | `/api/v1/emp/employees/{eid}` | `200` | Get one of your employees |
| PUT | `/api/v1/emp/employees/{eid}` | `200` | Update one of your employees (partial updates allowed) |
| DELETE | `/api/v1/emp/employees?eid=xxx` | `204` | Delete one of your employees (no body) |

Create body:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "position": "Software Engineer",
  "salary": 85000,
  "date_of_joining": "2024-01-15",
  "department": "Engineering"
}
```
Create response (`201`):
```json
{ "status": true, "message": "Employee created successfully.", "employee_id": "6ad56d35eaa776e746342768", "employee": { "...": "..." } }
```
Update response (`200`):
```json
{ "status": true, "message": "Employee details updated successfully.", "employee": { "...": "..." } }
```
Validation: all fields required on create; strings non-empty with max lengths; valid email; `salary` must be a positive number; `date_of_joining` must be a valid `YYYY-MM-DD` date; `eid` must be a valid ObjectId; the `user` field can never be set by the client.

### Status codes used

| Code | When |
|---|---|
| 200 | Successful read / update / login / health |
| 201 | User or employee created |
| 204 | Employee deleted |
| 400 | Validation error, malformed JSON, invalid ObjectId, missing `eid` |
| 401 | Missing, malformed, invalid or expired JWT; invalid login credentials |
| 403 | Trying to read/update/delete another user's employee |
| 404 | Employee not found, unsupported route |
| 409 | Duplicate username/email on signup; duplicate employee email for the same user |
| 429 | Rate limit exceeded |
| 500 / 503 | Unexpected server error / database unavailable (no stack traces are returned) |

## Authentication & authorization

- Passwords are hashed with **bcrypt** before saving and are never returned (`select: false` + `toJSON` transform).
- Login returns a signed **JWT** (`sub` = user id, expires in `JWT_EXPIRES_IN`).
- `src/middleware/auth.js` checks the `Authorization: Bearer` header, verifies the signature and expiry, and confirms the user still exists. Missing, malformed, invalid and expired tokens all return `401`.
- **Ownership:** the owner id comes only from the verified token (`req.user.id`). Every employee query includes it, e.g. `Employee.findOne({ _id: eid, user: req.user.id })`, so changing `eid` can never reach someone else's data. If the employee exists but belongs to another user the API returns `403`; if it does not exist, `404`.

## Security

- **Helmet** sets security headers (CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, …); `X-Powered-By` is removed.
- **Rate limiting:** signup and login share a strict limiter (10 requests / 15 min / IP); all `/api` routes have a general limiter (100 requests / 15 min / IP). Exceeding a limit returns `429` with `RateLimit-*` headers.
- JSON body limited to 10 kB; malformed JSON returns `400`.
- Secrets live only in environment variables.
- Centralized error handler (`src/middleware/errorHandler.js`) never leaks stack traces, secrets or passwords.

## Logging

Winston writes JSON lines to `logs/app.log` (all) and `logs/error.log` (errors only):
- server startup and DB connection
- every request: timestamp, method, path, status, duration, user id
- signup / login success and failure
- validation failures (field names only), authentication failures, cross-user authorization failures, rate-limit hits
- successful employee create / update / delete
- errors

Passwords, secrets, request bodies and tokens are **never** logged. On Vercel, logs go to `/tmp/logs` and the console (Vercel's filesystem is read-only).

## Testing

### Automated tests (Jest + Supertest)
```bash
npm test
```
43 tests cover every endpoint, validation, malformed JSON, duplicate users, invalid credentials, missing/invalid/expired/forged JWTs, two-user ownership (403 on cross-user read/update/delete), 404s, Helmet headers and rate limiting (429).  
Tests use an in-memory MongoDB by default, or set `TEST_MONGODB_URI` to use a real server.

### Postman
Import `postman/COMP3123_Assignment1.postman_collection.json` (and optionally `postman/Local.postman_environment.json`). Set `baseUrl` to `http://localhost:3000` or your Vercel URL and run the collection with the **Collection Runner** in order. The login requests store the JWTs automatically (`{{token}}` for user 1, `{{token2}}` for user 2), and create requests store `{{eid}}` / `{{eid2}}`. Usernames get a random suffix (`{{runId}}`) so the collection can be re-run. Rate limits are per IP, so restart the server (or wait 15 min) between full runs.

### Sample test credentials

These are created by the Postman collection or by hand (non-sensitive, for marking only):

| User | username | email | password |
|---|---|---|---|
| User 1 | `alice` | `alice@example.com` | `Passw0rd123` |
| User 2 | `bob` | `bob@example.com` | `Secret456pw` |

## Deploying to Vercel

Based on https://vercel.com/guides/using-express-with-vercel.

1. Create a free MongoDB Atlas cluster, add a database user, and allow access from anywhere (`0.0.0.0/0`) under *Network Access*.
2. Push this repo to GitHub, then on vercel.com choose **Add New → Project** and import the repo.
3. Under **Environment Variables** add `MONGODB_URI`, `JWT_SECRET` (and optionally the others above).
4. Deploy. `vercel.json` sends every request to `api/index.js`, which exports the Express app. The app connects to MongoDB lazily and reuses the connection between invocations.
5. Test `https://<your-project>.vercel.app/health`, then set `baseUrl` in Postman to that URL.

CLI alternative: `npm i -g vercel && vercel && vercel --prod`.
