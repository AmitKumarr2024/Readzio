import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import http from 'http';
import mongoose from 'mongoose';
import { CLIENT_URL, PORT } from './config/dotenv.js';
import connectDb from './config/mongodb.js';
import errorHandler from './middlewares/errorHandler.js';
import initializeSocket from './sockets/socket.js';
import { startTempCleanup } from './Utils/cleanupTemp.js';

// Routes
import AuthRoutes from './Routes/authRoutes.js';
import UserRoutes from './routes/userRoutes.js';
import PostRoutes from './Routes/postRoutes.js';
import CategoryRoutes from './routes/categoryRoutes.js';
import BlockRoutes from './routes/blockRoutes.js';
import FollowRoutes from './Routes/userFollowRoutes.js';
import NotificationRoutes from './routes/notificationRoutes.js';
import RazorpayRoutes from './routes/paymentRoutes.js';
import SubscriptionRoutes from './routes/subscriptionRoutes.js';
import EarningRoutes from './routes/earningRoutes.js';
import AchievementRoutes from './routes/achievementRoutes.js';
import CommentsRoutes from './routes/commentRoutes.js';
import AdminRoutes from './routes/adminRoutes.js';
import GeojsonRoutes from './Routes/geojsonRoutes.js';
import PostEmailRoutes from './Routes/postEmailRoutes.js';
import BannerNotificationRoutes from './Routes/bannerNotificationRoutes.js';
import guestRoutes from './Routes/guestRoutes.js';

console.log('[Server:Startup] Initializing Express server');

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

// Attach Socket.IO instance to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(compression());
console.log('[Server:Middleware] Compression applied');

const allowedOrigins = [CLIENT_URL, 'http://localhost:5173'].filter(Boolean);
console.log('[Server:CORS] Allowed origins:', allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        console.log('[Server:CORS] ✅ Allowed:', origin);
        return callback(null, true);
      }
      console.error('[Server:CORS] ❌ Blocked:', origin);
      return callback(new Error('CORS not allowed'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
console.log('[Server:Middleware] JSON, URL-encoded, cookie-parser applied');

// API Routes
app.use('/api/auth', AuthRoutes);
app.use('/api/user', UserRoutes);
app.use('/api/post', PostRoutes);
app.use('/api/category', CategoryRoutes);
app.use('/api/block', BlockRoutes);
app.use('/api/follow', FollowRoutes);
app.use('/api/notification', NotificationRoutes);
app.use('/api/payment', RazorpayRoutes);
app.use('/api/subscription', SubscriptionRoutes);
app.use('/api/earning', EarningRoutes);
app.use('/api/achievement', AchievementRoutes);
app.use('/api/comment', CommentsRoutes);
app.use('/api/admin', AdminRoutes);
app.use('/api/geojson', GeojsonRoutes);
app.use('/api/dailyMail', PostEmailRoutes);
app.use('/api/bannerNotification', BannerNotificationRoutes);
app.use('/api/public', guestRoutes);

console.log('[Server:Routes] All routes mounted');

// Health check route
app.get('/health', (req, res) => {
  const status = {
    status: 'OK',
    message: 'Server running',
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  };
  res.status(200).json(status);
});

// Error handler
app.use(errorHandler);
console.log('[Server:Middleware] Error handler applied');

// Socket / HTTP errors
io.on('error', (err) => {
  console.error('[Server:SocketIO] Error:', err.message);
});

server.on('error', (err) => {
  console.error('[Server:HTTP] Error:', err.message);
});

// Global error handling
process.on('uncaughtException', (err) => {
  console.error('[Server:UncaughtException] Error:', err.message, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('[Server:UnhandledRejection] Error:', err.message);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    console.log('[Server:Startup] Connecting to MongoDB...');
    await connectDb();
    console.log('[Server:Startup] Database connected ✅');

    startTempCleanup();
    server.listen(PORT, () => {
      console.log(`[Server:Startup] 🚀 Server running on port: ${PORT}`);
    });
  } catch (error) {
    console.error('[Server:Startup] ❌ Failed to start server:', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

startServer();