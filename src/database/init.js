import { pool, query } from './connection.js';
import bcrypt from 'bcryptjs';

const initializeDatabase = async () => {
  try {
    console.log('🚀 Initializing database...');

    // Create Users table
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

    // Create Movies table (for custom movies added by admin)
    await query(`
      CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        year INTEGER,
        runtime VARCHAR(50),
        director VARCHAR(255),
        cast_members TEXT[], -- Array of cast members
        genre TEXT[], -- Array of genres
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

    // Create Reviews table (supports both OMDB and custom movies)
    await query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        movie_id VARCHAR(50) NOT NULL, -- Can be OMDB ID or custom movie ID
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

    // Create Watchlists table (supports both OMDB and custom movies)
    await query(`
      CREATE TABLE IF NOT EXISTS watchlists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        movie_id VARCHAR(50) NOT NULL, -- Can be OMDB ID or custom movie ID
        movie_source VARCHAR(20) DEFAULT 'omdb' CHECK (movie_source IN ('omdb', 'custom')),
        movie_data JSONB, -- Store movie details for faster access
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, movie_id, movie_source)
      )
    `);

    // Create indexes for better performance
    await query('CREATE INDEX IF NOT EXISTS idx_reviews_movie ON reviews(movie_id, movie_source)');
    await query('CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');

    // Create default admin user
    const adminEmail = 'admin@moviedb.com';
    const adminPassword = 'admin123';
    const adminPasswordHash = await bcrypt.hash(adminPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    const existingAdmin = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (existingAdmin.rows.length === 0) {
      await query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES ($1, $2, $3, $4)
      `, [adminEmail, adminPasswordHash, 'Admin User', 'admin']);
      console.log('✅ Created default admin user');
    }

    // Create default regular user
    const userEmail = 'user@moviedb.com';
    const userPassword = 'user123';
    const userPasswordHash = await bcrypt.hash(userPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [userEmail]);
    
    if (existingUser.rows.length === 0) {
      await query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES ($1, $2, $3, $4)
      `, [userEmail, userPasswordHash, 'John Doe', 'user']);
      console.log('✅ Created default regular user');
    }

    console.log('✅ Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database setup failed:', error);
      process.exit(1);
    });
}

export default initializeDatabase;