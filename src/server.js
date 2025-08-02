import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import movieRoutes from './routes/movies.js';
import reviewRoutes from './routes/reviews.js';
import watchlistRoutes from './routes/watchlist.js';
import { validateEnvironment, getEnvironmentInfo } from './utils/envValidation.js';

dotenv.config();

// Validate environment variables on startup
try {
  validateEnvironment();
} catch (error) {
  console.error('💥 Server startup failed due to environment issues');
  process.exit(1);
}

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
// Configure CORS to allow multiple origins (development and production)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/watchlist', watchlistRoutes);

// Enhanced health check
app.get('/api/health', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: getEnvironmentInfo()
  };

  try {
    // Test database connection
    const { pool } = await import('./database/connection.js');
    const dbResult = await pool.query('SELECT NOW() as current_time');
    healthCheck.database = {
      status: 'connected',
      currentTime: dbResult.rows[0].current_time
    };

    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'movies', 'reviews', 'watchlists')
      ORDER BY table_name
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    const requiredTables = ['users', 'movies', 'reviews', 'watchlists'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    healthCheck.database.tables = {
      existing: existingTables,
      missing: missingTables,
      initialized: missingTables.length === 0
    };

    if (missingTables.length > 0) {
      healthCheck.status = 'WARNING';
      healthCheck.warnings = [
        `Database tables missing: ${missingTables.join(', ')}`,
        'Run database initialization script to create missing tables'
      ];
    }

  } catch (error) {
    healthCheck.status = 'ERROR';
    healthCheck.database = {
      status: 'disconnected',
      error: error.message
    };
  }

  // Check external services
  healthCheck.services = {
    omdb: process.env.OMDB_API_KEY ? 'configured' : 'missing_api_key'
  };

  const statusCode = healthCheck.status === 'ERROR' ? 503 : 200;
  res.status(statusCode).json(healthCheck);
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