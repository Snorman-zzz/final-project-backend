import express from 'express';
import { body, validationResult, query as validationQuery } from 'express-validator';
import { Review } from '../models/Review.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const reviewCreationValidation = [
  body('movieId')
    .isLength({ min: 1 })
    .withMessage('Movie ID is required'),
  body('movieSource')
    .optional()
    .isIn(['omdb', 'custom'])
    .withMessage('Movie source must be either "omdb" or "custom"'),
  body('title')
    .isLength({ min: 1, max: 255 })
    .withMessage('Review title is required and must be less than 255 characters'),
  body('content')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Review content must be between 10 and 2000 characters'),
  body('rating')
    .isInt({ min: 1, max: 10 })
    .withMessage('Rating must be between 1 and 10')
];

const reviewUpdateValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Review title must be less than 255 characters'),
  body('content')
    .optional()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Review content must be between 10 and 2000 characters'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Rating must be between 1 and 10')
];

// POST /api/reviews - Create a new review
router.post('/', authenticateToken, reviewCreationValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { movieId, movieSource = 'omdb', title, content, rating } = req.body;
    const userId = req.user.id;

    // Check if user already reviewed this movie
    const existingReview = await Review.findUserReviewForMovie(userId, movieId, movieSource);
    if (existingReview) {
      return res.status(409).json({ 
        error: 'You have already reviewed this movie. Use PUT to update your review.' 
      });
    }

    const newReview = await Review.create({
      userId,
      movieId,
      movieSource,
      title,
      content,
      rating
    });

    const reviewWithAuthor = await Review.findById(newReview.id);
    const transformedReview = Review.transformToFrontendFormat(reviewWithAuthor);

    res.status(201).json({
      success: true,
      review: transformedReview,
      message: 'Review created successfully'
    });

  } catch (error) {
    console.error('Review creation error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// GET /api/reviews/movie/:movieId - Get reviews for a specific movie
router.get('/movie/:movieId', [
  validationQuery('source')
    .optional()
    .isIn(['omdb', 'custom'])
    .withMessage('Source must be either "omdb" or "custom"'),
  validationQuery('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  validationQuery('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
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
    const { source = 'omdb', page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const [reviews, stats] = await Promise.all([
      Review.findByMovie(movieId, source, limitNum, offset),
      Review.getMovieStats(movieId, source)
    ]);

    const transformedReviews = reviews.map(review => 
      Review.transformToFrontendFormat(review)
    );

    res.json({
      reviews: transformedReviews,
      stats,
      currentPage: pageNum,
      hasMore: reviews.length === limitNum
    });

  } catch (error) {
    console.error('Movie reviews fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch movie reviews' });
  }
});

// GET /api/reviews/user/:userId - Get reviews by a specific user
router.get('/user/:userId', optionalAuth, [
  validationQuery('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  validationQuery('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const reviews = await Review.findByUser(userId, limitNum, offset);
    const transformedReviews = reviews.map(review => 
      Review.transformToFrontendFormat(review)
    );

    res.json({
      reviews: transformedReviews,
      currentPage: pageNum,
      hasMore: reviews.length === limitNum
    });

  } catch (error) {
    console.error('User reviews fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user reviews' });
  }
});

// GET /api/reviews/my-reviews - Get current user's reviews
router.get('/my-reviews', authenticateToken, [
  validationQuery('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  validationQuery('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
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
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const reviews = await Review.findByUser(userId, limitNum, offset);
    const transformedReviews = reviews.map(review => 
      Review.transformToFrontendFormat(review)
    );

    res.json({
      reviews: transformedReviews,
      currentPage: pageNum,
      hasMore: reviews.length === limitNum
    });

  } catch (error) {
    console.error('My reviews fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch your reviews' });
  }
});

// GET /api/reviews/:id - Get a specific review
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const transformedReview = Review.transformToFrontendFormat(review);

    res.json({
      review: transformedReview
    });

  } catch (error) {
    console.error('Review fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// PUT /api/reviews/:id - Update a review (only by author)
router.put('/:id', authenticateToken, reviewUpdateValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { title, content, rating } = req.body;
    const userId = req.user.id;

    // Check if review exists and belongs to the user
    const existingReview = await Review.findById(id);
    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (existingReview.user_id !== userId) {
      return res.status(403).json({ error: 'You can only update your own reviews' });
    }

    const updatedReview = await Review.update(id, { title, content, rating });
    const reviewWithAuthor = await Review.findById(updatedReview.id);
    const transformedReview = Review.transformToFrontendFormat(reviewWithAuthor);

    res.json({
      success: true,
      review: transformedReview,
      message: 'Review updated successfully'
    });

  } catch (error) {
    console.error('Review update error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// DELETE /api/reviews/:id - Delete a review (only by author or admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if review exists
    const existingReview = await Review.findById(id);
    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user can delete this review (author or admin)
    if (existingReview.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }

    await Review.delete(id);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Review deletion error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// POST /api/reviews/:id/helpful - Mark a review as helpful/not helpful
router.post('/:id/helpful', authenticateToken, [
  body('helpful')
    .isBoolean()
    .withMessage('Helpful must be a boolean value')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { helpful } = req.body;

    // Check if review exists
    const existingReview = await Review.findById(id);
    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Users shouldn't be able to mark their own reviews as helpful
    if (existingReview.user_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot mark your own review as helpful' });
    }

    const updatedReview = await Review.markHelpful(id, helpful);
    const reviewWithAuthor = await Review.findById(updatedReview.id);
    const transformedReview = Review.transformToFrontendFormat(reviewWithAuthor);

    res.json({
      success: true,
      review: transformedReview,
      message: helpful ? 'Review marked as helpful' : 'Review marked as not helpful'
    });

  } catch (error) {
    console.error('Review helpful marking error:', error);
    res.status(500).json({ error: 'Failed to mark review as helpful' });
  }
});

// GET /api/reviews/recent - Get recent reviews (public)
router.get('/lists/recent', [
  validationQuery('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit);

    const reviews = await Review.getRecentReviews(limitNum);
    const transformedReviews = reviews.map(review => 
      Review.transformToFrontendFormat(review)
    );

    res.json({
      reviews: transformedReviews
    });

  } catch (error) {
    console.error('Recent reviews fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch recent reviews' });
  }
});

export default router;