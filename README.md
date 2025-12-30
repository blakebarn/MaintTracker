# 🔧 Maintenance Tracker

A shared maintenance record app where you and your wife can upload receipt images and automatically extract maintenance details using Claude's vision API.

## Quick Start

1. Get API key from https://console.anthropic.com
2. Follow setup in `SETUP_GUIDE.md`
3. Run backend: `npm start` (from `maintenance-tracker-backend`)
4. Run frontend: `npm run dev` (from `maintenance-tracker-frontend`)

## Deployment

See `DEPLOYMENT.md` for cloud deployment options (Vercel, Railway, Render).

## Structure

- `maintenance-tracker-backend/` - Express server with Claude integration
- `maintenance-tracker-frontend/` - React app with file upload
- Docs: `SETUP_GUIDE.md` and `DEPLOYMENT.md`
```

Click "Commit new file" at the bottom.

---

**Step 2: Create the backend folder structure**

Click "Create a new file" again. Type this filename:
```
maintenance-tracker-backend/package.json

{
  "name": "maintenance-tracker-backend",
  "version": "1.0.0",
  "description": "Backend for shared maintenance tracker",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.3.1",
    "@anthropic-ai/sdk": "^0.24.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
