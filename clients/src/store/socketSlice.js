import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";
import { io } from "socket.io-client";
import axiosInstance from "../connection/axiosInstance";
import { getToken } from "../Utils/getToken";
import { checkAuth } from "./authSlice";
import { addNotification, updateUnreadCount } from "./notificationSlice";
import { debounce } from "lodash";
import { toast } from "react-hot-toast";
import {
  addBannerNotification,
  removeBannerNotification,
  resetBannerNotifications,
  fetchActiveBannerNotifications,
  fetchAllBannerNotifications,
} from "./bannerNotificationSlice";

const isDev = import.meta.env.MODE === "development";
const MAX_USER_LOCATIONS = 500;
const MAX_GUEST_VISITS = 100;
const CONNECTION_RETRY_DELAY = 2000;
const MAX_RETRY_ATTEMPTS = 5;

const log = (...args) => {
  const [first] = args;
  if (
    first instanceof Error ||
    (typeof first === "string" && first.toLowerCase().includes("error"))
  ) {
    console.error(...args);
  }
};

export const fetchInitialPostCounts = createAsyncThunk(
  "socket/fetchInitialPostCounts",
  async (_, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      log("[fetchInitialPostCounts] Authenticated user:", user);

      if (!user?._id) throw new Error("User not authenticated");

      const [allPostsCount, myPostsCount, followingPostsCount] =
        await Promise.all([
          axiosInstance.get("/post/count/all"),
          axiosInstance.get("/post/count/my", { withCredentials: true }),
          axiosInstance.get("/post/count/following", { withCredentials: true }),
        ]);

      return {
        allPostsCount: allPostsCount.data.count || 0,
        myPostsCount: myPostsCount.data.count || 0,
        followingPostsCount: followingPostsCount.data.count || 0,
      };
    } catch (err) {
      console.error("[socketSlice] fetchInitialPostCounts Error:", err.message);
      return rejectWithValue(err.message || "Failed to fetch post counts");
    }
  }
);

