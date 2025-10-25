// socket.js
import { Server } from "socket.io";
import { CLIENT_URL, NODE_ENV } from "../config/dotenv.js";
import { verifyToken } from "../../servers/Utils/verifyToken.js";
import UserModel from "../../servers/Models/User.js";

// =============================================================================
// CONFIGURATION
// =============================================================================

const SOCKET_CONFIG = {
  path: "/socket.io",
  cors: {
    origin: [
      "https://readzio.com",
      "https://www.readzio.com",
      "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST"],
  },
  pingInterval: 25000,
  pingTimeout: 20000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: false, // Disable legacy engine.io protocol
  transports: ["websocket", "polling"],
};

const FEEDBACK_CONFIG = {
  minDaysBeforePrompt: 7,
  maxRetriesPerUser: 3,
};

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

const connectedUsers = new Map(); // userId -> { socketId, connectedAt, metadata }
const socketToUser = new Map(); // socketId -> userId
const roomMembers = new Map(); // roomId -> Set<userId>

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Parse cookies from header string
 */
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split("; ").reduce((acc, cookie) => {
    const [name, ...valueParts] = cookie.split("=");
    if (name && valueParts.length > 0) {
      acc[name] = valueParts.join("="); // Handle cookies with '=' in value
    }
    return acc;
  }, {});
}

/**
 * Extract token from socket handshake
 */
function extractToken(socket) {
  // Priority 1: Auth token
  let token = socket.handshake.auth?.token;

  // Priority 2: Query parameter (for backward compatibility)
  if (!token && socket.handshake.query?.token) {
    token = socket.handshake.query.token;
  }

  // Priority 3: Cookie
  if (!token && socket.handshake.headers.cookie) {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    token = cookies.jwt || cookies.token;
  }

  return token;
}

/**
 * Check if user should see feedback prompt
 */
async function shouldShowFeedbackPrompt(user) {
  if (!user || !user.joiningDate) return false;

  const joinedDaysAgo =
    (Date.now() - new Date(user.joiningDate)) / (1000 * 60 * 60 * 24);

  // Check if user has been here long enough
  if (joinedDaysAgo < FEEDBACK_CONFIG.minDaysBeforePrompt) {
    return false;
  }

  // Check if already shown and responded
  if (user.feedbackPrompt?.responded) {
    return false;
  }

  // Check if shown too many times
  const shownCount = user.feedbackPrompt?.shownCount || 0;
  if (shownCount >= FEEDBACK_CONFIG.maxRetriesPerUser) {
    return false;
  }

  // Check if shown recently (within last 24 hours)
  if (user.feedbackPrompt?.shownAt) {
    const hoursSinceLastShown =
      (Date.now() - new Date(user.feedbackPrompt.shownAt)) / (1000 * 60 * 60);
    if (hoursSinceLastShown < 24) {
      return false;
    }
  }

  return true;
}

/**
 * Emit user status to relevant rooms
 */
function emitUserStatus(io, userId, isOnline) {
  try {
    io.emit("userStatus", { userId, isOnline, timestamp: Date.now() });
  } catch (error) {
    console.error("[Socket:Status] Failed to emit user status:", error.message);
  }
}

/**
 * Emit online users count
 */
function emitOnlineCount(io) {
  try {
    const count = connectedUsers.size;
    io.emit("onlineUsersCount", count);
    if (NODE_ENV !== "production") {
      console.log(`[Socket:Stats] Online users: ${count}`);
    }
  } catch (error) {
    console.error("[Socket:Count] Failed to emit online count:", error.message);
  }
}

/**
 * Clean up user connection data
 */
function cleanupUserConnection(socket) {
  try {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      socketToUser.delete(socket.id);

      // Leave all rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);

          // Update room members
          if (roomMembers.has(room)) {
            roomMembers.get(room).delete(socket.userId);
            if (roomMembers.get(room).size === 0) {
              roomMembers.delete(room);
            }
          }
        }
      });
    }
  } catch (error) {
    console.error("[Socket:Cleanup] Error during cleanup:", error.message);
  }
}

// =============================================================================
// SOCKET.IO SERVER INITIALIZATION
// =============================================================================

