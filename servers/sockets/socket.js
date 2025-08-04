import { Server } from "socket.io";
import { CLIENT_URL, ALLOWED_ORIGINS } from "../config/dotenv.js";
import { verifyToken } from "../../servers/Utils/verifyToken.js";
import UserModel from "../../servers/Models/User.js";
import throttle from "lodash.throttle";

// Constants
const isDev = process.env.NODE_ENV === "development";
const EVENTS = {
  userStatus: "userStatus",
  onlineUsersCount: "onlineUsersCount",
  userLocationUpdate: "userLocationUpdate",
  showFeedbackPrompt: "showFeedbackPrompt",
  adImpression: "adImpression",
  adImpressionRecorded: "adImpressionRecorded",
  getOnlineUsers: "getOnlineUsers",
  onlineUsersList: "onlineUsersList",
  postUpdated: "postUpdated",
  postDeleted: "postDeleted",
};

// Socket Setup
const connectedUsers = new Set();
const io = new Server({
  path: "/socket.io/",
  cors: {
    origin: (origin, callback) => {
      const allowed = ALLOWED_ORIGINS.split(",").filter(Boolean);
      if (!origin || allowed.includes(origin)) return callback(null, true);
      if (isDev) console.error("[Socket:CORS] Blocked:", origin);
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  },
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Middleware
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
    if (isDev) console.error("[Socket:Auth] No token provided");
    return next(new Error("Authentication failed"));
  }
  try {
    const decoded = verifyToken(token);
    socket.userId = decoded.userId?.toString();
    socket.role = decoded.role;
    socket.isAdmin = decoded.isAdmin;
    next();
  } catch (err) {
    if (isDev) console.error("[Socket:Auth] Error:", err.message);
    next(new Error("Authentication failed"));
  }
});

// Event Handlers
const setupSocketEvents = (socket) => {
  const emitToUser = (userId, event, payload) =>
    userId && io.to(userId).emit(event, payload);
  const emitToAdminRoom = (event, payload) =>
    io.to("adminRoom").emit(event, payload);

  if (socket.userId) {
    connectedUsers.add(socket.userId);
    socket.join(socket.userId);
    io.emit(EVENTS.userStatus, { userId: socket.userId, isOnline: true });
    io.emit(EVENTS.onlineUsersCount, connectedUsers.size);

    UserModel.findById(socket.userId)
      .select("joiningDate feedbackPrompt")
      .then((user) => {
        const joinedDaysAgo =
          (Date.now() - new Date(user.joiningDate)) / (1000 * 60 * 60 * 24);
        if (
          joinedDaysAgo >= 7 &&
          (!user.feedbackPrompt ||
            (!user.feedbackPrompt.shown && !user.feedbackPrompt.responded))
        ) {
          socket.emit(EVENTS.showFeedbackPrompt, {
            message: "How do you like our app?",
          });
          user.feedbackPrompt = {
            shown: true,
            shownAt: new Date(),
            responded: false,
          };
          return user.save();
        }
      })
      .catch(
        (err) =>
          isDev && console.error("[Socket] Feedback check failed:", err.message)
      );
  }

  socket.on("join", (roomId) => {
    if (roomId === "adminRoom" && socket.isAdmin) {
      socket.join("adminRoom");
    } else if (roomId && (!socket.userId || socket.userId === roomId)) {
      socket.userId = roomId;
      socket.join(roomId);
      connectedUsers.add(roomId);
      io.emit(EVENTS.userStatus, { userId: roomId, isOnline: true });
      io.emit(EVENTS.onlineUsersCount, connectedUsers.size);
    }
  });

  socket.on(
    EVENTS.userLocationUpdate,
    throttle((data) => {
      emitToAdminRoom(EVENTS.userLocationUpdate, data);
    }, 1000)
  );

  socket.on(EVENTS.getOnlineUsers, () => {
    socket.emit(EVENTS.onlineUsersList, Array.from(connectedUsers));
  });

  socket.on(EVENTS.adImpression, ({ postId, adIndex, adSlot, timeSpent }) => {
    emitToUser(socket.userId, EVENTS.adImpressionRecorded, {
      postId,
      adIndex,
      adSlot,
      timeSpent,
      timestamp: Date.now(),
    });
  });

  socket.on("disconnect", (reason) => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      io.emit(EVENTS.userStatus, { userId: socket.userId, isOnline: false });
      io.emit(EVENTS.onlineUsersCount, connectedUsers.size);
      emitToAdminRoom("userDisconnected", { userId: socket.userId, reason });
    }
  });
};

// Connection Handler
io.on("connection", (socket) => setupSocketEvents(socket));

// Exports
export default function initializeSocket(server) {
  io.attach(server);
  return io;
}

export const emitPostUpdated = (post) => io.emit(EVENTS.postUpdated, post);
export const emitPostDeleted = (postId) => io.emit(EVENTS.postDeleted, postId);
export const emitToUser = (userId, event, payload) =>
  userId && io.to(userId).emit(event, payload);
