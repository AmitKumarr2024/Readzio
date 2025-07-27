import { Server } from "socket.io";
import { CLIENT_URL } from "../config/dotenv.js";
import { verifyToken } from "../../servers/Utils/verifyToken.js";
import PostModel from "../../servers/Models/Post.js";

const connectedUsers = new Set();

export const io = new Server({
  path: "/socket.io",
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        CLIENT_URL?.replace(/\/$/, ""),
        "http://localhost:5173",
        "https://inksha.onrender.com",
      ].filter(Boolean);
      if (!origin) {
        console.log(
          "[Socket:CORS] ⚠️ No origin provided (possibly polling or localhost access)"
        );
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
        source: token
          ? socket.handshake.auth.token
            ? "auth.token"
            : "cookie"
          : "none",
      });
    } else {
      console.warn(
        "[Socket:Auth] No token provided, allowing guest connection"
      );
    }
    next();
  } catch (err) {
    console.error("[Socket:Auth] ❌ Error:", err.message);
    next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  console.log("[Socket:Connection] New connection:", {
    socketId: socket.id,
    userId: socket.userId,
  });

  if (socket.userId) {
    connectedUsers.add(socket.userId);
    socket.join(socket.userId);
    io.emit("userStatus", { userId: socket.userId, isOnline: true });
    io.emit("onlineUsersCount", connectedUsers.size);
    console.log("[Socket:Connected] User added:", {
      userId: socket.userId,
      socketId: socket.id,
      onlineCount: connectedUsers.size,
    });
  }

  socket.on("join", (roomId) => {
    console.log("[Socket:Join] Received join:", {
      roomId,
      socketUserId: socket.userId,
    });

    if (roomId === "adminRoom" && socket.isAdmin) {
      console.log("[Socket:Join] ✅ Admin joined adminRoom");
      socket.join("adminRoom");
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
        onlineCount: connectedUsers.size,
      });
    } else {
      console.warn("[Socket:Join] Invalid or mismatched roomId:", {
        roomId,
        socketUserId: socket.userId,
      });
    }
  });

  socket.on("userLocationUpdate", (data) => {
    console.log("[Socket] 📍 userLocationUpdate:", data);
    io.to("adminRoom").emit("userLocationUpdate", data);
  });

  socket.on("getOnlineUsers", () => {
    const list = Array.from(connectedUsers);
    socket.emit("onlineUsersList", list);
    console.log("[Socket] 📡 Sent online users to:", socket.userId || "guest");
  });

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

  socket.on("disconnect", (reason) => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      io.emit("userStatus", { userId: socket.userId, isOnline: false });
      io.emit("onlineUsersCount", connectedUsers.size);
      console.log("[Socket:Disconnected]", {
        userId: socket.userId,
        reason,
        onlineCount: connectedUsers.size,
      });
    } else {
      console.log("[Socket:Disconnected] Guest disconnected:", {
        socketId: socket.id,
        reason,
      });
    }
  });
});

console.log("[Socket] ✅ Initialized");

export default function initializeSocket(server) {
  io.attach(server);
  console.log("[Socket] Attached to server");
  return io;
}

export const emitPostUpdated = (post) => {
  console.log("[Socket] 🔄 emitPostUpdated:", post._id);
  io.emit("postUpdated", post);
};

export const emitPostDeleted = (postId) => {
  console.log("[Socket] 🗑️ emitPostDeleted:", postId);
  io.emit("postDeleted", postId);
};

export const emitGuestVisitUpdate = (guest) => {
  console.log("[Socket] 🔵 emitGuestVisitUpdate:", guest.guestId);
  io.to("adminRoom").emit("guestVisitUpdate", guest);
};
