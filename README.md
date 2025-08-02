# Movie App Backend

A Node.js/Express backend API for the Movie App that provides user authentication, movie management, reviews, and watchlist functionality.

## Features

- **User Authentication**: JWT-based authentication with bcrypt password hashing
- **Movie Management**: Hybrid system combining OMDB API with custom database movies
- **Review System**: User reviews for both OMDB and custom movies
- **Watchlist**: Personal movie watchlists for authenticated users
- **Admin Features**: Admin-only movie creation and management

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT + bcrypt
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate limiting

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Movies
- `GET /api/movies/search?q=query` - Search movies (OMDB + Custom)
- `GET /api/movies/:id` - Get movie details
- `POST /api/movies` - Create custom movie (Admin only)
- `GET /api/movies/lists/featured` - Get featured movies
- `GET /api/movies/lists/top-rated` - Get top rated movies
- `GET /api/movies/lists/new-releases` - Get new releases
- `GET /api/movies/admin/custom-movies` - Get all custom movies (Admin)
- `PUT /api/movies/admin/custom-movies/:id` - Update custom movie (Admin)
- `DELETE /api/movies/admin/custom-movies/:id` - Delete custom movie (Admin)

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/movie/:movieId` - Get movie reviews
- `GET /api/reviews/user/:userId` - Get user reviews
- `GET /api/reviews/my-reviews` - Get current user reviews
- `GET /api/reviews/:id` - Get specific review
- `PUT /api/reviews/:id` - Update review (author only)
- `DELETE /api/reviews/:id` - Delete review (author/admin)
- `POST /api/reviews/:id/helpful` - Mark review as helpful
- `GET /api/reviews/lists/recent` - Get recent reviews

### Watchlist
- `POST /api/watchlist` - Add movie to watchlist
- `GET /api/watchlist` - Get user's watchlist
- `DELETE /api/watchlist/:movieId` - Remove from watchlist
- `GET /api/watchlist/check/:movieId` - Check if in watchlist
- `POST /api/watchlist/check-multiple` - Check multiple movies
- `DELETE /api/watchlist` - Clear entire watchlist
- `GET /api/watchlist/popular` - Get popular movies
- `GET /api/watchlist/stats` - Get watchlist statistics

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v13+)
- OMDB API Key

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database credentials and API keys.

3. **Set up PostgreSQL database:**
   ```sql
   CREATE DATABASE movieapp;
   CREATE USER movieapp WITH PASSWORD 'movieapp';
   GRANT ALL PRIVILEGES ON DATABASE movieapp TO movieapp;
   ```

4. **Initialize database schema:**
   ```bash
   npm run init-db
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

The server will start on http://localhost:5000

### Default Users
The database initialization creates two default users:
- **Admin**: `admin@moviedb.com` / `admin123`
- **User**: `user@moviedb.com` / `user123`

## Database Schema

### Users
- id, email, password_hash, name, role, created_at, updated_at

### Movies (Custom)
- id, title, year, runtime, director, cast, genre, plot, poster, imdb_rating, language, country, awards, box_office, created_by, created_at, updated_at

### Reviews
- id, user_id, movie_id, movie_source, title, content, rating, helpful_count, total_votes, created_at, updated_at

### Watchlists
- id, user_id, movie_id, movie_source, movie_data, created_at

## Movie Data Architecture

The system seamlessly blends two movie sources:

1. **OMDB API Movies**: External movie database with rich metadata
2. **Custom Database Movies**: Movies added by admins via the admin panel

### How it works:
- **Search**: Queries both OMDB and custom database, returns combined results
- **Movie Details**: Handles both OMDB IDs and custom movie IDs
- **Reviews & Watchlists**: Support both movie types via `movie_source` field

### Movie ID Format:
- **OMDB Movies**: Use original OMDB ID (e.g., "tt0468569")
- **Custom Movies**: Prefixed with "custom_" (e.g., "custom_1")

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable rounds
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive validation using express-validator
- **CORS**: Configured for frontend domain
- **Helmet**: Security headers
- **SQL Injection Protection**: Parameterized queries

## Development

### Environment Variables
See `.env.example` for all required environment variables.

### Database Operations
- `npm run init-db` - Initialize database schema and default users
- Database connection details in `src/database/connection.js`

### Testing the API
Use tools like Postman or curl to test the endpoints. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Deployment

1. Set `NODE_ENV=production`
2. Use secure JWT secrets
3. Configure production database
4. Set up SSL/TLS
5. Use process manager (PM2)
6. Set up reverse proxy (Nginx)