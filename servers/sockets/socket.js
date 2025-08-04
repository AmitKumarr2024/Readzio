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
        "https://inksha-uedq.onrender.com",
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".onrender.com")) {
        return callback(null, true);
      }

      console.warn("[Socket:CORS] ❌ Blocked:", origin);
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  },
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Keep-alive to prevent Render suspension
const keepAlive = () => {
  io.emit("ping", { timestamp: Date.now() });
};
setInterval(keepAlive, 30000);

// Authentication middleware
io.use(async (socket, next) => {
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

  try {
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        socket.userId = decoded.userId?.toString();
        socket.role = decoded.role;
        socket.isAdmin = decoded.isAdmin;
      }
    }
    next();
  } catch (err) {
    console.warn("[Socket:Auth] Invalid token, continuing as guest:", err.message);
    next(); // Allow guest connections
  }
});

// Main socket connection
io.on("connection", async (socket) => {
  const joinUser = (userId) => {
    socket.join(userId);
    connectedUsers.add(userId);
    io.emit("userStatus", { userId, isOnline: true });
    io.emit("onlineUsersCount", connectedUsers.size);
  };

  if (socket.userId) {
    joinUser(socket.userId);

    try {
      const user = await UserModel.findById(socket.userId).select(
        "joiningDate feedbackPrompt"
      );

      if (!user) {
        console.error("[Socket] User not found:", socket.userId);
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
    if (roomId === "adminRoom" && socket.isAdmin) {
      socket.join("adminRoom");
      return;
    }

    if (roomId && (!socket.userId || socket.userId === roomId)) {
      socket.userId = roomId;
      joinUser(roomId);
    }
  });

  socket.on("userLocationUpdate", (data) => {
    if (data?.userId && data?.coordinates?.lat && data?.coordinates?.lon) {
      io.to("adminRoom").emit("userLocationUpdate", data);
    }
  });

  socket.on("getOnlineUsers", () => {
    const list = Array.from(connectedUsers);
    socket.emit("onlineUsersList", list);
  });

  socket.on("adImpression", ({ postId, adIndex, adSlot, timeSpent }) => {
    if (socket.userId && postId) {
      io.to(socket.userId).emit("adImpressionRecorded", {
        postId,
        adIndex,
        adSlot,
        timeSpent,
        timestamp: Date.now(),
      });
    } else {
      console.warn("[Socket:AdImpression] Missing userId or postId:", { userId: socket.userId, postId });
    }
  });

  socket.on("ping", () => {
    socket.emit("pong", { timestamp: Date.now() });
  });

  socket.on("disconnect", (reason) => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      io.emit("userStatus", { userId: socket.userId, isOnline: false });
      io.emit("onlineUsersCount", connectedUsers.size);
    }
    socket.removeAllListeners();
  });
});

// Attach to server
export default function initializeSocket(server) {
  io.attach(server);
  return io;
}

// Emit helpers for posts
export const emitPostUpdated = async (post) => {
  if (!post?._id || !post?.slug) {
    console.error("[Socket] Invalid post data for emitPostUpdated:", post);
    return;
  }
  try {
    const updatedPost = await PostModel.findById(post._id).lean();
    if (updatedPost) {
      io.emit("postUpdated", updatedPost);
    } else {
      console.error("[Socket] Post not found for emitPostUpdated:", post._id);
    }
  } catch (err) {
    console.error("[Socket] emitPostUpdated error:", err.message);
  }
};

export const emitPostDeleted = (postId) => {
  if (!postId) {
    console.error("[Socket] Invalid postId for emitPostDeleted:", postId);
    return;
  }
  io.emit("postDeleted", postId);
};