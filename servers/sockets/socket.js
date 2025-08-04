import { Server } from "socket.io";
import { corsOptions } from "../../servers/config/cors.config.js";
import { verifyToken } from "../../servers/Utils/verifyToken.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";

const connectedUsers = new Set();

export const io = new Server({
  path: "/socket.io/",
  cors: corsOptions,
  pingInterval: 25000,
  pingTimeout: 60000,
});

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
    console.error("[Socket:Auth] ❌ Error:", err.message);
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
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      io.emit("userStatus", { userId: socket.userId, isOnline: false });
      io.emit("onlineUsersCount", connectedUsers.size);
    }
  });
});

export default function initializeSocket(server) {
  io.attach(server);
  return io;
}

export const emitPostUpdated = (post) => {
  io.emit("postUpdated", post);
};

export const emitPostDeleted = (postId) => {
  io.emit("postDeleted", postId);
};
