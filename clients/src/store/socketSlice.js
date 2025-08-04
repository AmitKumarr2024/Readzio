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
import { fetchBannerNotifications } from "./adminSlice";
import { toast } from "react-hot-toast";
import { debounce } from "lodash";

// Constants
const isDev = import.meta.env.MODE === "development";
const MAX_USER_LOCATIONS = 500;
const MAX_GUEST_VISITS = 100;
const EVENTS = {
  onlineUsersCount: "onlineUsersCount",
  newNotification: "newNotification",
  updateUnreadCount: "updateUnreadCount",
  userStatus: "userStatus",
  userLocationUpdate: "userLocationUpdate",
  newAppeal: "newAppeal",
  newBroadcastNotification: "newBroadcastNotification",
  postCountsUpdated: "postCountsUpdated",
  broadcastNotificationDismissed: "broadcastNotificationDismissed",
  broadcastNotificationDeactivated: "broadcastNotificationDeactivated",
  broadcastNotificationDeletedAll: "broadcastNotificationDeletedAll",
  postBlockToggled: "postBlockToggled",
  guestVisitUpdate: "guestVisitUpdate",
  showFeedbackPrompt: "showFeedbackPrompt",
};

// Helpers
const log = (...args) => {
  if (!isDev) return;
  const [first] = args;
  (first instanceof Error || String(first).toLowerCase().includes("error")
    ? console.error
    : console.log)(...args);
};

const removeSocketListeners = (socket, events) => {
  events.forEach((event) => socket.off(event));
  socket.removeAllListeners();
  socket.disconnect();
};

const createDebounced = () => ({
  location: debounce((dispatch, loc) => dispatch(addUserLocation(loc)), 1000),
  guestVisit: debounce((guest, dispatch) => {
    log("[addGuestVisit] Processing guest:", {
      guestId: guest.guestId,
      visitCount: guest.visitCount,
      lastVisit: guest.lastVisit,
    });
    dispatch(addGuestVisit(guest));
  }, 1000),
});

const { location: debouncedLocationHandler, guestVisit: debouncedGuestVisit } =
  createDebounced();

// Socket Listeners
const setupSocketListeners = (socket, dispatch, getState) => {
  socket.on(EVENTS.onlineUsersCount, (count) =>
    dispatch(setOnlineUsersCount(count))
  );
  socket.on(EVENTS.newNotification, (notification) => {
    const userId = getState().auth.user?._id?.toString();
    if (notification?.user?.toString() === userId) {
      dispatch(addNotification(notification));
      dispatch(newNotificationReceived(notification));
      dispatch(setNotificationDismissReason("deactivated"));
    }
  });
  socket.on(EVENTS.updateUnreadCount, ({ count }) =>
    dispatch(updateUnreadCount(count))
  );
  socket.on(EVENTS.userStatus, ({ userId, isOnline }) =>
    dispatch(setUserStatus({ userId, isOnline }))
  );
  socket.on(EVENTS.userLocationUpdate, (location) => {
    if (
      location?.userId &&
      location?.coordinates?.lat &&
      location?.coordinates?.lon
    ) {
      debouncedLocationHandler(dispatch, location);
    }
  });
  socket.on(EVENTS.newAppeal, (appeal) => {
    if (getState().auth.user?.role === "admin") {
      dispatch(
        newNotificationReceived({
          _id: appeal.postId,
          message: `New appeal for post: ${appeal.postTitle}`,
          type: "appeal",
        })
      );
    }
  });
  socket.on(EVENTS.newBroadcastNotification, (notification) => {
    const user = getState().auth?.user;
    if (
      notification.region === "global" ||
      notification.region === user?.region
    ) {
      axiosInstance
        .get(`/bannerNotification/dismissed/${notification._id}`, {
          withCredentials: true,
        })
        .then((res) => {
          if (!res.data.dismissed) {
            dispatch(newNotificationReceived(notification));
            dispatch(setNotificationDismissReason("deactivated"));
          }
        })
        .catch((err) => {
          if (err.response?.status === 403)
            log("⚠️ Admin not allowed to fetch banner dismissal status");
          else log("Error checking dismissed status:", err.message);
        });
    }
  });
  socket.on(
    EVENTS.postCountsUpdated,
    ({ allPostsCount, myPostsCount, followingPostsCount }) => {
      dispatch(
        setPostCounts({ allPostsCount, myPostsCount, followingPostsCount })
      );
    }
  );
  const handleDeactivationOrDismissal = ({ id }) => {
    const current = getState().socket.newNotification;
    if (current?._id === id) {
      dispatch(newNotificationReceived(null));
      dispatch(setNotificationDismissReason("deactivated"));
    }
    if (getState().auth.user?.role === "admin")
      dispatch(fetchBannerNotifications());
  };
  socket.on(
    EVENTS.broadcastNotificationDismissed,
    handleDeactivationOrDismissal
  );
  socket.on(
    EVENTS.broadcastNotificationDeactivated,
    handleDeactivationOrDismissal
  );
  socket.on(EVENTS.broadcastNotificationDeletedAll, () => {
    if (getState().auth.user?.role === "admin")
      dispatch(fetchBannerNotifications());
  });
  socket.on(EVENTS.postBlockToggled, ({ postId, blocked }) => {
    dispatch({
      type: "admin/updatePostBlockStatus",
      payload: { postId, blocked },
    });
    dispatch({
      type: "post/updateCurrentPostBlockedStatus",
      payload: { postId, blocked },
    });
  });
  socket.on(EVENTS.guestVisitUpdate, (guest) =>
    debouncedGuestVisit(guest, dispatch)
  );
  socket.on(EVENTS.showFeedbackPrompt, (data) =>
    dispatch(setFeedbackPrompt(data?.message || "We'd love your feedback!"))
  );
};

