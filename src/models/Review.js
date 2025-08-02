import { query } from '../database/connection.js';

export class Review {
  static async create({ userId, movieId, movieSource, title, content, rating }) {
    const result = await query(`
      INSERT INTO reviews (user_id, movie_id, movie_source, title, content, rating)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, movieId, movieSource, title, content, rating]);

    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(`
      SELECT r.*, u.name as author_name, u.email as author_email
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `, [id]);

    return result.rows[0] || null;
  }

  static async findByMovie(movieId, movieSource = 'omdb', limit = 20, offset = 0) {
    const result = await query(`
      SELECT r.*, u.name as author_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.movie_id = $1 AND r.movie_source = $2
      ORDER BY r.created_at DESC
      LIMIT $3 OFFSET $4
    `, [movieId, movieSource, limit, offset]);

    return result.rows;
  }

  static async findByUser(userId, limit = 20, offset = 0) {
    const result = await query(`
      SELECT r.*, u.name as author_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    return result.rows;
  }

  static async findUserReviewForMovie(userId, movieId, movieSource = 'omdb') {
    const result = await query(`
      SELECT r.*, u.name as author_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.user_id = $1 AND r.movie_id = $2 AND r.movie_source = $3
    `, [userId, movieId, movieSource]);

    return result.rows[0] || null;
  }

  static async update(id, { title, content, rating }) {
    const result = await query(`
      UPDATE reviews SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        rating = COALESCE($3, rating),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [title, content, rating, id]);

    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM reviews WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  static async getMovieStats(movieId, movieSource = 'omdb') {
    const result = await query(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating::numeric) as average_rating,
        COUNT(CASE WHEN rating >= 7 THEN 1 END) * 100.0 / COUNT(*) as recommendation_percentage
      FROM reviews
      WHERE movie_id = $1 AND movie_source = $2
    `, [movieId, movieSource]);

    const stats = result.rows[0];
    return {
      totalReviews: parseInt(stats.total_reviews) || 0,
      averageRating: stats.average_rating ? parseFloat(stats.average_rating).toFixed(1) : '0.0',
      recommendationPercentage: stats.recommendation_percentage ? Math.round(parseFloat(stats.recommendation_percentage)) : 0
    };
  }

  static async markHelpful(reviewId, isHelpful = true) {
    const result = await query(`
      UPDATE reviews SET
        helpful_count = helpful_count + CASE WHEN $2 THEN 1 ELSE 0 END,
        total_votes = total_votes + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [reviewId, isHelpful]);

    return result.rows[0];
  }

  static async getRecentReviews(limit = 10) {
    const result = await query(`
      SELECT r.*, u.name as author_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  // Transform database review to frontend format
  static transformToFrontendFormat(review) {
    return {
      id: review.id,
      author: review.author_name,
      rating: review.rating,
      content: review.content,
      title: review.title,
      date: this.getRelativeTime(review.created_at),
      helpful: review.helpful_count || 0,
      total: review.total_votes || 0,
      movieId: review.movie_id,
      movieSource: review.movie_source
    };
  }

  static getRelativeTime(date) {
    const now = new Date();
    const reviewDate = new Date(date);
    const diffInSeconds = Math.floor((now - reviewDate) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2419200) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 29030400) {
      const months = Math.floor(diffInSeconds / 2419200);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffInSeconds / 29030400);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  }
}