# YouTube Video Summarizer

AI-powered YouTube video summarization web application using Node.js, Next.js, and OpenRouter API.

## Features

- YouTube transcript fetching with fallback mechanisms
- AI-powered video summarization using OpenRouter (Gemini/GPT-4/Claude)
- **Intelligent chunking for long videos** (4000 chars per chunk)
- **Multi-chunk processing** with automatic combining
- Real-time streaming responses
- Beautiful, modern UI with dark theme
- Support for videos in multiple languages

## Tech Stack

### Backend
- **Node.js** + **Express**
- **youtube-transcript** library for fetching transcripts
- **OpenRouter API** for AI processing
- **PostgreSQL** on Railway (for future usage tracking)

### Frontend
- **Next.js 14** (App Router)
- **React 18**
- Server-Sent Events (SSE) for streaming

## Project Structure

```
web-tools/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── transcript.js    # Transcript fetching API
│   │   │   └── summary.js       # Summary generation API
│   │   ├── services/
│   │   │   ├── transcriptService.js  # YouTube transcript logic
│   │   │   ├── openRouterService.js  # OpenRouter AI integration
│   │   │   └── summaryService.js     # Chunking & summarization
│   │   ├── utils/
│   │   │   └── chunkingUtils.js      # Text chunking utilities
│   │   └── server.js            # Express server
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── layout.js
│   │   └── page.js              # Main page
│   ├── components/
│   │   ├── VideoInput.js        # Video URL input form
│   │   └── SummaryDisplay.js    # Summary display with streaming
│   ├── lib/
│   │   └── api.js               # API client functions
│   ├── package.json
│   └── .env.example
└── README.md
```

## Local Development Setup

