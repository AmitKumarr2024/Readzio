// socket.js
import { Server } from "socket.io";
import { CLIENT_URL } from "../config/dotenv.js";
import { verifyToken } from "../../servers/Utils/verifyToken.js";
import UserModel from "../../servers/Models/User.js";

const connectedUsers = new Set();

export const io = new Server({
  path: "/socket.io",
  cors: {
    origin: [
      "https://readzio.com",
      "https://www.readzio.com",
      "http://localhost:5173",
    ],
    credentials: true,
  },
  pingInterval: 20000,
  pingTimeout: 20000,
});

io.use(async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token;

    // Fallback to cookie if no auth token
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
      console.warn("[Socket:Auth] No token found, allowing guest");
      return next();
    }

    const decoded = verifyToken(token);
    socket.userId = decoded.userId?.toString();
    socket.role = decoded.role;
    socket.isAdmin = decoded.isAdmin;
    next();
  } catch (err) {
    console.error("[Socket:Auth] Token error:", err.message);
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
      if (!user) {
        console.warn(`[Socket] User ${socket.userId} not found`);
      } else {
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
      }
    } catch (err) {
      console.error("[Socket] Feedback check failed:", err.message);
    }
  }

  // Join a specific room
  socket.on("join", (roomId) => {
    if (!roomId) return;
    if (roomId === "adminRoom") {
      socket.join("adminRoom");
    } else if (!socket.userId || socket.userId === roomId) {
      socket.userId = roomId;
      socket.join(roomId);
      connectedUsers.add(roomId);
      io.emit("userStatus", { userId: roomId, isOnline: true });
      io.emit("onlineUsersCount", connectedUsers.size);
    }
  });

  // User location updates
  socket.on("userLocationUpdate", (data) => {
    io.to("adminRoom").emit("userLocationUpdate", data);
  });

  // Get online users list
  socket.on("getOnlineUsers", () => {
    socket.emit("onlineUsersList", Array.from(connectedUsers));
  });

  // Ad impression tracking
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

  // Disconnect
  socket.on("disconnect", (reason) => {
    console.log(`[Socket] User ${socket.userId} disconnected:`, reason);
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      socket.leave(socket.userId);
      socket.leave("adminRoom");
      io.emit("userStatus", { userId: socket.userId, isOnline: false });
      io.emit("onlineUsersCount", connectedUsers.size);
    }
  });

  // Socket error handler
  socket.on("error", (error) => {
    console.error(`[Socket] Socket error for user ${socket.userId}:`, error);
  });
});

// Attach socket to server
export default function initializeSocket(server) {
  io.attach(server);

  // Engine connection error
  io.engine.on("connection_error", (err) => {
    console.error("[Socket] Connection error:", err.req?.headers?.origin);
    console.error("[Socket] Error code:", err.code);
    console.error("[Socket] Error message:", err.message);
    console.error("[Socket] Error context:", err.context);
  });

  return io;
}

// Utility to emit post events
export const emitPostUpdated = (post) => io.emit("postUpdated", post);
export const emitPostDeleted = (postId) => io.emit("postDeleted", postId);
