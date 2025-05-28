import express from 'express';
import {
  toggleFollowUser,
  toggleSubscribeCategory,
  getFollowersList,
  getFollowingList,
  checkFollowingStatus,
} from '../Controllers/subscribeController.js';

import { protectedRoute } from '../Middlewares/authMiddleware.js';

const router = express.Router();

// Follow/unfollow a user (toggle)
router.post('/follow/:followUserId', protectedRoute, toggleFollowUser);

// Subscribe/unsubscribe a category (toggle)
router.post('/subscribe/category/:category', protectedRoute, toggleSubscribeCategory);

// Get list of users current user is following
router.get('/following', protectedRoute, getFollowingList);

// Get list of users following current user
router.get('/followers', protectedRoute, getFollowersList);

// Check if current user follows another user
router.get('/check-follow/:otherUserId', protectedRoute, checkFollowingStatus);

export default router;
