# Concert Booking Backend


REST API for a Concert Booking System, built with NestJS + TypeORM + PostgreSQL


(The answer for the bonus track can be found in the /doc folder )

---

## Getting Started

### Installation
1. Clone & install dependencies
```bash
 npm install
 ```

2. Setup environment
```bash
cp .env.example .env
```

3. Getting start PostgreSQL
```bash
docker compose up -d

npm run start:dev
```

Server will start at http://localhost:3000

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS |
| Language | TypeScript |
| ORM | TypeORM |
| Database | PostgreSQL |
| Validation | class-validator / class-transformer |
---

## Features

- **Authentication** — Register / Login
- **Role Switching** — Switch role between `ADMIN` and `USER`
- **Concert Management** — CRUD Concert (ADMIN only)
- **Booking System** 
- **Audit Logs**

---

## Project Structure

```
src/
├── main.ts                          # Bootstrap application
├── app.module.ts                    # Root module
├── data-source.ts                   # TypeORM DataSource สำหรับ CLI
│
├── auth/                            # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts
│   └── dto/
│       ├── login.dto.ts
│       └── register.dto.ts
│
├── users/
│   └── entities/
│       └── user.entity.ts
│
├── concerts/                        # Concert management module
│   ├── concerts.controller.ts
│   ├── concerts.service.ts
│   ├── concerts.module.ts
│   ├── entities/
│   │   └── concert.entity.ts
│   └── dto/
│       ├── create-concert.dto.ts
│       └── update-concert.dto.ts
│
├── bookings/                        # Booking module
│   ├── bookings.controller.ts
│   ├── bookings.service.ts
│   ├── bookings.module.ts
│   ├── entities/
│   │   └── booking.entity.ts
│   └── dto/
│       ├── create-booking.dto.ts
│       └── update-booking.dto.ts
│
├── audit-logs/                      # Audit log module
│   ├── audit-logs.controller.ts
│   ├── audit-logs.service.ts
│   ├── audit-logs.module.ts
│   ├── entities/
│   │   └── audit-log.entity.ts
│   └── dto/
│
├── common/                          # Shared utilities
│   ├── decorators/
│   │   └── roles.decorator.ts       # @Roles() decorator
│   ├── enums/
│   │   ├── role.enum.ts             # ADMIN | USER
│   │   └── audit-action.enum.ts     # Audit action types
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   └── interfaces/
│       └── request-with-user.interface.ts
│
└── migrations
```

---

## API Reference

Base URL: `http://localhost:3000/api`

### Authentication

| Method | Endpoint | 
|--------|----------|
| POST | `/auth/register` |
| POST | `/auth/login` |
| PATCH | `/auth/role` |

**Register / Login Request Body:**
```json
{
  "username": "nekomata",
  "password": "123456"
}
```

**Login Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Concerts

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/concerts` | - |
| GET | `/concerts/:id` | - |
| POST | `/concerts` |ADMIN |
| PUT | `/concerts/:id` | ADMIN |
| DELETE | `/concerts/:id` | ADMIN |

**Create Concert Request Body:**
```json
{
  "name": "Super mario bros World Tour 2026",
  "description": "Nintendo Live in Bangkok",
  "total_seats": 5000
}
```

---

### Bookings

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/bookings` | ADMIN | Get all bookings |
| POST | `/bookings` | USER | Booking |
| GET | `/bookings/me` | USER | Get my booking |
| DELETE | `/bookings/:id` | USER | Cancel booking |

**Create Booking Request Body:**
```json
{
  "concert_id": "uuid-of-the-concert"
}
```
**Booking Rules:**
- A user can book only 1 seat per concert
- Cannot book again if an active booking already exists
- Cannot book if the concert is fully seated


---

### Audit Logs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/audit-logs` | ADMIN | Get all audit logs |

**Query Parameters (`/audit-logs`):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `concert_id` | UUID | filter by concert |
| `user_id` | UUID | filter by user |
| `action` | string | filter by action |
| `page` | number | page (default: 1) |
| `limit` | number | x per page (default: 20) |

---

### Database Schema

```
users
├── id (UUID, PK)
├── username (unique)
├── password_hash
├── role (ADMIN | USER)
├── created_at
└── updated_at

concerts
├── id (UUID, PK)
├── name
├── description
├── total_seats
├── available_seats
├── created_by → users.id
├── created_at
├── updated_at
└── deleted_at (soft delete)

bookings
├──
 id (UUID, PK)
├── user_id → users.id
├── concert_id → concerts.id (CASCADE DELETE)
├── status (ACTIVE | CANCELLED)
├── booked_at (TIMESTAMPTZ)
└── cancelled_at (TIMESTAMPTZ, nullable)

audit_logs
├── id (UUID, PK)
├── user_id → users.id (nullable)
├── concert_id → concerts.id (SET NULL on delete)
├── booking_id → bookings.id (nullable)
├── action (enum)
├── metadata (JSONB)
└── created_at (TIMESTAMPTZ)
```

---
### Testing

```bash
# Unit tests
npm run test
```

### Authorization Flow

```
Request -> JWT Guard (Check Bearer token) -> Roles Guard (Check role in JWT payload) -> Controller
```