// ✅ Fixed: Better event listener management
const setupEventListeners = (socket, dispatch, getState) => {
  // Remove all existing listeners first
  const eventList = [
    "onlineUsersCount",
    "newNotification",
    "updateUnreadCount",
    "userStatus",
    "userLocationUpdate",
    "newAppeal",
    "newBroadcastNotification",
    "postCountsUpdated",
    "broadcastNotificationDeactivated",
    "broadcastNotificationDismissed",
    "broadcastNotificationDeletedAll",
    "postBlockToggled",
    "guestVisitUpdate",
    "showFeedbackPrompt",
  ];

  eventList.forEach((event) => socket.off(event));

  // Debounced handlers
  const debouncedLocationHandler = debounce((location) => {
    dispatch(addUserLocation(location));
  }, 1000);

  const debouncedGuestVisit = debounce((guest) => {
    log("[socketSlice] 🔵 [Debounced] Processing guestVisitUpdate:", {
      guestId: guest.guestId,
      visitCount: guest.visitCount,
      lastVisit: guest.lastVisit,
      timestamp: new Date().toISOString(),
    });
    dispatch(addGuestVisit(guest));
  }, 1000);

  // Set up all event listeners
  socket.on("onlineUsersCount", (count) => {
    dispatch(setOnlineUsersCount(count));
  });

  socket.on("newNotification", (notification) => {
    const userId = getState().auth.user?._id?.toString();
    if (notification?.user?.toString() === userId) {
      dispatch(addNotification(notification));
    }
  });

  socket.on("updateUnreadCount", ({ count }) => {
    dispatch(updateUnreadCount(count));
  });

  socket.on("userStatus", ({ userId, isOnline }) => {
    dispatch(setUserStatus({ userId, isOnline }));
  });

  socket.on("userLocationUpdate", (location) => {
    if (
      location?.userId &&
      location?.coordinates?.lat &&
      location?.coordinates?.lon
    ) {
      debouncedLocationHandler(location);
    }
  });

  socket.on("newAppeal", (appeal) => {
    const isAdmin = getState().auth.user?.role === "admin";
    if (isAdmin) {
      dispatch(
        addNotification({
          _id: appeal.postId,
          message: `New appeal for post: ${appeal.postTitle}`,
          type: "appeal",
        })
      );
    }
  });

  socket.on("newBroadcastNotification", (notification) => {
    const user = getState().auth?.user;
    if (
      notification.region === "global" ||
      notification.region === user?.region
    ) {
      const checkDismissed = async () => {
        try {
          const res = await axiosInstance.get(
            `/bannerNotification/dismissed/${notification._id}`,
            { withCredentials: true }
          );
          if (!res.data.dismissed) {
            dispatch(addBannerNotification(notification));
            dispatch(newNotificationReceived(notification));
          }
        } catch (err) {
          if (err.response?.status === 403) {
            // Admin: add without check
            dispatch(addBannerNotification(notification));
            dispatch(newNotificationReceived(notification));
          } else {
            console.error("Error checking dismissed status:", err.message);
          }
        }
      };

      if (user?._id) {
        checkDismissed();
      } else {
        // Guest: assume not dismissed
        dispatch(addBannerNotification(notification));
        dispatch(newNotificationReceived(notification));
      }
    }
  });

  socket.on(
    "postCountsUpdated",
    ({ allPostsCount, myPostsCount, followingPostsCount }) => {
      dispatch(
        setPostCounts({
          allPostsCount,
          myPostsCount,
          followingPostsCount,
        })
      );
    }
  );

  const handleBannerRemoval = (id, reason = "deactivated") => {
    dispatch(removeBannerNotification(id));
    const current = getState().socket.newNotification;
    if (current?._id === id) {
      dispatch(newNotificationReceived(null));
      dispatch(setNotificationDismissReason(reason));
    }
  };

  socket.on("broadcastNotificationDeactivated", ({ id }) => {
    handleBannerRemoval(id, "deactivated");
  });

  socket.on("broadcastNotificationDismissed", ({ id }) => {
    handleBannerRemoval(id, "dismissed");
  });

  socket.on("broadcastNotificationDeletedAll", () => {
    dispatch(resetBannerNotifications());
    dispatch(newNotificationReceived(null));
    dispatch(setNotificationDismissReason("deleted"));
  });

  socket.on("postBlockToggled", ({ postId, blocked }) => {
    dispatch({
      type: "admin/updatePostBlockStatus",
      payload: { postId, blocked },
    });
    dispatch({
      type: "post/updateCurrentPostBlockedStatus",
      payload: { postId, blocked },
    });
  });

  socket.on("guestVisitUpdate", (guest) => {
    log("[socketSlice] 🔴 Received guestVisitUpdate:", {
      guestId: guest.guestId,
      visitCount: guest.visitCount,
      lastVisit: guest.lastVisit,
      timestamp: new Date().toISOString(),
    });
    debouncedGuestVisit(guest);
  });

  socket.on("showFeedbackPrompt", (data) => {
    log("[socketSlice] 💬 Received showFeedbackPrompt:", data);
    dispatch(setFeedbackPrompt(data?.message || "We'd love your feedback!"));
  });
};

