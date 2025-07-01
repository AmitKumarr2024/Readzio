// sockets/socket.js

import { Server } from 'socket.io';
import { CLIENT_URL } from '../config/dotenv.js';
import { verifyToken } from '../utils/verifyToken.js';

const connectedUsers = new Set(); // Track online user IDs

export const io = new Server({
  path: '/socket.io',
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [CLIENT_URL, 'http://localhost:5173'].filter(Boolean);
      if (!origin || allowedOrigins.includes(origin)) {
        console.log('[Socket:CORS] Origin allowed:', origin);
        return callback(null, true);
      }
      console.error('[Socket:CORS] Origin blocked:', origin);
      return callback(new Error('CORS not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  },
  pingInterval: 25000,
  pingTimeout: 60000,
});

export default function initializeSocket(server) {
  console.log('[Socket:initializeSocket] Initializing Socket.IO server');

  io.attach(server);

  // 🔐 Middleware: Verify JWT token before connection
  io.use(async (socket, next) => {
    console.log('[Socket:Middleware] Authenticating socket', { socketId: socket.id });
    try {
      const token = socket.handshake.auth.token;
      if (!token) throw new Error('No token provided');

      const decoded = verifyToken(token); // Your JWT verification logic
      socket.userId = decoded.userId.toString();
      socket.role = decoded.role;
      socket.isAdmin = decoded.isAdmin;

      socket.join(socket.userId); // Join room with user ID
      console.log('[Socket:Middleware] Auth success:', {
        userId: socket.userId,
        role: socket.role,
      });

      next();
    } catch (err) {
      console.error('[Socket:Middleware] Auth error:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  // 🚀 On user connection
  io.on('connection', (socket) => {
    if (socket.userId) {
      connectedUsers.add(socket.userId);

      // Broadcast user online
      io.emit('userStatus', { userId: socket.userId, isOnline: true });
      io.emit('onlineUsersCount', connectedUsers.size);

      console.log('[Socket:Connected]', {
        userId: socket.userId,
        socketId: socket.id,
        onlineCount: connectedUsers.size,
      });
    }

    // ✅ Handle client request to get list of online users
    socket.on('getOnlineUsers', () => {
      const list = Array.from(connectedUsers);
      socket.emit('onlineUsersList', list);
      console.log('[Socket:getOnlineUsers] Sent to', socket.userId, list);
    });

    // 📊 Handle ad impression event (optional)
    socket.on('adImpression', ({ postId, adIndex, adSlot, timeSpent }) => {
      console.log('[Socket:adImpression]', {
        userId: socket.userId,
        postId,
        adIndex,
        adSlot,
        timeSpent,
      });

      if (socket.userId) {
        io.to(socket.userId).emit('adImpressionRecorded', {
          postId,
          adIndex,
          adSlot,
          timeSpent,
          timestamp: Date.now(),
        });
      }
    });

    // ❌ On disconnect
    socket.on('disconnect', (reason) => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId);

        io.emit('userStatus', { userId: socket.userId, isOnline: false });
        io.emit('onlineUsersCount', connectedUsers.size);

        console.log('[Socket:Disconnected]', {
          userId: socket.userId,
          reason,
          onlineCount: connectedUsers.size,
        });
      }
    });
  });

  console.log('[Socket:initializeSocket] Socket.IO setup complete');
  return io;
}
