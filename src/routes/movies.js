import express from 'express';
import { body, validationResult, query as validationQuery } from 'express-validator';
import { Movie } from '../models/Movie.js';
import { OMDBService } from '../services/omdb.js';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const movieCreationValidation = [
  body('title')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title is required and must be less than 255 characters'),
  body('year')
    .optional()
    .isInt({ min: 1800, max: new Date().getFullYear() + 5 })
    .withMessage('Year must be a valid year'),
  body('runtime')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Runtime must be less than 50 characters'),
  body('director')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Director must be less than 255 characters'),
  body('cast')
    .optional()
    .isArray()
    .withMessage('Cast must be an array'),
  body('genre')
    .optional()
    .isArray()
    .withMessage('Genre must be an array'),
  body('plot')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Plot must be less than 2000 characters'),
  body('imdbRating')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('IMDB Rating must be between 0 and 10')
];

// GET /api/movies/search - Search movies (OMDB + Custom combined)
router.get('/search', [
  validationQuery('q')
    .isLength({ min: 1 })
    .withMessage('Search query is required'),
  validationQuery('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { q: query, page = 1 } = req.query;
    const pageNum = parseInt(page);

    // Search both OMDB and custom database in parallel
    const [omdbResults, customResults] = await Promise.all([
      OMDBService.searchMovies(query, pageNum),
      Movie.search(query, 20, (pageNum - 1) * 20)
    ]);

    // Transform custom movies to OMDB format
    const transformedCustomMovies = customResults.map(Movie.transformToOMDBFormat);

    // Combine results
    const combinedMovies = [
      ...(omdbResults.Search || []),
      ...transformedCustomMovies
    ];

    // Remove duplicates based on title and year (basic deduplication)
    const uniqueMovies = combinedMovies.filter((movie, index, self) => 
      index === self.findIndex(m => 
        m.Title.toLowerCase() === movie.Title.toLowerCase() && 
        m.Year === movie.Year
      )
    );

    res.json({
      Search: uniqueMovies,
      totalResults: (parseInt(omdbResults.totalResults) + customResults.length).toString(),
      Response: uniqueMovies.length > 0 ? 'True' : 'False',
      page: pageNum
    });

  } catch (error) {
    console.error('Movie search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/movies/:id - Get movie details by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    let movie;
    let movieSource = 'omdb';

    // Check if it's a custom movie (starts with 'custom_')
    if (id.startsWith('custom_')) {
      const customId = id.replace('custom_', '');
      const customMovie = await Movie.findById(customId);
      
      if (customMovie) {
        movie = Movie.transformToOMDBFormat(customMovie);
        movieSource = 'custom';
      }
    } else {
      // Get from OMDB
      movie = await OMDBService.getMovieById(id);
    }

    if (!movie || movie.Response === 'False') {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Add source information
    movie.Source = movieSource;

    res.json(movie);

  } catch (error) {
    console.error('Movie detail error:', error);
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
});

// POST /api/movies - Create new custom movie (Admin only)
router.post('/', authenticateToken, requireAdmin, movieCreationValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const movieData = req.body;
    const createdBy = req.user.id;

    const newMovie = await Movie.create(movieData, createdBy);
    const transformedMovie = Movie.transformToOMDBFormat(newMovie);

    res.status(201).json({
      success: true,
      movie: transformedMovie,
      message: 'Movie created successfully'
    });

  } catch (error) {
    console.error('Movie creation error:', error);
    res.status(500).json({ error: 'Failed to create movie' });
  }
});

// GET /api/movies/featured - Get featured movies (OMDB + Custom)
router.get('/lists/featured', async (req, res) => {
  try {
    // Get featured movies from OMDB and latest custom movies
    const [omdbFeatured, customMovies] = await Promise.all([
      OMDBService.getFeaturedMovies(),
      Movie.findAll(6, 0) // Get latest 6 custom movies
    ]);

    // Transform custom movies
    const transformedCustomMovies = customMovies.map(Movie.transformToOMDBFormat);

    // Combine and limit results
    const featuredMovies = [
      ...omdbFeatured,
      ...transformedCustomMovies
    ].slice(0, 12); // Limit to 12 total

    res.json(featuredMovies);

  } catch (error) {
    console.error('Featured movies error:', error);
    res.status(500).json({ error: 'Failed to fetch featured movies' });
  }
});

// GET /api/movies/lists/top-rated - Get top rated movies
router.get('/lists/top-rated', [
  validationQuery('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
], async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const pageNum = parseInt(page);

    const result = await OMDBService.getTopRatedMovies(pageNum);
    
    res.json(result);

  } catch (error) {
    console.error('Top rated movies error:', error);
    res.status(500).json({ error: 'Failed to fetch top rated movies' });
  }
});

// GET /api/movies/lists/new-releases - Get new releases
router.get('/lists/new-releases', async (req, res) => {
  try {
    const newReleases = await OMDBService.getNewReleases();
    res.json(newReleases);

  } catch (error) {
    console.error('New releases error:', error);
    res.status(500).json({ error: 'Failed to fetch new releases' });
  }
});

// GET /api/movies/custom - Get all custom movies (Admin only)
router.get('/admin/custom-movies', authenticateToken, requireAdmin, [
  validationQuery('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  validationQuery('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const [movies, totalCount] = await Promise.all([
      Movie.findAll(limitNum, offset),
      Movie.getCount()
    ]);

    const transformedMovies = movies.map(movie => ({
      ...Movie.transformToOMDBFormat(movie),
      createdBy: movie.created_by_name,
      createdAt: movie.created_at
    }));

    res.json({
      movies: transformedMovies,
      totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      hasMore: offset + limitNum < totalCount
    });

  } catch (error) {
    console.error('Custom movies fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch custom movies' });
  }
});

// PUT /api/movies/custom/:id - Update custom movie (Admin only)
router.put('/admin/custom-movies/:id', authenticateToken, requireAdmin, movieCreationValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const movieData = req.body;
    const updatedBy = req.user.id;

    const updatedMovie = await Movie.update(id, movieData, updatedBy);
    
    if (!updatedMovie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const transformedMovie = Movie.transformToOMDBFormat(updatedMovie);

    res.json({
      success: true,
      movie: transformedMovie,
      message: 'Movie updated successfully'
    });

  } catch (error) {
    console.error('Movie update error:', error);
    res.status(500).json({ error: 'Failed to update movie' });
  }
});

// DELETE /api/movies/custom/:id - Delete custom movie (Admin only)
router.delete('/admin/custom-movies/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedMovie = await Movie.delete(id);
    
    if (!deletedMovie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.json({
      success: true,
      message: 'Movie deleted successfully'
    });

  } catch (error) {
    console.error('Movie deletion error:', error);
    res.status(500).json({ error: 'Failed to delete movie' });
  }
});

export default router;