export const initializeSocket = createAsyncThunk(
  "socket/initialize",
  async (_, { dispatch, getState }) => {
    log("[socketSlice] Initializing socket...");
    const { user, isGuest } = getState().auth;
    let token = getToken();

    // ✅ Fixed: Better token validation
    if (!isGuest && !token) {
      try {
        await dispatch(checkAuth()).unwrap();
        token = getToken();
      } catch (err) {
        console.warn("[socketSlice] checkAuth failed:", err.message);
        return Promise.reject("Authentication required for non-guest users");
      }
    }

    const userId = user?._id?.toString();

    // ✅ Fixed: Better validation logic
    if (!isGuest && !userId) {
      log("[socketSlice] ❌ User ID required for authenticated users");
      return Promise.reject("User ID not available");
    }

    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:8001", {
      auth: { token: token || null },
      transports: ["websocket", "polling"],
      path: "/socket.io", // ✅ Fixed: Removed trailing slash
      reconnectionAttempts: MAX_RETRY_ATTEMPTS,
      reconnectionDelay: CONNECTION_RETRY_DELAY,
      timeout: 10000, // ✅ Added connection timeout
    });

    return new Promise((resolve, reject) => {
      // ✅ Fixed: Clean up existing listeners
      socket.removeAllListeners();

      let connectionTimeout;

      socket.on("connect", async () => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
        }

        log("[socketSlice] ✅ Socket connected successfully");

        if (isGuest) {
          // 🔵 Generate a temporary guest ID (saved in localStorage)
          let guestId = localStorage.getItem("guestId");
          if (!guestId) {
            guestId = "guest_" + Math.random().toString(36).substring(2, 10);
            localStorage.setItem("guestId", guestId);
          }

          // Tell server about the guest
          socket.emit("join", guestId);
          log("[socketSlice] 🟢 Guest joined socket room:", guestId);
        } else if (userId) {
          socket.emit("join", userId);
          const isAdmin = user?.role === "admin";
          if (isAdmin) {
            socket.emit("join", "adminRoom");
          }

          const fetchThunk = isAdmin
            ? fetchAllBannerNotifications
            : fetchActiveBannerNotifications;
          const region = user?.region ? { region: user.region } : {};
          const result = await dispatch(fetchThunk(region)).unwrap();

          // Set initial newNotification matching old logic
          let activeNotification = null;
          if (result.length > 0) {
            activeNotification = result.find(
              (notif) =>
                notif.isActive &&
                (!notif.expiresAt || new Date(notif.expiresAt) > new Date()) &&
                (notif.region === "global" || notif.region === user.region) &&
                !notif.dismissedBy?.includes(user._id)
            );
          }
          if (activeNotification) {
            dispatch(newNotificationReceived(activeNotification));
          }
        }

        dispatch(fetchInitialPostCounts());

        // ✅ Fixed: Set up event listeners properly
        setupEventListeners(socket, dispatch, getState);
        dispatch(setSocketInstance(socket));
        resolve(socket);
      });

      // ✅ Fixed: Better error handling with rate limiting
      let lastToast = 0;
      socket.on("connect_error", (err) => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
        }

        const now = Date.now();
        if (now - lastToast > 10000) {
          toast.error("🚨 Can't connect to server. Please try again.");
          lastToast = now;
        }

        dispatch(setError(err.message));
        console.error("Socket Connect Error:", err.message);
        reject(new Error(`Connection failed: ${err.message}`));
      });

      socket.io.on("reconnect_attempt", (attemptNumber) => {
        log(
          `🌀 Reconnection attempt ${attemptNumber}/${MAX_RETRY_ATTEMPTS}...`
        );
      });

      socket.on("disconnect", (reason) => {
        log(`[socketSlice] 🔌 Socket disconnected: ${reason}`);
        dispatch(setDisconnected());
      });

      // ✅ Fixed: Add connection timeout
      connectionTimeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error("Connection timeout"));
      }, 15000);
    });
  }
);

export const disconnectSocket = createAsyncThunk(
  "socket/disconnect",
  async (_, { dispatch, getState }) => {
    const socket = getState().socket.socketInstance;
    if (socket) {
      log("[socketSlice] 🔌 Disconnecting socket...");

      // ✅ Fixed: Proper cleanup
      socket.removeAllListeners();
      socket.disconnect();
      dispatch(setDisconnected());
    }
  }
);

