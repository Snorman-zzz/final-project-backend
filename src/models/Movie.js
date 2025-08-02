import { query } from '../database/connection.js';

export class Movie {
  static async create(movieData, createdBy) {
    const {
      title, year, runtime, director, cast, genre, plot, poster,
      imdbRating, language, country, awards, boxOffice
    } = movieData;

    const result = await query(`
      INSERT INTO movies (
        title, year, runtime, director, cast_members, genre, plot, poster,
        imdb_rating, language, country, awards, box_office, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      title, 
      year ? parseInt(year) : null, 
      runtime, 
      director, 
      cast || [], 
      genre || [], 
      plot, 
      poster,
      imdbRating ? parseFloat(imdbRating) : null, 
      language, 
      country, 
      awards, 
      boxOffice, 
      createdBy
    ]);

    return result.rows[0];
  }

  static async findById(id) {
    const result = await query('SELECT * FROM movies WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findAll(limit = 20, offset = 0) {
    const result = await query(`
      SELECT m.*, u.name as created_by_name
      FROM movies m
      LEFT JOIN users u ON m.created_by = u.id
      ORDER BY m.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return result.rows;
  }

  static async search(searchTerm, limit = 20, offset = 0) {
    const result = await query(`
      SELECT m.*, u.name as created_by_name
      FROM movies m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE 
        LOWER(m.title) LIKE LOWER($1) 
        OR LOWER(m.director) LIKE LOWER($1)
        OR EXISTS (
          SELECT 1 FROM unnest(m.cast_members) as cast_member 
          WHERE LOWER(cast_member) LIKE LOWER($1)
        )
        OR EXISTS (
          SELECT 1 FROM unnest(m.genre) as genre_item 
          WHERE LOWER(genre_item) LIKE LOWER($1)
        )
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [`%${searchTerm}%`, limit, offset]);

    return result.rows;
  }

  static async update(id, movieData, updatedBy) {
    const {
      title, year, runtime, director, cast, genre, plot, poster,
      imdbRating, language, country, awards, boxOffice
    } = movieData;

    const result = await query(`
      UPDATE movies SET
        title = COALESCE($1, title),
        year = COALESCE($2, year),
        runtime = COALESCE($3, runtime),
        director = COALESCE($4, director),
        cast_members = COALESCE($5, cast_members),
        genre = COALESCE($6, genre),
        plot = COALESCE($7, plot),
        poster = COALESCE($8, poster),
        imdb_rating = COALESCE($9, imdb_rating),
        language = COALESCE($10, language),
        country = COALESCE($11, country),
        awards = COALESCE($12, awards),
        box_office = COALESCE($13, box_office),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [
      title, 
      year ? parseInt(year) : null, 
      runtime, 
      director, 
      cast, 
      genre, 
      plot, 
      poster,
      imdbRating ? parseFloat(imdbRating) : null, 
      language, 
      country, 
      awards, 
      boxOffice, 
      id
    ]);

    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM movies WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  static async getCount() {
    const result = await query('SELECT COUNT(*) as count FROM movies');
    return parseInt(result.rows[0].count);
  }

  static async getMoviesByCreator(createdBy, limit = 20, offset = 0) {
    const result = await query(`
      SELECT m.*, u.name as created_by_name
      FROM movies m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.created_by = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [createdBy, limit, offset]);

    return result.rows;
  }

  // Transform database movie to OMDB-like format for frontend compatibility
  static transformToOMDBFormat(movie) {
    return {
      imdbID: `custom_${movie.id}`,
      Title: movie.title,
      Year: movie.year?.toString() || '',
      Runtime: movie.runtime || '',
      Director: movie.director || '',
      Actors: Array.isArray(movie.cast_members) ? movie.cast_members.join(', ') : movie.cast_members || '',
      Genre: Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre || '',
      Plot: movie.plot || '',
      Poster: movie.poster || '',
      imdbRating: movie.imdb_rating?.toString() || '',
      Language: movie.language || '',
      Country: movie.country || '',
      Awards: movie.awards || '',
      BoxOffice: movie.box_office || '',
      Response: 'True',
      Source: 'custom'
    };
  }
}