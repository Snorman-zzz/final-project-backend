import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use DATABASE_URL for production (Render, Heroku, etc.) or individual env vars for local development
const poolConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

console.log('🔧 Database configuration:', {
  usingDatabaseUrl: !!process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV,
  ssl: process.env.NODE_ENV === 'production'
});

export const pool = new Pool(poolConfig);

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Utility function to execute queries
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Query error:', { text, error: error.message });
    throw error;
  }
};

export default pool;