// Thunks
export const fetchActiveNotifications = createAsyncThunk(
  "socket/fetchActiveNotifications",
  async (_, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      if (!user?._id) throw new Error("User not authenticated");
      const response = await axiosInstance.get(
        "/bannerNotification/get-Notification",
        { withCredentials: true }
      );
      const notifications = response.data.notifications || [];
      const activeNotification = notifications.find(
        (notif) =>
          notif.isActive &&
          (!notif.expiresAt || new Date(notif.expiresAt) > new Date()) &&
          (notif.region === "global" || notif.region === user?.region) &&
          !notif.dismissedBy?.includes(user._id)
      );
      return activeNotification || null;
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to fetch notifications")
      );
    }
  }
);

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
      return rejectWithValue(extractError(err, "Failed to fetch post counts"));
    }
  }
);

export const initializeSocket = createAsyncThunk(
  "socket/initialize",
  async (_, { dispatch, getState }) => {
    const { user, isGuest } = getState().auth;
    let token = getToken();
    if (!token && !user?._id && isGuest) {
      log("[socketSlice] Guest user, skipping join/postCounts");
    } else if (!token) {
      await dispatch(checkAuth()).unwrap();
      token = getToken();
    }
    const userId = user?._id?.toString();
    if (!isGuest && !userId) throw new Error("User not ready");
    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:8001", {
      auth: { token: token || null },
      transports: ["websocket", "polling"],
      path: "/socket.io/",
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    return new Promise((resolve, reject) => {
      socket.on("connect", () => {
        if (!isGuest && userId) {
          socket.emit("join", userId);
          socket.emit("join", "adminRoom");
          dispatch(fetchInitialPostCounts());
        }
        dispatch(setSocketInstance(socket));
        setupSocketListeners(socket, dispatch, getState);
        resolve(socket);
      });
      let lastToast = 0;
      socket.on("connect_error", (err) => {
        const now = Date.now();
        if (now - lastToast > 10000) {
          toast.error("🚨 Can't connect to server. Please try again.");
          lastToast = now;
        }
        dispatch(setError(err.message));
        reject(err);
      });
      socket.io.on("reconnect_attempt", () => log("🌀 Trying to reconnect..."));
      socket.on("disconnect", () => dispatch(setDisconnected()));
    });
  }
);

