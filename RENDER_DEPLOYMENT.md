# Render Deployment Quick Fix Guide

## 🚨 Immediate Steps to Fix 500 Errors

Your backend is experiencing 500 errors because the database tables haven't been created and environment variables may be missing. Follow these steps to fix it:

### 1. Set Environment Variables in Render Dashboard

Go to your Render service dashboard and set these environment variables:

**Required:**
```
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
OMDB_API_KEY=38c2cec1
```

**Optional (with defaults):**
```
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend-domain.com
```

### 2. Redeploy Your Backend

After setting environment variables, redeploy your service to pick up the changes.

### 3. Initialize the Database

**Option A: Using Render Shell (Recommended)**
1. Go to your service dashboard in Render
2. Click "Shell" tab
3. Run this command:
```bash
node scripts/init-production-db.js
```

**Option B: Manual Trigger**
Create a temporary endpoint to initialize the database:

1. Add this to your service temporarily
2. Deploy the change
3. Visit `https://your-backend.onrender.com/api/init-db` once
4. Remove this endpoint and redeploy

```javascript
// Add to server.js temporarily
app.get('/api/init-db', async (req, res) => {
  try {
    const initDb = await import('./scripts/init-production-db.js');
    await initDb.default();
    res.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 4. Verify Everything is Working

Check the health endpoint:
```
GET https://your-backend.onrender.com/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "environment": {
    "nodeEnv": "production",
    "hasDatabase": true,
    "hasOMDB": true,
    "hasJWTSecret": true
  },
  "database": {
    "status": "connected",
    "tables": {
      "existing": ["users", "movies", "reviews", "watchlists"],
      "missing": [],
      "initialized": true
    }
  },
  "services": {
    "omdb": "configured"
  }
}
```

### 5. Test Login

Use these default credentials:
- **Admin:** `admin@moviedb.com` / `admin123`
- **User:** `user@moviedb.com` / `user123`

## Troubleshooting

### If you still get 500 errors:

1. **Check Render logs** for specific error messages
2. **Verify DATABASE_URL** is correct (copy from your PostgreSQL service)
3. **Check environment variables** are all set correctly
4. **Run health check** to see what's missing

### Common Issues:

**"relation 'users' does not exist"**
- Database initialization hasn't been run
- Follow step 3 above

**"JWT_SECRET is required"**
- Environment variable not set
- Add it in Render dashboard and redeploy

**"OMDB API key not configured"** 
- Set `OMDB_API_KEY` environment variable
- Or the app will work with limited functionality

### Database Connection Issues:

Your connection code now supports both:
- `DATABASE_URL` (provided by Render PostgreSQL)
- Individual DB variables (for local development)

Make sure you're using the `DATABASE_URL` from your Render PostgreSQL service.

## Important Notes

1. **⚠️ Change default passwords** after successful deployment!
2. **Database initialization only needs to be run once**
3. **Environment variables require a redeploy** to take effect
4. **Check health endpoint** after any changes

## After Setup

Once everything is working:
1. Your frontend should be able to connect successfully
2. Login should work with default credentials
3. Featured movies should load (if OMDB is configured)
4. All endpoints should return proper responses instead of 500 errors

The health check endpoint at `/api/health` will help you verify everything is working correctly.