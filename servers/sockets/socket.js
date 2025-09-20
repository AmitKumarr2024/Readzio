import { Server } from "socket.io";
import { CLIENT_URL } from "../config/dotenv.js";
import { verifyToken } from "../../servers/Utils/verifyToken.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";

const connectedUsers = new Set();

export const io = new Server({
  path: "/socket.io",
  cors: {
    origin: (origin, callback) => {
      console.log("[Socket:CORS] Request from:", origin);
      const allowedOrigins = [
        CLIENT_URL?.replace(/\/$/, ""),
        "http://localhost:5173",
        "http://localhost:8001",
        "https://inkshaa.onrender.com", // ✅ Fixed: Removed duplicate
        "null",
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin) || origin === "null") {
        return callback(null, true);
      }

      console.error("[Socket:CORS] ❌ Blocked:", origin);
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  },
  pingInterval: 20000,
  pingTimeout: 20000,
});

io.use(async (socket, next) => {
  try {
    let token = socket.handshake.auth.token;

    if (!token && socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie
        ?.split("; ")
        .reduce((acc, cookie) => {
          const [name, value] = cookie.split("=");
          acc[name] = value;
          return acc;
        }, {});
      token = cookies?.jwt;
    }

    if (!token) {
      console.warn(
        "[Socket:Auth] No token found, allowing unauthenticated socket"
      );
      return next();
    }

    const decoded = verifyToken(token);
    socket.userId = decoded.userId?.toString();
    socket.role = decoded.role;
    socket.isAdmin = decoded.isAdmin;
    next();
  } catch (err) {
    console.error("[Socket:Auth] ❌ Token error:", err.message);
    next(new Error("Authentication failed"));
  }
});

io.on("connection", async (socket) => {
  if (socket.userId) {
    connectedUsers.add(socket.userId);
    socket.join(socket.userId);
    io.emit("userStatus", { userId: socket.userId, isOnline: true });
    io.emit("onlineUsersCount", connectedUsers.size);

    try {
      const user = await UserModel.findById(socket.userId).select(
        "joiningDate feedbackPrompt"
      );

      // ✅ Fixed: Added user existence check
      if (!user) {
        console.warn(`[Socket] User ${socket.userId} not found`);
        return;
      }

      const joinedDaysAgo =
        (Date.now() - new Date(user.joiningDate)) / (1000 * 60 * 60 * 24);

      if (
        joinedDaysAgo >= 7 &&
        (!user.feedbackPrompt ||
          (!user.feedbackPrompt.shown && !user.feedbackPrompt.responded))
      ) {
        socket.emit("showFeedbackPrompt", {
          message: "How do you like our app?",
        });

        user.feedbackPrompt = {
          shown: true,
          shownAt: new Date(),
          responded: false,
        };
        await user.save();
      }
    } catch (err) {
      console.error("[Socket] ⚠️ Feedback check failed:", err.message);
    }
  }

  socket.on("join", (roomId) => {
    if (roomId === "adminRoom") {
      socket.join("adminRoom");
      return;
    }

    if (roomId && (!socket.userId || socket.userId === roomId)) {
      socket.userId = roomId;
      socket.join(roomId);
      connectedUsers.add(roomId);
      io.emit("userStatus", { userId: roomId, isOnline: true });
      io.emit("onlineUsersCount", connectedUsers.size);
    }
  });

  socket.on("userLocationUpdate", (data) => {
    io.to("adminRoom").emit("userLocationUpdate", data);
  });

  socket.on("getOnlineUsers", () => {
    const list = Array.from(connectedUsers);
    socket.emit("onlineUsersList", list);
  });

  socket.on("adImpression", ({ postId, adIndex, adSlot, timeSpent }) => {
    if (socket.userId) {
      io.to(socket.userId).emit("adImpressionRecorded", {
        postId,
        adIndex,
        adSlot,
        timeSpent,
        timestamp: Date.now(),
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[Socket] User ${socket.userId} disconnected:`, reason);
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      socket.leave(socket.userId); // ✅ Fixed: Ensure room cleanup
      socket.leave("adminRoom"); // ✅ Fixed: Clean up admin room too
      io.emit("userStatus", { userId: socket.userId, isOnline: false });
      io.emit("onlineUsersCount", connectedUsers.size);
    }
  });

  // ✅ Fixed: Added error handler for socket errors
  socket.on("error", (error) => {
    console.error(`[Socket] Socket error for user ${socket.userId}:`, error);
  });
});

export default function initializeSocket(server) {
  io.attach(server);

  // ✅ Fixed: Added server error handling
  io.engine.on("connection_error", (err) => {
    console.error("[Socket] Connection error:", err.req);
    console.error("[Socket] Error code:", err.code);
    console.error("[Socket] Error message:", err.message);
    console.error("[Socket] Error context:", err.context);
  });

  return io;
}

export const emitPostUpdated = (post) => {
  io.emit("postUpdated", post);
};

export const emitPostDeleted = (postId) => {
  io.emit("postDeleted", postId);
};
