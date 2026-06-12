# Kaleido

A free AI studio for social media. Create posts, images, videos and entire campaigns with AI, then download, copy or share them on any platform. Kaleido is completely free for everyone.

While our integrations with the social platforms are under app review, Kaleido works in manual-share mode: you create everything inside Kaleido and post it yourself with one-click share links and downloads. Direct publishing switches on per platform as each review is approved.

## Features

- **AI Content Generation**: platform-optimized posts, blog articles, and newsletters
- **Repurpose Studio**: paste any idea, article or script and get a complete per-platform content pack with captions, hashtags, hooks, an image prompt and a carousel outline
- **Post Packs**: download any post as a ZIP with per-platform captions, media files, and a posting checklist
- **Send to Phone**: connect your own Telegram bot and any post arrives on your phone with caption and media ready to paste; scheduled posts that need manual sharing arrive automatically
- **Idea Spark**: fresh, brand-aware post ideas on the dashboard every day
- **Image & Video Creation**: AI image generation (SDXL-Lightning) and video generation (Wan 2.1), plus a carousel builder
- **Download & Share Anywhere**: every piece of content can be downloaded, copied, or opened straight in a platform's composer
- **Smart Scheduling**: optimal time suggestions and auto-queue with calendar view, plus calendar export (.ics)
- **Analytics Dashboard**: engagement, growth, and best posting times for posts published through connected accounts
- **AI Marketing Advisor**: chat-based CMO for strategy and content planning
- **Campaign Management**: multi-platform campaigns with AI content plans
- **Blog & Newsletter**: SEO-optimized articles and responsive email newsletters
- **Referral System**: shareable referral codes with reward tracking
- **Multi-Language**: English, Norwegian, Arabic (RTL supported)

## Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.11)
- **Database:** PostgreSQL 16, SQLAlchemy 2.0 (async), Alembic migrations
- **Cache/Queue:** Redis, Celery
- **AI:** Ollama with Gemma 4 (text), diffusers with SDXL-Lightning and Wan 2.1 on a local GPU (image/video)
- **Auth:** JWT (HS256), Argon2 password hashing, Fernet encryption for tokens

### Frontend
- **Framework:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS 4, Framer Motion
- **State:** Zustand, TanStack React Query

## Project Structure

```
Kaleido/
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
│       ├── app/             # Pages (landing, dashboard, privacy, terms)
│       ├── components/      # UI components
│       └── lib/             # Utilities, i18n, store, platform share links
└── start-kaleido.sh         # One-command local startup (services + API + tunnel)
```

## Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 16
- Redis
- Ollama (optional, for AI text generation)
- A CUDA GPU with torch + diffusers (optional, for AI image/video generation)

### Quick start (this server)

```bash
./start-kaleido.sh            # starts Postgres, Redis, Ollama, the API, and the tunnel
./start-kaleido.sh --no-tunnel  # same, without the Cloudflare tunnel
```

### Backend (manual)

```bash
# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
cd kaleido-backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your actual values

# Run database migrations
alembic upgrade head

# Start server (port must match the frontend's NEXT_PUBLIC_API_URL)
uvicorn main:app --host 127.0.0.1 --port 8001
```

### Frontend

```bash
cd kaleido-frontend
npm install
npm run build
npm start  # runs on port 3000
```

For local development, `kaleido-frontend/.env.local` sets `NEXT_PUBLIC_API_URL=http://127.0.0.1:8001`.

### Environment Variables

Copy `kaleido-backend/.env.example` and fill in your values. Required:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET_KEY`: random secret for JWT signing
- `ENCRYPTION_KEY`: 32-byte key for token encryption
- `MEDIA_ROOT`: writable directory for uploaded and generated media
- `OLLAMA_MODEL`: the Ollama model used for all text generation (default gemma4:12b)

Deployment pair (must match per environment):
- Backend `FRONTEND_URL` must point at the deployed frontend origin (CORS)
- Frontend `NEXT_PUBLIC_API_URL` must point at the deployed backend URL

Note: the production backend is exposed through a Cloudflare quick tunnel, which gets a new random URL every time it restarts. After a tunnel restart, update `NEXT_PUBLIC_API_URL` in Vercel and redeploy. A named Cloudflare tunnel with a stable hostname removes this step.

Optional (for platform integrations, used once app reviews are approved):
- `META_APP_ID` / `META_APP_SECRET`: Facebook, Instagram, WhatsApp
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET`
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: YouTube, Google Business
- And more (see .env.example)

## API

- API Documentation: `http://localhost:8001/docs` (Swagger UI)
- Health Check: `GET /health` and `GET /health/detailed`
- All endpoints under `/v1/` prefix

## License

Proprietary. All rights reserved.
