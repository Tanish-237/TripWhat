# TripWhat Setup Guide

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MongoDB** ([Installation Guide](https://www.mongodb.com/docs/manual/installation/))
- **Git**
- A code editor (VS Code recommended)

## Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/Tanish-237/TripWhat.git
cd TripWhat
```

## Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file from template
cp .env.example .env

# Edit .env and add your API keys
# Minimum required for Phase 0:
# - OPENAI_API_KEY (get from https://platform.openai.com/)
# - MONGODB_URI (default: mongodb://localhost:27017/tripwhat)
```

### Get Free API Keys:

1. **OpenAI** (Required):
   - Sign up at https://platform.openai.com/
   - Navigate to API Keys section
   - Create new secret key
   - Add to `.env` as `OPENAI_API_KEY`

2. **Amadeus** (For Phase 0.2):
   - Sign up at https://developers.amadeus.com/register
   - Create new app (Self-Service)
   - Get API Key and Secret
   - Add to `.env`

3. **OpenWeatherMap** (For Phase 3):
   - Sign up at https://openweathermap.org/api
   - Get free API key (1,000 calls/day)
   - Add to `.env` as `OPENWEATHER_API_KEY`

4. **Geoapify** (For Phase 3+):
   - Sign up at https://www.geoapify.com/
   - Get free API key (3,000 requests/day)
   - Add to `.env` as `GEOAPIFY_API_KEY`

### Start MongoDB

```bash
# Option 1: Local MongoDB
mongod

# Option 2: MongoDB Atlas (Cloud - Free)
# 1. Create account at https://www.mongodb.com/cloud/atlas
# 2. Create free M0 cluster
# 3. Get connection string
# 4. Update MONGODB_URI in .env
```

### Run Backend

```bash
# From backend/ directory
npm run dev

# You should see:
# ✅ MongoDB connected successfully
# 🚀 Server running on http://localhost:5000
# 📡 Socket.io listening for connections
```

### Test Backend

Open browser to http://localhost:5000/health
Should see: `{"status":"ok","timestamp":"..."}`

---

## Step 3: Frontend Setup

```bash
# Open new terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env (API_URL should point to your backend)
```

### Run Frontend

```bash
# From frontend/ directory
npm run dev

# You should see:
# VITE ready in XXX ms
# ➜ Local: http://localhost:5173/
```

### Test Frontend

Open browser to http://localhost:5173
You should see the TripWhat homepage with:
- Logo and title
- Three feature cards
- "Start Planning Your Trip" button

---

## Step 4: Verify Everything Works

### Backend Health Check

```bash
curl http://localhost:5000/health
# Expected: {"status":"ok","timestamp":"2025-10-02T..."}

curl http://localhost:5000/api
# Expected: {"message":"TripWhat API is running"}
```

### Frontend-Backend Connection

Open browser console (F12) on http://localhost:5173 and run:

```javascript
fetch('http://localhost:5000/api')
  .then(r => r.json())
  .then(console.log)
// Should log: {message: "TripWhat API is running"}
```

---

## Common Issues & Solutions

### MongoDB Connection Failed

**Error**: `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution**:
```bash
# Make sure MongoDB is running
# Check if mongod process is active:
ps aux | grep mongod

# If not running, start it:
mongod --dbpath /path/to/data/directory
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or change PORT in backend/.env
PORT=5001
```

### TypeScript Errors in Frontend

**Error**: `Cannot find module '@/...'`

**Solution**:
```bash
# Make sure tsconfig.json has correct path aliases
# Restart VS Code TypeScript server:
# CMD/CTRL + Shift + P → "TypeScript: Restart TS Server"
```

### CORS Errors

**Error**: `Access to fetch ... has been blocked by CORS policy`

**Solution**:
- Check `FRONTEND_URL` in `backend/.env` matches your frontend URL
- Default should be `http://localhost:5173`

---

## Development Workflow

### Running Both Services

**Terminal 1** (Backend):
```bash
cd backend
npm run dev
```

**Terminal 2** (Frontend):
```bash
cd frontend
npm run dev
```

### VS Code Setup (Optional)

Install recommended extensions:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- MongoDB for VS Code

---

## Next Steps

✅ **Step 0.1 Complete**: Project setup done!

**Up Next**: 
- **Step 0.2**: Build first MCP Server (Places) 
- **Step 0.3**: Create basic LangGraph agent

See [ROADMAP.md](./ROADMAP.md) for full development plan.

---

## Troubleshooting

If you encounter any issues:

1. **Check all services are running**:
   - MongoDB: `ps aux | grep mongod`
   - Backend: http://localhost:5000/health
   - Frontend: http://localhost:5173

2. **Check logs**:
   - Backend terminal for error messages
   - Browser console (F12) for frontend errors

3. **Verify .env files**:
   - Both `backend/.env` and `frontend/.env` should exist
   - No typos in API keys
   - No spaces around `=` signs

4. **Clear cache and reinstall**:
   ```bash
   # Backend
   cd backend
   rm -rf node_modules package-lock.json
   npm install
   
   # Frontend
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

---

## Cost Tracking

As you develop, monitor API costs:

### Free Tier Limits:
- OpenAI GPT-4o-mini: ~$5 free credit (signup)
- Amadeus: 2,000 API calls/month free
- OpenWeatherMap: 1,000 calls/day free
- Geoapify: 3,000 requests/day free
- MongoDB Atlas: 512MB free (M0 cluster)

### Monitoring Costs:
- OpenAI Dashboard: https://platform.openai.com/usage
- Check logs for API call frequency in backend terminal

---

**Questions?** Open an issue on GitHub or check the [ROADMAP.md](./ROADMAP.md).
