import { Server } from "socket.io";
import { corsOptions } from "../../servers/config/cors.config.js";
import { verifyToken } from "../../servers/Utils/verifyToken.js";
import UserModel from "../../servers/Models/User.js";

const connectedUsers = new Set();

export const io = new Server({
  path: "/socket.io/",
  cors: corsOptions,
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Middleware: Verify token from auth or cookies
io.use(async (socket, next) => {
  let token = socket.handshake.auth?.token;

  if (!token && socket.handshake.headers?.cookie) {
    const cookies = socket.handshake.headers.cookie
      .split("; ")
      .reduce((acc, cookie) => {
        const [name, value] = cookie.split("=");
        acc[name] = value;
        return acc;
      }, {});
    token = cookies?.jwt;
  }

  if (!token) {
    console.error("[Socket:Auth] ❌ No token provided");
    return next(new Error("Authentication failed"));
  }

  try {
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

// On connection
io.on("connection", async (socket) => {
  const userId = socket.userId;

  if (userId) {
    connectedUsers.add(userId);
    socket.join(userId);
    io.emit("userStatus", { userId, isOnline: true });
    io.emit("onlineUsersCount", connectedUsers.size);

    try {
      const user = await UserModel.findById(userId)
        .select("joiningDate feedbackPrompt")
        .lean();

      if (user?.joiningDate) {
        const joinedDaysAgo =
          (Date.now() - new Date(user.joiningDate)) / (1000 * 60 * 60 * 24);

        const prompt = user.feedbackPrompt || {};
        if (joinedDaysAgo >= 7 && !prompt.shown && !prompt.responded) {
          socket.emit("showFeedbackPrompt", {
            message: "How do you like our app?",
          });

          await UserModel.updateOne(
            { _id: userId },
            {
              feedbackPrompt: {
                shown: true,
                shownAt: new Date(),
                responded: false,
              },
            }
          );
        }
      } else {
        console.warn(`[Socket] ⚠️ No joiningDate for user ${userId}`);
      }
    } catch (err) {
      console.error("[Socket] ⚠️ Feedback prompt error:", err.message);
    }
  }

  // Join room
  socket.on("join", (roomId) => {
    if (roomId === "adminRoom") {
      socket.join("adminRoom");
      return;
    }

    if (roomId && (!socket.userId || socket.userId === roomId)) {
      socket.userId = roomId;
      connectedUsers.add(roomId);
      socket.join(roomId);
      io.emit("userStatus", { userId: roomId, isOnline: true });
      io.emit("onlineUsersCount", connectedUsers.size);
    }
  });

  // Forward user location updates to admin
  socket.on("userLocationUpdate", (data) => {
    io.to("adminRoom").emit("userLocationUpdate", data);
  });

  // Request: Get online users list
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

  // On disconnect
  socket.on("disconnect", () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      io.emit("userStatus", { userId: socket.userId, isOnline: false });
      io.emit("onlineUsersCount", connectedUsers.size);
    }
  });
});

// Init socket with HTTP server
export default function initializeSocket(server) {
  io.attach(server);
  return io;
}

// Emit helpers
export const emitPostUpdated = (post) => {
  io.emit("postUpdated", post);
};

export const emitPostDeleted = (postId) => {
  io.emit("postDeleted", postId);
};
