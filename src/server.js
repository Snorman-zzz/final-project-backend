import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import movieRoutes from './routes/movies.js';
import reviewRoutes from './routes/reviews.js';
import watchlistRoutes from './routes/watchlist.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(limiter);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/watchlist', watchlistRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Temporary database initialization endpoint (remove after use)
app.get('/api/init-db', async (req, res) => {
  try {
    console.log('🚀 Starting database initialization via endpoint...');
    
    const { query } = await import('./database/connection.js');
    const bcrypt = await import('bcryptjs');
    
    // Create Users table
    console.log('👥 Creating users table...');
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Movies table
    console.log('🎬 Creating movies table...');
    await query(`
      CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        year INTEGER,
        runtime VARCHAR(50),
        director VARCHAR(255),
        cast_members TEXT[],
        genre TEXT[],
        plot TEXT,
        poster VARCHAR(500),
        imdb_rating DECIMAL(3,1),
        language VARCHAR(100),
        country VARCHAR(100),
        awards TEXT,
        box_office VARCHAR(100),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Reviews table
    console.log('⭐ Creating reviews table...');
    await query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        movie_id VARCHAR(50) NOT NULL,
        movie_source VARCHAR(20) DEFAULT 'omdb' CHECK (movie_source IN ('omdb', 'custom')),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 10),
        helpful_count INTEGER DEFAULT 0,
        total_votes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, movie_id, movie_source)
      )
    `);

    // Create Watchlists table
    console.log('📋 Creating watchlists table...');
    await query(`
      CREATE TABLE IF NOT EXISTS watchlists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        movie_id VARCHAR(50) NOT NULL,
        movie_source VARCHAR(20) DEFAULT 'omdb' CHECK (movie_source IN ('omdb', 'custom')),
        movie_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, movie_id, movie_source)
      )
    `);

    // Create indexes
    console.log('🔧 Creating indexes...');
    await query('CREATE INDEX IF NOT EXISTS idx_reviews_movie ON reviews(movie_id, movie_source)');
    await query('CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');

    // Create default admin user
    console.log('👑 Creating default admin user...');
    const adminEmail = 'admin@moviedb.com';
    const adminPassword = 'admin123';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

    const existingAdmin = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (existingAdmin.rows.length === 0) {
      await query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES ($1, $2, $3, $4)
      `, [adminEmail, adminPasswordHash, 'Admin User', 'admin']);
      console.log('✅ Created default admin user');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create default regular user
    console.log('👤 Creating default regular user...');
    const userEmail = 'user@moviedb.com';
    const userPassword = 'user123';
    const userPasswordHash = await bcrypt.hash(userPassword, 12);

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [userEmail]);
    
    if (existingUser.rows.length === 0) {
      await query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES ($1, $2, $3, $4)
      `, [userEmail, userPasswordHash, 'John Doe', 'user']);
      console.log('✅ Created default regular user');
    } else {
      console.log('ℹ️  Regular user already exists');
    }

    // Verify tables
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'movies', 'reviews', 'watchlists')
      ORDER BY table_name
    `);
    
    const createdTables = tableCheck.rows.map(row => row.table_name);
    
    console.log('🎉 Database initialization completed!');
    
    res.json({
      success: true,
      message: 'Database initialized successfully!',
      tables: createdTables,
      defaultUsers: {
        admin: { email: 'admin@moviedb.com', password: 'admin123' },
        user: { email: 'user@moviedb.com', password: 'user123' }
      },
      warning: 'IMPORTANT: Remove this endpoint (/api/init-db) after use for security!'
    });

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Database initialization failed'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});