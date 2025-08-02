import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const checkDatabase = async () => {
  try {
    console.log('🔍 Checking database connection...');
    
    // Try to connect to the database
    const { Client } = await import('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'movieapp',
      user: process.env.DB_USER || 'movieapp',
      password: process.env.DB_PASSWORD || 'movieapp',
    });
    
    await client.connect();
    console.log('✅ Database connection successful');
    
    // Check if tables exist
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'movies', 'reviews', 'watchlists')
    `);
    
    if (result.rows.length < 4) {
      console.log('⚠️  Database tables not found. Running initialization...');
      await client.end();
      
      // Run database initialization
      await execAsync('npm run init-db');
      console.log('✅ Database initialized successfully');
    } else {
      console.log('✅ Database tables found');
    }
    
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n📋 Setup Instructions:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Create database: CREATE DATABASE movieapp;');
    console.log('3. Create user: CREATE USER movieapp WITH PASSWORD \'movieapp\';');
    console.log('4. Grant privileges: GRANT ALL PRIVILEGES ON DATABASE movieapp TO movieapp;');
    console.log('5. Update .env file with correct database credentials');
    return false;
  }
};

const startServer = async () => {
  console.log('🚀 Starting Movie App Backend...\n');
  
  const dbReady = await checkDatabase();
  
  if (dbReady) {
    console.log('🎬 Starting Express server...');
    // Import and start the server
    await import('./src/server.js');
  } else {
    console.log('💥 Cannot start server - database not ready');
    process.exit(1);
  }
};

startServer();