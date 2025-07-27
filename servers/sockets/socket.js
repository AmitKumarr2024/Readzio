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
      const allowedOrigins = [
        CLIENT_URL?.replace(/\/$/, ""),
        "http://localhost:5173",
        "http://localhost:8001",
        "https://inksha.onrender.com",
      ].filter(Boolean);

      if (!origin) {
        console.log("[Socket:CORS] ⚠️ No origin (polling or localhost?)");
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        console.log("[Socket:CORS] ✅ Allowed:", origin);
        return callback(null, true);
      }

      console.error("[Socket:CORS] ❌ Blocked:", origin);
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  },
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Authentication middleware
io.use(async (socket, next) => {
  console.log("[Socket:Auth] Authenticating", { socketId: socket.id });

  let token = socket.handshake.auth.token;

  if (!token && socket.handshake.headers.cookie) {
    const cookies = socket.handshake.headers.cookie
      .split("; ")
      .reduce((acc, cookie) => {
        const [name, value] = cookie.split("=");
        acc[name] = value;
        return acc;
      }, {});
    token = cookies.jwt;
  }

  try {
    if (token) {
      const decoded = verifyToken(token);
      socket.userId = decoded.userId?.toString();
      socket.role = decoded.role;
      socket.isAdmin = decoded.isAdmin;

      console.log("[Socket:Auth] ✅ Authenticated:", {
        userId: socket.userId,
        role: socket.role,
        source: socket.handshake.auth.token ? "auth.token" : "cookie",
      });
    } else {
      console.warn("[Socket:Auth] Guest connection allowed (no token)");
    }
    next();
  } catch (err) {
    console.error("[Socket:Auth] ❌ Error:", err.message);
    next(new Error("Authentication failed"));
  }
});

// Main socket connection
io.on("connection", async (socket) => {
  console.log("[Socket:Connection] New connection:", {
    socketId: socket.id,
    userId: socket.userId,
  });

  // User is authenticated
  if (socket.userId) {
    connectedUsers.add(socket.userId);
    socket.join(socket.userId);
    io.emit("userStatus", { userId: socket.userId, isOnline: true });
    io.emit("onlineUsersCount", connectedUsers.size);
    console.log("[Socket:Connected] ✅ User joined:", {
      userId: socket.userId,
      socketId: socket.id,
    });

    // ✅ Feedback prompt check
    try {
      const user = await UserModel.findById(socket.userId).select(
        "joiningDate feedbackPrompt"
      );

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
        console.log("[Socket] 📬 Feedback prompt emitted");
      }
    } catch (err) {
      console.error("[Socket] ⚠️ Feedback check failed:", err.message);
    }
  }

  // Manual room join
  socket.on("join", (roomId) => {
    console.log("[Socket:Join] Received:", { roomId });

    if (roomId === "adminRoom") {
      socket.join("adminRoom");
      console.log("[Socket:Join] ✅ Admin joined adminRoom");
      return;
    }

    if (roomId && (!socket.userId || socket.userId === roomId)) {
      socket.userId = roomId;
      socket.join(roomId);
      connectedUsers.add(roomId);
      io.emit("userStatus", { userId: roomId, isOnline: true });
      io.emit("onlineUsersCount", connectedUsers.size);
      console.log("[Socket:Join] User joined:", {
        userId: roomId,
        socketId: socket.id,
      });
    } else {
      console.warn("[Socket:Join] ⚠️ Invalid join:", {
        roomId,
        socketUserId: socket.userId,
      });
    }
  });

  // Location updates
  socket.on("userLocationUpdate", (data) => {
    console.log("[Socket] 📍 userLocationUpdate:", data);
    io.to("adminRoom").emit("userLocationUpdate", data);
  });

  // Online user list
  socket.on("getOnlineUsers", () => {
    const list = Array.from(connectedUsers);
    socket.emit("onlineUsersList", list);
    console.log("[Socket] 📡 Online users sent:", list.length);
  });

  // Ad impression
  socket.on("adImpression", ({ postId, adIndex, adSlot, timeSpent }) => {
    console.log("[Socket] 📢 adImpression:", {
      userId: socket.userId,
      postId,
      adIndex,
      adSlot,
      timeSpent,
    });
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

  // On disconnect
  socket.on("disconnect", (reason) => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      io.emit("userStatus", { userId: socket.userId, isOnline: false });
      io.emit("onlineUsersCount", connectedUsers.size);
      console.log("[Socket:Disconnected]", {
        userId: socket.userId,
        reason,
      });
    } else {
      console.log("[Socket:Disconnected] Guest:", {
        socketId: socket.id,
        reason,
      });
    }
  });
});

console.log("[Socket] ✅ Initialized");

// Attach to server
export default function initializeSocket(server) {
  io.attach(server);
  console.log("[Socket] 🔌 Attached to HTTP server");
  return io;
}

// Emit helpers for posts
export const emitPostUpdated = (post) => {
  console.log("[Socket] 🔄 emitPostUpdated:", post._id);
  io.emit("postUpdated", post);
};

export const emitPostDeleted = (postId) => {
  console.log("[Socket] 🗑️ emitPostDeleted:", postId);
  io.emit("postDeleted", postId);
};
