import express from 'express';
import { body, validationResult, query as validationQuery } from 'express-validator';
import { Watchlist } from '../models/Watchlist.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const addToWatchlistValidation = [
  body('movieId')
    .isLength({ min: 1 })
    .withMessage('Movie ID is required'),
  body('movieSource')
    .optional()
    .isIn(['omdb', 'custom'])
    .withMessage('Movie source must be either "omdb" or "custom"'),
  body('movieData')
    .isObject()
    .withMessage('Movie data object is required'),
  body('movieData.Title')
    .isLength({ min: 1 })
    .withMessage('Movie title is required in movieData'),
  body('movieData.Poster')
    .optional()
    .isURL()
    .withMessage('Poster must be a valid URL if provided')
];

// POST /api/watchlist - Add movie to watchlist
router.post('/', authenticateToken, addToWatchlistValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { movieId, movieSource = 'omdb', movieData } = req.body;
    const userId = req.user.id;

    // Check if already in watchlist
    const isAlreadyInWatchlist = await Watchlist.isInWatchlist(userId, movieId, movieSource);
    if (isAlreadyInWatchlist) {
      return res.status(409).json({ 
        error: 'Movie is already in your watchlist' 
      });
    }

    const watchlistItem = await Watchlist.add({
      userId,
      movieId,
      movieSource,
      movieData
    });

    if (!watchlistItem) {
      return res.status(409).json({ 
        error: 'Movie is already in your watchlist' 
      });
    }

    const transformedItem = Watchlist.transformToFrontendFormat(watchlistItem);

    res.status(201).json({
      success: true,
      watchlistItem: transformedItem,
      message: 'Movie added to watchlist successfully'
    });

  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({ error: 'Failed to add movie to watchlist' });
  }
});

// GET /api/watchlist - Get user's watchlist
router.get('/', authenticateToken, [
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const [watchlistItems, totalCount] = await Promise.all([
      Watchlist.findByUser(userId, limitNum, offset),
      Watchlist.getUserWatchlistCount(userId)
    ]);

    const transformedItems = watchlistItems.map(item => 
      Watchlist.transformToFrontendFormat(item)
    );

    res.json({
      watchlist: transformedItems,
      totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      hasMore: offset + limitNum < totalCount
    });

  } catch (error) {
    console.error('Watchlist fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// DELETE /api/watchlist/:movieId - Remove movie from watchlist
router.delete('/:movieId', authenticateToken, [
  validationQuery('source')
    .optional()
    .isIn(['omdb', 'custom'])
    .withMessage('Source must be either "omdb" or "custom"')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { movieId } = req.params;
    const { source = 'omdb' } = req.query;
    const userId = req.user.id;

    const removedItem = await Watchlist.remove(userId, movieId, source);
    
    if (!removedItem) {
      return res.status(404).json({ error: 'Movie not found in watchlist' });
    }

    res.json({
      success: true,
      message: 'Movie removed from watchlist successfully'
    });

  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({ error: 'Failed to remove movie from watchlist' });
  }
});

// GET /api/watchlist/check/:movieId - Check if movie is in watchlist
router.get('/check/:movieId', authenticateToken, [
  validationQuery('source')
    .optional()
    .isIn(['omdb', 'custom'])
    .withMessage('Source must be either "omdb" or "custom"')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { movieId } = req.params;
    const { source = 'omdb' } = req.query;
    const userId = req.user.id;

    const isInWatchlist = await Watchlist.isInWatchlist(userId, movieId, source);

    res.json({
      isInWatchlist
    });

  } catch (error) {
    console.error('Watchlist check error:', error);
    res.status(500).json({ error: 'Failed to check watchlist status' });
  }
});

// POST /api/watchlist/check-multiple - Check multiple movies in watchlist
router.post('/check-multiple', authenticateToken, [
  body('movies')
    .isArray({ min: 1 })
    .withMessage('Movies array is required'),
  body('movies.*.movieId')
    .isLength({ min: 1 })
    .withMessage('Each movie must have a movieId'),
  body('movies.*.movieSource')
    .optional()
    .isIn(['omdb', 'custom'])
    .withMessage('Movie source must be either "omdb" or "custom"')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { movies } = req.body;
    const userId = req.user.id;

    const watchlistLookup = await Watchlist.checkMultipleInWatchlist(userId, movies);

    res.json({
      watchlistStatus: watchlistLookup
    });

  } catch (error) {
    console.error('Multiple watchlist check error:', error);
    res.status(500).json({ error: 'Failed to check multiple movies in watchlist' });
  }
});

// DELETE /api/watchlist - Clear entire watchlist
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const removedItems = await Watchlist.removeAll(userId);

    res.json({
      success: true,
      removedCount: removedItems.length,
      message: 'Watchlist cleared successfully'
    });

  } catch (error) {
    console.error('Clear watchlist error:', error);
    res.status(500).json({ error: 'Failed to clear watchlist' });
  }
});

// GET /api/watchlist/popular - Get popular movies (most added to watchlists)
router.get('/popular', [
  validationQuery('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit);

    const popularMovies = await Watchlist.getPopularMovies(limitNum);

    const transformedMovies = popularMovies.map(item => ({
      movieId: item.movie_id,
      movieSource: item.movie_source,
      watchlistCount: parseInt(item.watchlist_count),
      ...JSON.parse(item.movie_data)
    }));

    res.json({
      popularMovies: transformedMovies
    });

  } catch (error) {
    console.error('Popular movies fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch popular movies' });
  }
});

// GET /api/watchlist/stats - Get watchlist statistics for current user
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const totalCount = await Watchlist.getUserWatchlistCount(userId);

    res.json({
      totalMovies: totalCount,
      message: `You have ${totalCount} movie${totalCount !== 1 ? 's' : ''} in your watchlist`
    });

  } catch (error) {
    console.error('Watchlist stats error:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist statistics' });
  }
});

export default router;