// socket.js
import { Server } from "socket.io";
import { CLIENT_URL, NODE_ENV } from "../config/dotenv.js";
import { verifyToken } from "../../servers/Utils/verifyToken.js";
import UserModel from "../../servers/Models/User.js";

// =============================================================================
// CONFIGURATION
// =============================================================================

const SOCKET_CONFIG = {
  path: "/socket.io/",
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
  maxHttpBufferSize: 1e6,
  allowEIO3: false,
  transports: ["polling", "websocket"],
};

const FEEDBACK_CONFIG = {
  minDaysBeforePrompt: 7,
  maxRetriesPerUser: 3,
};

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

const connectedUsers = new Map(); // userId -> { socketId, connectedAt, isAdmin, role }
const socketToUser = new Map(); // socketId -> userId
const roomMembers = new Map(); // roomId -> Set<userId>
const connectedGuests = new Set(); // socketId (guests)

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split("; ").reduce((acc, cookie) => {
    const [name, ...valueParts] = cookie.split("=");
    if (name && valueParts.length > 0) {
      acc[name] = valueParts.join("=");
    }
    return acc;
  }, {});
}

function extractToken(socket) {
  let token = socket.handshake.auth?.token;
  if (!token && socket.handshake.query?.token) {
    token = socket.handshake.query.token;
  }
  if (!token && socket.handshake.headers.cookie) {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    token = cookies.jwt || cookies.token;
  }
  return token;
}

async function shouldShowFeedbackPrompt(user) {
  if (!user || !user.joiningDate) return false;

  const joinedDaysAgo =
    (Date.now() - new Date(user.joiningDate)) / (1000 * 60 * 60 * 24);

  if (joinedDaysAgo < FEEDBACK_CONFIG.minDaysBeforePrompt) return false;
  if (user.feedbackPrompt?.responded) return false;

  const shownCount = user.feedbackPrompt?.shownCount || 0;
  if (shownCount >= FEEDBACK_CONFIG.maxRetriesPerUser) return false;

  if (user.feedbackPrompt?.shownAt) {
    const hoursSinceLastShown =
      (Date.now() - new Date(user.feedbackPrompt.shownAt)) / (1000 * 60 * 60);
    if (hoursSinceLastShown < 24) return false;
  }

  return true;
}

function emitUserStatus(io, userId, isOnline) {
  try {
    io.emit("userStatus", { userId, isOnline, timestamp: Date.now() });
  } catch (error) {
    console.error("[Socket:Status] Failed to emit user status:", error.message);
  }
}

function emitOnlineCount(io) {
  try {
    // ✅ authenticated users + guests = total online
    const count = connectedUsers.size + connectedGuests.size;
    io.emit("onlineUsersCount", count);
  } catch (error) {
    console.error("[Socket:Count] Failed to emit online count:", error.message);
  }
}