export const io = new Server(SOCKET_CONFIG);

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

io.use(async (socket, next) => {
  try {
    const token = extractToken(socket);

    if (!token) {
      // Allow guest connections
      socket.isGuest = true;
      console.log("[Socket:Auth] Guest connection allowed:", socket.id);
      return next();
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      throw new Error("Invalid token payload");
    }

    socket.userId = decoded.userId.toString();
    socket.role = decoded.role;
    socket.isAdmin = decoded.isAdmin === true;
    socket.isGuest = false;

    console.log(
      `[Socket:Auth] User authenticated: ${socket.userId} (${
        socket.role || "user"
      })`
    );
    next();
  } catch (err) {
    console.error("[Socket:Auth] Authentication failed:", err.message);
    // Allow connection but mark as guest
    socket.isGuest = true;
    next();
  }
});

// =============================================================================
// CONNECTION HANDLER
// =============================================================================

io.on("connection", async (socket) => {
  const connectionTime = Date.now();
  console.log(
    `[Socket:Connect] New connection: ${socket.id} ${
      socket.userId ? `(User: ${socket.userId})` : "(Guest)"
    }`
  );

  try {
    // Handle authenticated users
    if (socket.userId && !socket.isGuest) {
      // Store connection info
      connectedUsers.set(socket.userId, {
        socketId: socket.id,
        connectedAt: connectionTime,
        isAdmin: socket.isAdmin,
        role: socket.role,
      });
      socketToUser.set(socket.id, socket.userId);

      // Join user's personal room
      socket.join(socket.userId);

      // Join admin room if admin
      if (socket.isAdmin) {
        socket.join("adminRoom");
        console.log(`[Socket:Admin] Admin joined: ${socket.userId}`);
      }

      // Emit status updates
      emitUserStatus(io, socket.userId, true);
      emitOnlineCount(io);

      // Handle feedback prompt
      try {
        const user = await UserModel.findById(socket.userId)
          .select("joiningDate feedbackPrompt")
          .lean();

        if (user && (await shouldShowFeedbackPrompt(user))) {
          socket.emit("showFeedbackPrompt", {
            message: "How do you like our app?",
            timestamp: Date.now(),
          });

          // Update feedback prompt status (non-blocking)
          UserModel.findByIdAndUpdate(socket.userId, {
            $set: {
              "feedbackPrompt.shown": true,
              "feedbackPrompt.shownAt": new Date(),
            },
            $inc: { "feedbackPrompt.shownCount": 1 },
          }).catch((err) =>
            console.error("[Socket:Feedback] Update failed:", err.message)
          );
        }
      } catch (err) {
        console.error("[Socket:Feedback] Feedback check error:", err.message);
      }
    }

    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    /**
     * Join a specific room
     */
    socket.on("join", (roomId) => {
      try {
        if (!roomId || typeof roomId !== "string") {
          console.warn("[Socket:Join] Invalid room ID");
          return;
        }

        // Admin room access control
        if (roomId === "adminRoom") {
          if (!socket.isAdmin) {
            socket.emit("error", {
              message: "Unauthorized: Admin access required",
            });
            console.warn(
              `[Socket:Join] Non-admin attempted to join adminRoom: ${socket.userId}`
            );
            return;
          }
          socket.join("adminRoom");
          console.log(`[Socket:Join] Admin joined adminRoom: ${socket.userId}`);
          return;
        }

        // User can only join their own room or public rooms
        if (socket.userId && socket.userId !== roomId) {
          socket.emit("error", { message: "Cannot join another user's room" });
          console.warn(
            `[Socket:Join] User ${socket.userId} attempted to join room ${roomId}`
          );
          return;
        }

        socket.join(roomId);

        // Track room membership
        if (!roomMembers.has(roomId)) {
          roomMembers.set(roomId, new Set());
        }
        if (socket.userId) {
          roomMembers.get(roomId).add(socket.userId);
        }

        socket.emit("joinedRoom", { roomId, timestamp: Date.now() });
        console.log(
          `[Socket:Join] User ${
            socket.userId || "guest"
          } joined room: ${roomId}`
        );
      } catch (error) {
        console.error("[Socket:Join] Error joining room:", error.message);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    /**
     * Leave a specific room
     */
    socket.on("leave", (roomId) => {
      try {
        if (!roomId) return;

        socket.leave(roomId);

        if (roomMembers.has(roomId) && socket.userId) {
          roomMembers.get(roomId).delete(socket.userId);
          if (roomMembers.get(roomId).size === 0) {
            roomMembers.delete(roomId);
          }
        }

        socket.emit("leftRoom", { roomId, timestamp: Date.now() });
        console.log(
          `[Socket:Leave] User ${socket.userId || "guest"} left room: ${roomId}`
        );
      } catch (error) {
        console.error("[Socket:Leave] Error leaving room:", error.message);
      }
    });

    /**
     * User location updates (admin only)
     */
    socket.on("userLocationUpdate", (data) => {
      try {
        if (!socket.userId) {
          socket.emit("error", { message: "Authentication required" });
          return;
        }

        if (!data || typeof data !== "object") {
          console.warn("[Socket:Location] Invalid location data");
          return;
        }

        io.to("adminRoom").emit("userLocationUpdate", {
          ...data,
          userId: socket.userId,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(
          "[Socket:Location] Error processing location:",
          error.message
        );
      }
    });

    /**
     * Get online users list
     */
    socket.on("getOnlineUsers", () => {
      try {
        const onlineUsers = Array.from(connectedUsers.entries()).map(
          ([userId, data]) => ({
            userId,
            connectedAt: data.connectedAt,
            isAdmin: data.isAdmin,
          })
        );

        socket.emit("onlineUsersList", {
          users: onlineUsers,
          count: onlineUsers.length,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(
          "[Socket:OnlineUsers] Error getting online users:",
          error.message
        );
        socket.emit("error", { message: "Failed to get online users" });
      }
    });

    /**
     * Ad impression tracking
     */
    socket.on("adImpression", (data) => {
      try {
        if (!socket.userId) return;

        const { postId, adIndex, adSlot, timeSpent } = data || {};

        if (!postId || typeof adIndex !== "number") {
          console.warn("[Socket:Ad] Invalid ad impression data");
          return;
        }

        io.to(socket.userId).emit("adImpressionRecorded", {
          postId,
          adIndex,
          adSlot,
          timeSpent: timeSpent || 0,
          timestamp: Date.now(),
        });

        // Emit to admin room for analytics
        io.to("adminRoom").emit("adImpressionTracked", {
          userId: socket.userId,
          postId,
          adIndex,
          adSlot,
          timeSpent,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(
          "[Socket:Ad] Error recording ad impression:",
          error.message
        );
      }
    });

    /**
     * Feedback response
     */
    socket.on("feedbackResponse", async (data) => {
      try {
        if (!socket.userId) return;

        const { rating, comment } = data || {};

        await UserModel.findByIdAndUpdate(socket.userId, {
          $set: {
            "feedbackPrompt.responded": true,
            "feedbackPrompt.respondedAt": new Date(),
            "feedbackPrompt.rating": rating,
            "feedbackPrompt.comment": comment,
          },
        });

        socket.emit("feedbackReceived", {
          success: true,
          timestamp: Date.now(),
        });

        console.log(
          `[Socket:Feedback] Received from user ${socket.userId}: ${rating}/5`
        );
      } catch (error) {
        console.error(
          "[Socket:Feedback] Error saving feedback:",
          error.message
        );
        socket.emit("error", { message: "Failed to save feedback" });
      }
    });

    /**
     * Ping/Pong for connection health check
     */
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    // =============================================================================
    // DISCONNECT HANDLER
    // =============================================================================

    socket.on("disconnect", (reason) => {
      const duration = ((Date.now() - connectionTime) / 1000).toFixed(2);
      console.log(
        `[Socket:Disconnect] ${
          socket.userId || socket.id
        } disconnected after ${duration}s - Reason: ${reason}`
      );

      if (socket.userId) {
        cleanupUserConnection(socket);
        emitUserStatus(io, socket.userId, false);
        emitOnlineCount(io);
      }
    });

    // =============================================================================
    // ERROR HANDLER
    // =============================================================================

    socket.on("error", (error) => {
      console.error(
        `[Socket:Error] Socket error for ${socket.userId || socket.id}:`,
        error.message
      );
    });
  } catch (error) {
    console.error(
      "[Socket:Connection] Error during connection setup:",
      error.message
    );
    socket.disconnect(true);
  }
});

// =============================================================================
// ENGINE ERROR HANDLERS
// =============================================================================

io.engine.on("connection_error", (err) => {
  console.error("[Socket:Engine] Connection error:", {
    origin: err.req?.headers?.origin,
    code: err.code,
    message: err.message,
    context: err.context,
  });
});

// =============================================================================
// INITIALIZATION FUNCTION
// =============================================================================

export default function initializeSocket(server) {
  try {
    io.attach(server);
    console.log("✅ Socket.IO server initialized");

    // Periodic cleanup (every 5 minutes)
    setInterval(() => {
      try {
        const now = Date.now();
        const staleThreshold = 10 * 60 * 1000; // 10 minutes

        for (const [userId, data] of connectedUsers.entries()) {
          if (now - data.connectedAt > staleThreshold) {
            const socket = io.sockets.sockets.get(data.socketId);
            if (!socket || !socket.connected) {
              console.log(
                `[Socket:Cleanup] Removing stale connection: ${userId}`
              );
              connectedUsers.delete(userId);
              socketToUser.delete(data.socketId);
            }
          }
        }
      } catch (error) {
        console.error("[Socket:Cleanup] Cleanup error:", error.message);
      }
    }, 5 * 60 * 1000);

    return io;
  } catch (error) {
    console.error("❌ Failed to initialize Socket.IO:", error.message);
    throw error;
  }
}

// =============================================================================
// UTILITY FUNCTIONS FOR EXTERNAL USE
// =============================================================================

/**
 * Emit post updated event
 */
export const emitPostUpdated = (post) => {
  try {
    if (!post || !post._id) {
      console.warn("[Socket:Post] Invalid post data for update");
      return;
    }
    io.emit("postUpdated", {
      post,
      timestamp: Date.now(),
    });
    console.log(`[Socket:Post] Post updated event emitted: ${post._id}`);
  } catch (error) {
    console.error("[Socket:Post] Error emitting post update:", error.message);
  }
};

/**
 * Emit post deleted event
 */
export const emitPostDeleted = (postId) => {
  try {
    if (!postId) {
      console.warn("[Socket:Post] Invalid post ID for deletion");
      return;
    }
    io.emit("postDeleted", {
      postId,
      timestamp: Date.now(),
    });
    console.log(`[Socket:Post] Post deleted event emitted: ${postId}`);
  } catch (error) {
    console.error("[Socket:Post] Error emitting post deletion:", error.message);
  }
};

/**
 * Emit notification to specific user
 */
export const emitNotification = (userId, notification) => {
  try {
    if (!userId || !notification) {
      console.warn("[Socket:Notification] Invalid notification data");
      return;
    }
    io.to(userId.toString()).emit("notification", {
      ...notification,
      timestamp: Date.now(),
    });
    console.log(`[Socket:Notification] Notification sent to user: ${userId}`);
  } catch (error) {
    console.error(
      "[Socket:Notification] Error emitting notification:",
      error.message
    );
  }
};

/**
 * Get connection statistics
 */
export const getConnectionStats = () => {
  try {
    return {
      totalConnections: connectedUsers.size,
      totalRooms: roomMembers.size,
      adminConnections: Array.from(connectedUsers.values()).filter(
        (u) => u.isAdmin
      ).length,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("[Socket:Stats] Error getting stats:", error.message);
    return null;
  }
};

/**
 * Check if user is online
 */
export const isUserOnline = (userId) => {
  return connectedUsers.has(userId?.toString());
};

/**
 * Disconnect user by userId
 */
export const disconnectUser = (userId, reason = "admin_disconnect") => {
  try {
    const userData = connectedUsers.get(userId?.toString());
    if (userData) {
      const socket = io.sockets.sockets.get(userData.socketId);
      if (socket) {
        socket.disconnect(true);
        console.log(`[Socket:Admin] User ${userId} disconnected: ${reason}`);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("[Socket:Admin] Error disconnecting user:", error.message);
    return false;
  }
};
