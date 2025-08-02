import { query } from '../database/connection.js';

export class Watchlist {
  static async add({ userId, movieId, movieSource, movieData }) {
    try {
      const result = await query(`
        INSERT INTO watchlists (user_id, movie_id, movie_source, movie_data)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, movie_id, movie_source) DO NOTHING
        RETURNING *
      `, [userId, movieId, movieSource, JSON.stringify(movieData)]);

      return result.rows[0];
    } catch (error) {
      // Handle unique constraint violation gracefully
      if (error.code === '23505') {
        return null; // Already in watchlist
      }
      throw error;
    }
  }

  static async remove(userId, movieId, movieSource = 'omdb') {
    const result = await query(`
      DELETE FROM watchlists 
      WHERE user_id = $1 AND movie_id = $2 AND movie_source = $3
      RETURNING *
    `, [userId, movieId, movieSource]);

    return result.rows[0];
  }

  static async findByUser(userId, limit = 50, offset = 0) {
    const result = await query(`
      SELECT * FROM watchlists 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    return result.rows;
  }

  static async isInWatchlist(userId, movieId, movieSource = 'omdb') {
    const result = await query(`
      SELECT id FROM watchlists 
      WHERE user_id = $1 AND movie_id = $2 AND movie_source = $3
    `, [userId, movieId, movieSource]);

    return result.rows.length > 0;
  }

  static async getUserWatchlistCount(userId) {
    const result = await query(`
      SELECT COUNT(*) as count FROM watchlists WHERE user_id = $1
    `, [userId]);

    return parseInt(result.rows[0].count);
  }

  static async removeAll(userId) {
    const result = await query(`
      DELETE FROM watchlists WHERE user_id = $1 RETURNING *
    `, [userId]);

    return result.rows;
  }

  static async findById(id) {
    const result = await query(`
      SELECT w.*, u.name as user_name 
      FROM watchlists w
      JOIN users u ON w.user_id = u.id
      WHERE w.id = $1
    `, [id]);

    return result.rows[0] || null;
  }

  // Get popular movies (most added to watchlists)
  static async getPopularMovies(limit = 10) {
    const result = await query(`
      SELECT 
        movie_id, 
        movie_source, 
        movie_data,
        COUNT(*) as watchlist_count
      FROM watchlists 
      GROUP BY movie_id, movie_source, movie_data
      ORDER BY watchlist_count DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  // Transform watchlist item to frontend format
  static transformToFrontendFormat(watchlistItem) {
    const movieData = typeof watchlistItem.movie_data === 'string' 
      ? JSON.parse(watchlistItem.movie_data) 
      : watchlistItem.movie_data;

    return {
      id: watchlistItem.id,
      movieId: watchlistItem.movie_id,
      movieSource: watchlistItem.movie_source,
      addedAt: watchlistItem.created_at,
      ...movieData // Spread the movie data (title, poster, etc.)
    };
  }

  // Check if multiple movies are in user's watchlist
  static async checkMultipleInWatchlist(userId, movieList) {
    if (!movieList || movieList.length === 0) return {};

    // Build the conditions for the WHERE clause
    const conditions = movieList.map((movie, index) => 
      `(movie_id = $${index * 2 + 2} AND movie_source = $${index * 2 + 3})`
    ).join(' OR ');

    const values = [userId];
    movieList.forEach(movie => {
      values.push(movie.movieId, movie.movieSource || 'omdb');
    });

    const result = await query(`
      SELECT movie_id, movie_source FROM watchlists 
      WHERE user_id = $1 AND (${conditions})
    `, values);

    // Transform to a lookup object
    const watchlistLookup = {};
    result.rows.forEach(row => {
      const key = `${row.movie_id}_${row.movie_source}`;
      watchlistLookup[key] = true;
    });

    return watchlistLookup;
  }
}