function cleanupUserConnection(socket) {
  try {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      socketToUser.delete(socket.id);

      const rooms = Array.from(socket.rooms);
      rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
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

const io = new Server(SOCKET_CONFIG);

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

io.use(async (socket, next) => {
  try {
    const token = extractToken(socket);

    if (!token) {
      socket.isGuest = true;
      return next();
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      throw new Error("Invalid token payload");
    }

    socket.userId = decoded.userId.toString();
    socket.role = decoded.role;
    socket.isAdmin = decoded.isAdmin === true;
    socket.isGuest = false;

    next();
  } catch (err) {
    console.error("[Socket:Auth] Authentication failed:", err.message);
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
    }`,
  );

  try {
    if (socket.userId && !socket.isGuest) {
      // ✅ Authenticated user
      connectedUsers.set(socket.userId, {
        socketId: socket.id,
        connectedAt: connectionTime,
        isAdmin: socket.isAdmin,
        role: socket.role,
      });
      socketToUser.set(socket.id, socket.userId);

      socket.join(socket.userId);

      if (socket.isAdmin) {
        socket.join("adminRoom");
        console.log(`[Socket:Admin] Admin joined: ${socket.userId}`);
      }

      emitUserStatus(io, socket.userId, true);
      emitOnlineCount(io);

      // Feedback prompt check
      try {
        const user = await UserModel.findById(socket.userId)
          .select("joiningDate feedbackPrompt")
          .lean();

        if (user && (await shouldShowFeedbackPrompt(user))) {
          socket.emit("showFeedbackPrompt", {
            message: "How do you like our app?",
            timestamp: Date.now(),
          });

          UserModel.findByIdAndUpdate(socket.userId, {
            $set: {
              "feedbackPrompt.shown": true,
              "feedbackPrompt.shownAt": new Date(),
            },
            $inc: { "feedbackPrompt.shownCount": 1 },
          }).catch((err) =>
            console.error("[Socket:Feedback] Update failed:", err.message),
          );
        }
      } catch (err) {
        console.error("[Socket:Feedback] Feedback check error:", err.message);
      }
    } else {
      // ✅ Guest user — count mein add karo
      connectedGuests.add(socket.id);
      emitOnlineCount(io);
    }

    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    socket.on("join", (roomId) => {
      try {
        if (!roomId || typeof roomId !== "string") {
          console.warn("[Socket:Join] Invalid room ID");
          return;
        }

        if (roomId === "adminRoom") {
          if (!socket.isAdmin) {
            socket.emit("error", {
              message: "Unauthorized: Admin access required",
            });
            return;
          }
          socket.join("adminRoom");
          return;
        }

        // Guest users can join their own guest rooms
        if (!socket.isGuest && socket.userId && socket.userId !== roomId) {
          socket.emit("error", { message: "Cannot join another user's room" });
          return;
        }

        socket.join(roomId);

        if (!roomMembers.has(roomId)) {
          roomMembers.set(roomId, new Set());
        }
        if (socket.userId) {
          roomMembers.get(roomId).add(socket.userId);
        }

        socket.emit("joinedRoom", { roomId, timestamp: Date.now() });
      } catch (error) {
        console.error("[Socket:Join] Error joining room:", error.message);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    socket.on("leave", (roomId) => {
      try {
        if (!roomId) return;
        socket.leave(roomId);
        if (roomMembers.has(roomId) && socket.userId) {
          roomMembers.get(roomId).delete(socket.userId);
          if (roomMembers.get(roomId).size === 0) roomMembers.delete(roomId);
        }
        socket.emit("leftRoom", { roomId, timestamp: Date.now() });
      } catch (error) {
        console.error("[Socket:Leave] Error leaving room:", error.message);
      }
    });

    socket.on("userLocationUpdate", (data) => {
      try {
        if (!socket.userId) {
          socket.emit("error", { message: "Authentication required" });
          return;
        }
        if (!data || typeof data !== "object") return;

        io.to("adminRoom").emit("userLocationUpdate", {
          ...data,
          userId: socket.userId,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(
          "[Socket:Location] Error processing location:",
          error.message,
        );
      }
    });

    socket.on("getOnlineUsers", () => {
      try {
        const onlineUsers = Array.from(connectedUsers.entries()).map(
          ([userId, data]) => ({
            userId,
            connectedAt: data.connectedAt,
            isAdmin: data.isAdmin,
          }),
        );
        socket.emit("onlineUsersList", {
          users: onlineUsers,
          count: onlineUsers.length,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("[Socket:OnlineUsers] Error:", error.message);
        socket.emit("error", { message: "Failed to get online users" });
      }
    });

    socket.on("adImpression", (data) => {
      try {
        if (!socket.userId) return;
        const { postId, adIndex, adSlot, timeSpent } = data || {};
        if (!postId || typeof adIndex !== "number") return;

        io.to(socket.userId).emit("adImpressionRecorded", {
          postId,
          adIndex,
          adSlot,
          timeSpent: timeSpent || 0,
          timestamp: Date.now(),
        });

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
          error.message,
        );
      }
    });

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
      } catch (error) {
        console.error(
          "[Socket:Feedback] Error saving feedback:",
          error.message,
        );
        socket.emit("error", { message: "Failed to save feedback" });
      }
    });

    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    // =============================================================================
    // DISCONNECT HANDLER
    // =============================================================================

    socket.on("disconnect", (reason) => {
      const duration = ((Date.now() - connectionTime) / 1000).toFixed(2);
      console.log(
        `[Socket:Disconnect] ${socket.userId || socket.id} disconnected after ${duration}s - Reason: ${reason}`,
      );

      if (socket.userId && !socket.isGuest) {
        // ✅ Authenticated user cleanup
        cleanupUserConnection(socket);
        emitUserStatus(io, socket.userId, false);
      } else {
        // ✅ Guest cleanup
        connectedGuests.delete(socket.id);
      }

      emitOnlineCount(io); // ✅ dono cases mein count update
    });

    socket.on("error", (error) => {
      console.error(
        `[Socket:Error] Socket error for ${socket.userId || socket.id}:`,
        error.message,
      );
    });
  } catch (error) {
    console.error(
      "[Socket:Connection] Error during connection setup:",
      error.message,
    );
    socket.disconnect(true);
  }
});

// =============================================================================
// INITIALIZATION FUNCTION
// =============================================================================

export default function initializeSocket(server) {
  try {
    io.attach(server);
    console.log("✅ Socket.IO server initialized");

    io.engine.on("connection_error", (err) => {
      console.error("[Socket:Engine] Connection error:", {
        origin: err.req?.headers?.origin,
        code: err.code,
        message: err.message,
        context: err.context,
      });
    });

    // ✅ Periodic stale connection cleanup (every 5 minutes)
    setInterval(
      () => {
        try {
          const now = Date.now();
          const staleThreshold = 10 * 60 * 1000;

          // Authenticated users cleanup
          for (const [userId, data] of connectedUsers.entries()) {
            if (now - data.connectedAt > staleThreshold) {
              const s = io.sockets.sockets.get(data.socketId);
              if (!s || !s.connected) {
                connectedUsers.delete(userId);
                socketToUser.delete(data.socketId);
              }
            }
          }

          // ✅ Guest stale cleanup
          for (const socketId of connectedGuests) {
            const s = io.sockets.sockets.get(socketId);
            if (!s || !s.connected) {
              connectedGuests.delete(socketId);
            }
          }

          // ✅ Cleanup ke baad count update
          emitOnlineCount(io);
        } catch (error) {
          console.error("[Socket:Cleanup] Cleanup error:", error.message);
        }
      },
      5 * 60 * 1000,
    );

    return io;
  } catch (error) {
    console.error("❌ Failed to initialize Socket.IO:", error.message);
    throw error;
  }
}

export { io };

// =============================================================================
// UTILITY FUNCTIONS FOR EXTERNAL USE
// =============================================================================

export const emitPostUpdated = (post) => {
  try {
    if (!post || !post._id) return;
    io.emit("postUpdated", { post, timestamp: Date.now() });
  } catch (error) {
    console.error("[Socket:Post] Error emitting post update:", error.message);
  }
};

export const emitPostDeleted = (postId) => {
  try {
    if (!postId) return;
    io.emit("postDeleted", { postId, timestamp: Date.now() });
  } catch (error) {
    console.error("[Socket:Post] Error emitting post deletion:", error.message);
  }
};

export const emitNotification = (userId, notification) => {
  try {
    if (!userId || !notification) return;
    io.to(userId.toString()).emit("notification", {
      ...notification,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error(
      "[Socket:Notification] Error emitting notification:",
      error.message,
    );
  }
};

export const getConnectionStats = () => {
  try {
    return {
      totalConnections: connectedUsers.size + connectedGuests.size, // ✅ guests bhi
      authenticatedConnections: connectedUsers.size,
      guestConnections: connectedGuests.size,
      totalRooms: roomMembers.size,
      adminConnections: Array.from(connectedUsers.values()).filter(
        (u) => u.isAdmin,
      ).length,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("[Socket:Stats] Error getting stats:", error.message);
    return null;
  }
};

export const isUserOnline = (userId) => {
  return connectedUsers.has(userId?.toString());
};

export const disconnectUser = (userId, reason = "admin_disconnect") => {
  try {
    const userData = connectedUsers.get(userId?.toString());
    if (userData) {
      const socket = io.sockets.sockets.get(userData.socketId);
      if (socket) {
        socket.disconnect(true);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("[Socket:Admin] Error disconnecting user:", error.message);
    return false;
  }
};