### Prerequisites
- Node.js 18+ installed
- OpenRouter API key ([Get one here](https://openrouter.ai/))

### 1. Clone the Repository

```bash
git clone https://github.com/sagarmaiti45/web-tools.git
cd web-tools
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
```

Edit `backend/.env` and add your OpenRouter API key:

```env
PORT=5000
NODE_ENV=development

# Get your API key from https://openrouter.ai/
OPENROUTER_API_KEY=your_actual_api_key_here
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
MAX_TOKENS=4000
TEMPERATURE=0.7

SITE_URL=http://localhost:3000
SITE_NAME=YouTube Summarizer
```

Start the backend server:

```bash
npm run dev
# Server will run on http://localhost:5000
```

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install

# Create .env.local file
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
# Frontend will run on http://localhost:3000
```

### 4. Test the Application

1. Open http://localhost:3000 in your browser
2. Enter a YouTube URL or video ID
3. Add video title and channel name
4. Click "Generate Summary"
5. Watch the summary stream in real-time!

## Railway Deployment Guide

### Step 1: Create Railway Account

1. Go to [Railway.app](https://railway.app/)
2. Sign up with GitHub

### Step 2: Deploy Backend

#### Option A: Deploy from GitHub (Recommended)

1. Push your code to GitHub first (see Git Setup section below)
2. In Railway dashboard, click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `web-tools` repository
5. Railway will auto-detect the backend (Node.js)

#### Option B: Deploy from CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to backend folder
cd backend

# Initialize and deploy
railway init
railway up
```

#### Configure Backend Environment Variables

1. In Railway dashboard, go to your backend service
2. Click **"Variables"** tab
3. Add the following variables:

```
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
MAX_TOKENS=4000
TEMPERATURE=0.7
SITE_URL=https://your-frontend-url.vercel.app
SITE_NAME=YouTube Summarizer
NODE_ENV=production
```

4. Railway will automatically provide `PORT` variable
5. Click **"Deploy"** to restart with new variables

#### Get Backend URL

After deployment, Railway will provide a URL like:
```
https://web-tools-production.up.railway.app
```

Save this URL - you'll need it for the frontend!

### Step 3: Set Up PostgreSQL Database (Optional - for future usage tracking)

1. In your Railway project, click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway will automatically create a PostgreSQL instance
3. Copy the `DATABASE_URL` from the database service
4. Add it to your backend environment variables:

```
DATABASE_URL=postgresql://user:password@host:port/database
```

**Note:** The current MVP doesn't use the database yet. This is for future implementation of usage tracking.

### Step 4: Deploy Frontend

#### Option A: Deploy to Vercel (Recommended for Next.js)

1. Go to [Vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click **"New Project"**
4. Import your `web-tools` repository
5. Configure project:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

6. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app
   ```
   (Use the Railway backend URL from Step 2)

7. Click **"Deploy"**

#### Option B: Deploy to Railway

1. In Railway, click **"New"** in your project
2. Select **"GitHub Repo"** again
3. Choose the same repository
4. Set **Root Directory** to `frontend`
5. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app
   ```
6. Deploy

### Step 5: Update CORS (if needed)

If you get CORS errors, update `backend/src/server.js`:

```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-url.vercel.app'],
  credentials: true
}));
```

Redeploy the backend.

## Database Setup Instructions (PostgreSQL on Railway)

### Current Status
The MVP **does not require a database** yet. The database will be used in the next phase for:
- Usage tracking (token counting)
- Credit management
- User accounts
- Payment integration

### Future Database Schema (Preview)

When implementing usage tracking, you'll create these tables:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  credits_balance DECIMAL(10, 2) DEFAULT 0,
  stripe_customer_id VARCHAR(255),
  razorpay_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage logs table
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tool_name VARCHAR(100),
  model VARCHAR(100),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  credits_deducted DECIMAL(10, 4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
```

### Connecting to Railway PostgreSQL

Once you add the PostgreSQL service in Railway:

1. Copy the connection string from Railway dashboard
2. Add to backend `.env`:
   ```
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

3. Install PostgreSQL client:
   ```bash
   cd backend
   npm install pg
   ```

4. Create a database connection file (for future use):
   ```javascript
   // backend/src/config/database.js
   import pg from 'pg';
   const { Pool } = pg;

   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     ssl: {
       rejectUnauthorized: false
     }
   });

   export default pool;
   ```

## Git Setup and Push to GitHub

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: YouTube Summarizer MVP with chunking support"

# Add remote origin
git remote add origin https://github.com/sagarmaiti45/web-tools.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## How It Works

### 1. Transcript Fetching
- Extracts video ID from YouTube URL
- Uses `youtube-transcript` library to fetch captions
- Fallback: English → Auto-detect language
- Retry logic: 2 attempts with 1-second delay

### 2. Intelligent Chunking (for Long Videos)
- Videos < 4000 chars: Single API call
- Videos > 4000 chars: Split into chunks
- Algorithm: Splits by lines to preserve context
- Each chunk processed individually

### 3. Multi-Chunk Processing
```
Long Video (15,000 chars)
    ↓
Split into 4 chunks (4000 chars each)
    ↓
Process each chunk → Get 4 summaries
    ↓
Combine all summaries → Final comprehensive summary
```

### 4. Streaming Response
- Server-Sent Events (SSE) for real-time updates
- Frontend displays summary as it's generated
- Progress indicators for multi-chunk processing

## API Endpoints

### GET `/api/transcript/:videoId`
Fetch transcript for a YouTube video.

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "dQw4w9WgXcQ",
    "transcript": [...],
    "fullText": "...",
    "duration": 600000,
    "language": "en",
    "method": "youtube-transcript"
  }
}
```

### POST `/api/summary/generate`
Generate summary with streaming support.

**Request Body:**
```json
{
  "transcriptData": {
    "fullText": "...",
    "duration": 600000,
    "videoId": "...",
    "language": "en"
  },
  "videoMetadata": {
    "title": "Video Title",
    "channel": "Channel Name"
  }
}
```

**Response:** Server-Sent Events (SSE) stream

### GET `/api/summary/config`
Get OpenRouter configuration (model, tokens, etc.)

## Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `NODE_ENV` | Environment | No (default: development) |
| `OPENROUTER_API_KEY` | OpenRouter API key | **Yes** |
| `OPENROUTER_MODEL` | AI model to use | No (default: gemini-2.0-flash) |
| `MAX_TOKENS` | Max tokens per request | No (default: 4000) |
| `TEMPERATURE` | AI temperature | No (default: 0.7) |
| `SITE_URL` | Frontend URL | No |
| `SITE_NAME` | App name | No |

### Frontend (`frontend/.env.local`)
| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | **Yes** |

## Troubleshooting

### Backend won't start
- Check if PORT 5000 is available
- Verify `OPENROUTER_API_KEY` is set correctly
- Run `npm install` in backend folder

### Frontend can't connect to backend
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure backend is running on the specified port
- Check for CORS errors in browser console

### "No transcript available" error
- Video may have captions disabled
- Try a different video
- Check if video ID is correct

### Railway deployment issues
- Ensure environment variables are set correctly
- Check Railway logs for errors
- Verify `package.json` has correct start script

## Next Steps (Phase 2)

- [ ] Implement user authentication
- [ ] Add PostgreSQL database integration
- [ ] Build usage tracking system
- [ ] Implement credit-based billing
- [ ] Add payment integration (Stripe/Razorpay)
- [ ] Create user dashboard
- [ ] Add preset prompts (like Chrome extension)
- [ ] Implement chat with video feature

## Contributing

Pull requests are welcome! For major changes, please open an issue first.

## License

MIT

## Support

For issues or questions, please open an issue on [GitHub](https://github.com/sagarmaiti45/web-tools/issues).
