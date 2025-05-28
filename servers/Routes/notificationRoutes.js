import express from 'express';
import { protectedRoute } from '../Middlewares/authMiddleware.js';
import { getNotifications, markAsRead } from '../Controllers/notificationsController.js';

const router = express.Router();

router.get('/get-notifications', protectedRoute, getNotifications);
router.patch('/read/:notificationId', protectedRoute, markAsRead);


export default router;

