# Deployment Guide for Movie Database Backend

This guide covers deploying the Movie Database backend to Render.com or similar cloud platforms.

## Prerequisites

1. PostgreSQL database (Render provides free PostgreSQL databases)
2. Node.js runtime environment
3. Environment variables configured

## Environment Variables Required

### Database Connection
- `DATABASE_URL` - PostgreSQL connection string (provided by Render)
- `NODE_ENV` - Set to `production` for production deployment

### Authentication
- `JWT_SECRET` - Strong secret key for JWT token signing
- `JWT_EXPIRES_IN` - Token expiration time (e.g., "7d")
- `BCRYPT_ROUNDS` - Password hashing rounds (recommended: 12)

### External APIs
- `OMDB_API_KEY` - API key from OMDB for movie data

### CORS Configuration
- `FRONTEND_URL` - Your frontend application URL

### Optional
- `PORT` - Server port (Render sets this automatically)

## Render Deployment Steps

### 1. Database Setup
1. Create a PostgreSQL database on Render
2. Copy the `DATABASE_URL` from your database settings
3. The database will be automatically configured with SSL

### 2. Web Service Setup
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Configure build and start commands:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. Environment Variables
Set these in your Render service environment:

```bash
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
OMDB_API_KEY=your-omdb-api-key
FRONTEND_URL=https://your-frontend-domain.com
```

### 4. Database Initialization
After deployment, run the database initialization:
1. Connect to your Render service shell
2. Run: `node src/database/init.js`

This creates the required tables and default users.

## Default Users Created

The system creates two default users:

```
Admin User:
- Email: admin@moviedb.com
- Password: admin123
- Role: admin

Regular User:
- Email: user@moviedb.com  
- Password: user123
- Role: user
```

**⚠️ Important**: Change these default passwords in production!

## Database Schema

The application automatically creates these tables:
- `users` - User accounts and authentication
- `movies` - Custom movies added by admins
- `reviews` - User reviews for both OMDB and custom movies
- `watchlists` - User movie watchlists

## API Endpoints

Once deployed, your API will be available at:
`https://your-app-name.onrender.com/api`

### Health Check
- `GET /api/health` - Service health status

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Token verification

### Movies
- `GET /api/movies/search` - Search movies
- `POST /api/movies` - Create custom movie (admin only)
- `GET /api/movies/lists/featured` - Featured movies

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/movie/:id` - Get movie reviews

### Watchlist
- `POST /api/watchlist` - Add to watchlist
- `GET /api/watchlist` - Get user watchlist
- `DELETE /api/watchlist/:id` - Remove from watchlist

## Troubleshooting

### Common Issues

1. **500 Error on Login**
   - Check `DATABASE_URL` is correctly set
   - Verify database tables exist (run init script)
   - Check JWT_SECRET is set

2. **CORS Errors**
   - Ensure `FRONTEND_URL` matches your frontend domain
   - Check allowed origins in CORS configuration

3. **Database Connection Failed**
   - Verify `DATABASE_URL` format
   - Check database is running and accessible
   - Ensure SSL is configured for production

4. **Token Verification Failed**
   - Check `JWT_SECRET` matches between deployments
   - Verify token expiration settings

### Debugging

Enable detailed logging by setting `NODE_ENV=development` temporarily:

```bash
# This will show detailed query logs and error stacks
NODE_ENV=development
```

### Log Analysis

Check Render logs for these key indicators:

```
✅ Connected to PostgreSQL database  # Database connection successful
🚀 Server running on port 10000      # Server started
📊 Executed query                     # Database queries working
❌ Query error                        # Database issues
```

## Security Considerations

1. **Secrets Management**
   - Use strong, unique `JWT_SECRET`
   - Regularly rotate API keys
   - Never commit secrets to git

2. **Database Security**
   - Use SSL in production (automatically handled)
   - Limit database access
   - Regular backups

3. **API Security**
   - Rate limiting is enabled (100 requests/15min)
   - Helmet.js for security headers
   - Input validation on all endpoints

## Performance Optimization

1. **Database**
   - Connection pooling enabled (max 20 connections)
   - Indexes on frequently queried columns
   - Query timeout protection

2. **Caching**
   - OMDB API responses cached in watchlist
   - Static movie data cached

3. **Monitoring**
   - Health check endpoint for uptime monitoring
   - Query performance logging
   - Error tracking

## Backup and Recovery

1. **Database Backups**
   - Render automatically backs up PostgreSQL databases
   - Consider additional backup strategies for critical data

2. **Application Recovery**
   - Keep database initialization script updated
   - Document any manual data seeding steps
   - Test recovery procedures

## Scaling Considerations

1. **Database Scaling**
   - Monitor connection pool usage
   - Consider read replicas for heavy read workloads
   - Optimize queries with EXPLAIN ANALYZE

2. **Application Scaling**
   - Render handles horizontal scaling
   - Consider Redis for session storage at scale
   - Implement caching layers for frequently accessed data

For additional support, check Render's documentation or the application logs for specific error details.