const socketSlice = createSlice({
  name: "socket",
  initialState: {
    socketInstance: null,
    status: "disconnected",
    error: null,
    onlineUsersCount: 0,
    feedbackPrompt: null,
    userStatus: {},
    newNotification: null,
    userLocations: [],
    guestVisits: [],
    notificationDismissReason: null,
    postCounts: { allPostsCount: 0, followingPostsCount: 0, myPostsCount: 0 },
  },
  reducers: {
    setFeedbackPrompt(state, action) {
      state.feedbackPrompt = action.payload;
    },
    setSocketInstance(state, action) {
      state.socketInstance = action.payload;
      state.status = action.payload?.connected ? "connected" : "disconnected";
      state.error = null;
    },
    setDisconnected(state) {
      state.socketInstance = null;
      state.status = "disconnected";
      state.error = null;
    },
    setError(state, action) {
      state.error = action.payload;
      state.status = "error"; // ✅ Fixed: Better status handling
    },
    setOnlineUsersCount(state, action) {
      state.onlineUsersCount = Number(action.payload) || 0;
    },
    setUserStatus(state, action) {
      const { userId, isOnline } = action.payload;
      state.userStatus = {
        ...state.userStatus,
        [userId]: { isOnline },
      };
    },
    newNotificationReceived(state, action) {
      state.newNotification = action.payload;
    },
    addUserLocation(state, action) {
      const location = action.payload;
      if (
        !location?.userId ||
        !location?.coordinates?.lat ||
        !location?.coordinates?.lon
      ) {
        return;
      }
      if (state.userLocations.length >= MAX_USER_LOCATIONS) {
        console.warn("⚠️ Max user locations reached. Trimming oldest entries.");
        state.userLocations.shift();
      }
      state.userLocations = [
        ...state.userLocations.filter((loc) => loc.userId !== location.userId),
        location,
      ];
    },
    setNotificationDismissReason(state, action) {
      state.notificationDismissReason = action.payload;
    },
    setPostCounts(state, action) {
      state.postCounts = {
        ...state.postCounts,
        ...action.payload,
      };
    },
    addGuestVisit: (state, action) => {
      const newGuest = action.payload;
      log("[addGuestVisit] Processing new guest:", {
        guestId: newGuest.guestId,
        visitCount: newGuest.visitCount,
        lastVisit: newGuest.lastVisit,
        currentGuestVisitsLength: state.guestVisits.length,
        timestamp: new Date().toISOString(),
      });

      const existingGuest = state.guestVisits.find(
        (g) => g.guestId === newGuest.guestId
      );

      if (existingGuest) {
        log("[addGuestVisit] Existing guest found:", {
          existing: {
            guestId: existingGuest.guestId,
            visitCount: existingGuest.visitCount,
            lastVisit: existingGuest.lastVisit,
          },
          newGuest: {
            guestId: newGuest.guestId,
            visitCount: newGuest.visitCount,
            lastVisit: newGuest.lastVisit,
          },
        });

        const sameVisit =
          newGuest.visitCount === existingGuest.visitCount &&
          new Date(newGuest.lastVisit).getTime() ===
            new Date(existingGuest.lastVisit).getTime();

        if (sameVisit) {
          log("[addGuestVisit] ❌ Duplicate guest visit detected, skipping:", {
            guestId: newGuest.guestId,
            visitCount: newGuest.visitCount,
            lastVisit: newGuest.lastVisit,
          });
          return;
        }

        log("[addGuestVisit] ✅ Updating existing guest:", {
          guestId: newGuest.guestId,
          visitCount: newGuest.visitCount,
          lastVisit: newGuest.lastVisit,
        });
        state.guestVisits = state.guestVisits.map((g) =>
          g.guestId === newGuest.guestId ? newGuest : g
        );
      } else {
        log("[addGuestVisit] ✅ Adding new guest:", {
          guestId: newGuest.guestId,
          visitCount: newGuest.visitCount,
          lastVisit: newGuest.lastVisit,
          guestVisitsLength: state.guestVisits.length + 1,
        });
        state.guestVisits.unshift(newGuest);
        if (state.guestVisits.length > MAX_GUEST_VISITS) {
          console.warn("⚠️ Max guest visits reached. Trimming oldest entries.");
          state.guestVisits = state.guestVisits.slice(0, MAX_GUEST_VISITS);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInitialPostCounts.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchInitialPostCounts.fulfilled, (state, action) => {
        state.status = "connected";
        state.postCounts = action.payload;
      })
      .addCase(fetchInitialPostCounts.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload;
      })
      .addCase(initializeSocket.pending, (state) => {
        state.status = "connecting";
        state.error = null;
      })
      .addCase(initializeSocket.fulfilled, (state) => {
        state.status = "connected";
        state.error = null;
      })
      .addCase(initializeSocket.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message;
      })
      .addCase(disconnectSocket.fulfilled, (state) => {
        state.status = "disconnected";
        state.error = null;
        state.socketInstance = null;
      });
  },
});

export const {
  setSocketInstance,
  setDisconnected,
  setError,
  setOnlineUsersCount,
  setUserStatus,
  newNotificationReceived,
  addUserLocation,
  setNotificationDismissReason,
  setPostCounts,
  addGuestVisit,
  setFeedbackPrompt,
} = socketSlice.actions;

export const selectSocketState = createSelector(
  [(state) => state.socket || {}],
  (socket) => ({
    socket: socket.socketInstance,
    isConnected: socket.status === "connected",
    isConnecting: socket.status === "connecting",
    error: socket.error,
    onlineUsersCount: socket.onlineUsersCount,
    userStatus: socket.userStatus,
    newNotification: socket.newNotification,
    userLocations: socket.userLocations,
    notificationDismissReason: socket.notificationDismissReason,
    postCounts: socket.postCounts,
    guestVisits: socket.guestVisits,
    feedbackPrompt: socket.feedbackPrompt,
  })
);

export default socketSlice.reducer;
