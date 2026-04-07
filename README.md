# Kaleido

AI-powered social media management platform. Create, schedule, and grow your social media presence with intelligent content generation, multi-platform publishing, and data-driven analytics.

## Features

- **AI Content Generation** — Generate platform-optimized posts, blog articles, and newsletters
- **Image & Video Creation** — AI-powered image generation and carousel builder
- **Smart Scheduling** — Optimal time suggestions and auto-queue with calendar view
- **Multi-Platform Publishing** — 13 platforms: Instagram, Twitter/X, LinkedIn, Facebook, TikTok, YouTube, Pinterest, Reddit, Bluesky, Google Business, Telegram, Snapchat, WhatsApp Business
- **Analytics Dashboard** — Track engagement, growth, and best posting times
- **AI Marketing Advisor** — Chat-based CMO for strategy and content planning
- **Campaign Management** — Multi-platform campaigns with AI content plans
- **Blog & Newsletter** — SEO-optimized articles and responsive email newsletters
- **Referral System** — Shareable referral codes with reward tracking
- **Multi-Language** — English, Norwegian, Arabic (RTL supported)

## Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.11)
- **Database:** PostgreSQL 16, SQLAlchemy 2.0 (async), Alembic migrations
- **Cache/Queue:** Redis, Celery
- **AI:** Ollama (text generation), ComfyUI (image/video generation)
- **Auth:** JWT (HS256), Argon2 password hashing, Fernet encryption for tokens

### Frontend
- **Framework:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS 4, Framer Motion
- **State:** Zustand, TanStack React Query

## Project Structure

```
SkillBridge/
├── kaleido-backend/         # FastAPI backend
│   ├── config/              # Settings, database, Redis config
│   ├── core/                # Auth, middleware, exceptions
│   ├── modules/             # Domain modules
│   │   ├── auth/            # Authentication & users
│   │   ├── brands/          # Brand profiles
│   │   ├── social_accounts/ # Platform OAuth & connections
│   │   ├── content/         # Posts, AI generation, carousels
│   │   ├── media/           # Image/video generation, uploads
│   │   ├── scheduling/      # Scheduling, publishing
│   │   ├── analytics/       # Metrics & insights
│   │   ├── campaigns/       # Campaign management
│   │   ├── blog/            # Blog generation
│   │   ├── newsletter/      # Newsletter & subscribers
│   │   ├── chat/            # AI CMO chat
│   │   ├── integrations/    # RSS, Drive, Dropbox
│   │   └── referral/        # Referral system
│   ├── migrations/          # Alembic database migrations
│   └── main.py              # Application entry point
├── kaleido-frontend/        # Next.js frontend
│   └── src/
│       ├── app/             # Pages (landing, privacy, terms)
│       ├── components/      # UI components
│       └── lib/             # Utilities, i18n, store
└── .env.example             # Environment variables template
```

## Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 16
- Redis
- Ollama (optional, for AI text generation)
- ComfyUI (optional, for AI image/video generation)

### Backend

```bash
# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
cd kaleido-backend
pip install -r requirements.txt  # or install from the package list

# Configure environment
cp .env.example .env
# Edit .env with your actual values

# Run database migrations
alembic upgrade head

# Start server
uvicorn main:app --host 127.0.0.1 --port 8000 --workers 4
```

### Frontend

```bash
cd kaleido-frontend
npm install
npm run build
npm start  # runs on port 3000
```

### Environment Variables

Copy `kaleido-backend/.env.example` and fill in your values. Required:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET_KEY` — Random secret for JWT signing
- `ENCRYPTION_KEY` — 32-byte key for token encryption

Optional (for platform integrations):
- `META_APP_ID` / `META_APP_SECRET` — Facebook, Instagram, WhatsApp
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET`
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — YouTube, Google Business
- And more (see .env.example)

## API

- API Documentation: `http://localhost:8000/docs` (Swagger UI)
- Health Check: `GET /health`
- All endpoints under `/v1/` prefix

## License

Proprietary. All rights reserved.
