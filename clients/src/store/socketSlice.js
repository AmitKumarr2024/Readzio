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
import { adsUpdatedRealtime } from "./adsSlice";

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

// =============================================================================
// SOCKET URL — always use www to avoid redirect breaking WebSocket upgrade
// =============================================================================
const getSocketUrl = () => {
  const url = import.meta.env.VITE_API_URL || "http://localhost:8001";
  // Force www on production to avoid non-www redirect breaking WebSocket
  if (url.includes("readzio.com") && !url.includes("www.")) {
    return url.replace("https://readzio.com", "https://www.readzio.com");
  }
  return url;
};

// =============================================================================
// FETCH INITIAL POST COUNTS
// =============================================================================
export const fetchInitialPostCounts = createAsyncThunk(
  "socket/fetchInitialPostCounts",
  async (_, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
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
  },
);

// =============================================================================
// EVENT LISTENERS
// =============================================================================
const setupEventListeners = (socket, dispatch, getState) => {
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
    "ads:update",
  ];

  eventList.forEach((event) => socket.off(event));

  const debouncedLocationHandler = debounce((location) => {
    dispatch(addUserLocation(location));
  }, 1000);

  const debouncedGuestVisit = debounce((guest) => {
    dispatch(addGuestVisit(guest));
  }, 1000);

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
        }),
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
            { withCredentials: true },
          );
          if (!res.data.dismissed) {
            dispatch(addBannerNotification(notification));
            dispatch(newNotificationReceived(notification));
          }
        } catch (err) {
          if (err.response?.status === 403) {
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
        dispatch(addBannerNotification(notification));
        dispatch(newNotificationReceived(notification));
      }
    }
  });

  socket.on(
    "postCountsUpdated",
    ({ allPostsCount, myPostsCount, followingPostsCount }) => {
      dispatch(
        setPostCounts({ allPostsCount, myPostsCount, followingPostsCount }),
      );
    },
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
    debouncedGuestVisit(guest);
  });

  socket.on("showFeedbackPrompt", (data) => {
    dispatch(setFeedbackPrompt(data?.message || "We'd love your feedback!"));
  });

  socket.on("ads:update", (settings) => {
    dispatch(adsUpdatedRealtime(settings));
  });
};

// =============================================================================
// INITIALIZE SOCKET
// =============================================================================
export const initializeSocket = createAsyncThunk(
  "socket/initialize",
  async (_, { dispatch, getState }) => {
    const { user, isGuest } = getState().auth;
    let token = getToken();

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

    if (!isGuest && !userId) {
      return Promise.reject("User ID not available");
    }

    const socketUrl = getSocketUrl();

    const socket = io(socketUrl, {
      auth: { token: token || null },
      transports: ["polling", "websocket"], // polling first = more reliable with Cloudflare
      path: "/socket.io",
      reconnectionAttempts: MAX_RETRY_ATTEMPTS,
      reconnectionDelay: CONNECTION_RETRY_DELAY,
      timeout: 10000,
      withCredentials: true,
    });

    return new Promise((resolve, reject) => {
      socket.removeAllListeners();

      let connectionTimeout;

      socket.on("connect", async () => {
        if (connectionTimeout) clearTimeout(connectionTimeout);

        if (isGuest) {
          let guestId = localStorage.getItem("guestId");
          if (!guestId) {
            guestId = "guest_" + Math.random().toString(36).substring(2, 10);
            localStorage.setItem("guestId", guestId);
          }
          socket.emit("join", guestId);
        } else if (userId) {
          socket.emit("join", userId);
          const isAdmin = user?.role === "admin";
          if (isAdmin) socket.emit("join", "adminRoom");

          const fetchThunk = isAdmin
            ? fetchAllBannerNotifications
            : fetchActiveBannerNotifications;
          const region = user?.region ? { region: user.region } : {};

          try {
            const result = await dispatch(fetchThunk(region)).unwrap();
            if (result.length > 0) {
              const activeNotification = result.find(
                (notif) =>
                  notif.isActive &&
                  (!notif.expiresAt ||
                    new Date(notif.expiresAt) > new Date()) &&
                  (notif.region === "global" || notif.region === user.region) &&
                  !notif.dismissedBy?.includes(user._id),
              );
              if (activeNotification) {
                dispatch(newNotificationReceived(activeNotification));
              }
            }
          } catch (err) {
            console.error(
              "[socketSlice] Failed to fetch banner notifications:",
              err.message,
            );
          }
        }

        dispatch(fetchInitialPostCounts());
        setupEventListeners(socket, dispatch, getState);
        dispatch(setSocketInstance(socket));
        resolve(socket);
      });

      let lastToast = 0;
      socket.on("connect_error", (err) => {
        if (connectionTimeout) clearTimeout(connectionTimeout);

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
          `🌀 Reconnection attempt ${attemptNumber}/${MAX_RETRY_ATTEMPTS}...`,
        );
      });

      socket.on("disconnect", (reason) => {
        log(`[socketSlice] 🔌 Socket disconnected: ${reason}`);
        dispatch(setDisconnected());
      });

      connectionTimeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error("Connection timeout"));
      }, 15000);
    });
  },
);

// =============================================================================
// DISCONNECT SOCKET
// =============================================================================
export const disconnectSocket = createAsyncThunk(
  "socket/disconnect",
  async (_, { dispatch, getState }) => {
    const socket = getState().socket.socketInstance;
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      dispatch(setDisconnected());
    }
  },
);

// =============================================================================
// SLICE
// =============================================================================
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
      state.status = "error";
    },
    setOnlineUsersCount(state, action) {
      state.onlineUsersCount = Number(action.payload) || 0;
    },
    setUserStatus(state, action) {
      const { userId, isOnline } = action.payload;
      state.userStatus = { ...state.userStatus, [userId]: { isOnline } };
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
      )
        return;

      if (state.userLocations.length >= MAX_USER_LOCATIONS) {
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
      state.postCounts = { ...state.postCounts, ...action.payload };
    },
    addGuestVisit(state, action) {
      const newGuest = action.payload;
      const existingGuest = state.guestVisits.find(
        (g) => g.guestId === newGuest.guestId,
      );

      if (existingGuest) {
        const sameVisit =
          newGuest.visitCount === existingGuest.visitCount &&
          new Date(newGuest.lastVisit).getTime() ===
            new Date(existingGuest.lastVisit).getTime();
        if (sameVisit) return;
        state.guestVisits = state.guestVisits.map((g) =>
          g.guestId === newGuest.guestId ? newGuest : g,
        );
      } else {
        state.guestVisits.unshift(newGuest);
        if (state.guestVisits.length > MAX_GUEST_VISITS) {
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
  }),
);

export default socketSlice.reducer;