export const disconnectSocket = createAsyncThunk(
  "socket/disconnect",
  async (_, { dispatch, getState }) => {
    const socket = getState().socket.socketInstance;
    if (socket) {
      removeSocketListeners(socket, Object.values(EVENTS));
      dispatch(setDisconnected());
    }
  }
);

// Error Helper
const extractError = (err, fallback = "Request failed") =>
  err?.response?.data?.message || err.message || fallback;

// Slice
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
    setFeedbackPrompt: (state, action) => {
      state.feedbackPrompt = action.payload;
    },
    setSocketInstance: (state, action) => {
      state.socketInstance = action.payload;
      state.status = action.payload?.connected ? "connected" : "disconnected";
      state.error = null;
    },
    setDisconnected: (state) => {
      state.socketInstance = null;
      state.status = "disconnected";
      state.error = null;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.status = "disconnected";
    },
    setOnlineUsersCount: (state, action) => {
      state.onlineUsersCount = Number(action.payload) || 0;
    },
    setUserStatus: (state, action) => {
      const { userId, isOnline } = action.payload;
      state.userStatus = { ...state.userStatus, [userId]: { isOnline } };
    },
    newNotificationReceived: (state, action) => {
      state.newNotification = action.payload;
    },
    addUserLocation: (state, action) => {
      const location = action.payload;
      if (
        !location?.userId ||
        !location?.coordinates?.lat ||
        !location?.coordinates?.lon
      )
        return;
      if (state.userLocations.length >= MAX_USER_LOCATIONS) {
        log("⚠️ Max user locations reached. Trimming oldest entries.");
        state.userLocations.shift();
      }
      state.userLocations = [
        ...state.userLocations.filter((loc) => loc.userId !== location.userId),
        location,
      ];
    },
    setNotificationDismissReason: (state, action) => {
      state.notificationDismissReason = action.payload;
    },
    setPostCounts: (state, action) => {
      state.postCounts = { ...state.postCounts, ...action.payload };
    },
    addGuestVisit: (state, action) => {
      const newGuest = action.payload;
      const existingGuest = state.guestVisits.find(
        (g) => g.guestId === newGuest.guestId
      );
      if (existingGuest) {
        const sameVisit =
          newGuest.visitCount === existingGuest.visitCount &&
          new Date(newGuest.lastVisit).getTime() ===
            new Date(existingGuest.lastVisit).getTime();
        if (sameVisit) return;
        state.guestVisits = state.guestVisits.map((g) =>
          g.guestId === newGuest.guestId ? newGuest : g
        );
      } else {
        state.guestVisits.unshift(newGuest);
        if (state.guestVisits.length > MAX_GUEST_VISITS) {
          log("⚠️ Max guest visits reached. Trimming oldest entries.");
          state.guestVisits = state.guestVisits.slice(0, MAX_GUEST_VISITS);
        }
      }
    },
  },
  extraReducers: (builder) => {
    const handleAsync = (thunk, onSuccess) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.status = "loading";
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.status = "connected";
          if (onSuccess) onSuccess(state, action);
        })
        .addCase(thunk.rejected, (state, action) => {
          state.status = "disconnected";
          state.error = action.payload || action.error?.message;
        });
    };
    handleAsync(fetchActiveNotifications, (state, action) => {
      state.newNotification = action.payload;
    });
    handleAsync(fetchInitialPostCounts, (state, action) => {
      state.postCounts = action.payload;
    });
    builder
      .addCase(initializeSocket.pending, (state) => {
        state.status = "connecting";
        state.error = null;
      })
      .addCase(initializeSocket.fulfilled, (state) => {
        state.status = "connected";
      })
      .addCase(initializeSocket.rejected, (state, action) => {
        state.status = "disconnected";
        state.error = action.error.message;
      })
      .addCase(disconnectSocket.fulfilled, (state) => {
        state.status = "disconnected";
        state.error = null;
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
    error: socket.error,
    onlineUsersCount: socket.onlineUsersCount,
    userStatus: socket.userStatus,
    newNotification: socket.newNotification,
    userLocations: socket.userLocations,
    notificationDismissReason: socket.notificationDismissReason,
    postCounts: socket.postCounts,
    guestVisits: socket.guestVisits,
  })
);

export default socketSlice.reducer;
