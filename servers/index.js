import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import http from 'http';
import { CLIENT_URL, PORT } from './config/dotenv.js';
import connectDb from './config/mongodb.js';
import errorHandler from './middlewares/errorHandler.js';

// Cron Jobs
import './utils/cronJobs.js';
import { startTempCleanup } from './Utils/cleanupTemp.js';

// Socket
import initializeSocket from './sockets/socket.js';

// Routes
import AuthRoutes from './routes/authRoutes.js';
import UserRoutes from './routes/userRoutes.js';
import PostRoutes from './routes/postRoutes.js';
import CategoryRoutes from './routes/categoryRoutes.js';
import BlockRoutes from './routes/blockRoutes.js';
import FollowRoutes from './routes/userFollowRoutes.js';
import NotificationRoutes from './routes/notificationRoutes.js';
import RazorpayRoutes from './routes/paymentRoutes.js';
import SubscriptionRoutes from './routes/subscriptionRoutes.js';
import EarningRoutes from './routes/earningRoutes.js';
import AchievementRoutes from './routes/achievementRoutes.js';
import CommentsRoutes from './routes/commentRoutes.js';
import AdminRoutes from './routes/adminRoutes.js';
// import AdsRoutes from './Routes/adsRoutes.js';

console.log('[Server:Startup] Initializing Express server');

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

// Attach io to every request
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
    origin: allowedOrigins,
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
// app.use('/api/ads', AdsRoutes);
console.log('[Server:Routes] All routes mounted');

// Health check with server status
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

// Error handling
app.use(errorHandler);
console.log('[Server:Middleware] Error handler applied');

// Socket / HTTP errors
io.on('error', (err) => {
  console.error('[Server:SocketIO] Error:', err.message);
});

server.on('error', (err) => {
  console.error('[Server:HTTP] Error:', err.message);
});

// Handle server crashes gracefully
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
    console.log('[Server:Startup] Connecting to database');
    await connectDb();
    console.log('[Server:Startup] Database connected');
    startTempCleanup(); // Start temp file cleanup
    server.listen(PORT, () => {
      console.log(`[Server:Startup] 🚀 Server running on port: ${PORT}`);
    });
  } catch (error) {
    console.error('[Server:Startup] ❌ Startup failed:', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

startServer();