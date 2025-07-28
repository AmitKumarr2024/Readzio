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
import { fetchBannerNotifications } from "./adminSlice";
import {toast} from "react-hot-toast";

const isDev = import.meta.env.MODE === "development";
const MAX_USER_LOCATIONS = 500;
const MAX_GUEST_VISITS = 100;

const log = (...args) => {
  const [first] = args;
  if (
    first instanceof Error ||
    (typeof first === "string" && first.toLowerCase().includes("error"))
  ) {
    console.error(...args);
  }
};

const debouncedLocationHandler = debounce((dispatch, location) => {
  dispatch(addUserLocation(location));
}, 1000);

export const fetchActiveNotifications = createAsyncThunk(
  "socket/fetchActiveNotifications",
  async (_, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      log("[socketSlice] Fetching notifications for user:", user?._id);
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

      log("[socketSlice] Active notification:", activeNotification);
      return activeNotification || null;
    } catch (err) {
      console.error(
        "[socketSlice] fetchActiveNotifications Error:",
        err.message
      );
      return rejectWithValue(err.message || "Failed to fetch notifications");
    }
  }
);

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

export const initializeSocket = createAsyncThunk(
  "socket/initialize",
  async (_, { dispatch, getState }) => {
    log("[socketSlice] Initializing socket...");
    const { user, isGuest } = getState().auth;
    let token = getToken();

    // Skip auth and post counts for guests
    if (!token && !user?._id && isGuest) {
      log("[socketSlice] Guest user, skipping join/postCounts");
    } else if (!token) {
      // fallback: try checking auth
      try {
        await dispatch(checkAuth()).unwrap();
        token = getToken();
      } catch (err) {
        console.warn("[socketSlice] checkAuth failed:", err.message);
      }
    }

    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:8001", {
      auth: { token: token || null },
      transports: ["websocket"],
      path: "/socket.io",
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    return new Promise((resolve, reject) => {
      socket.removeAllListeners();

      socket.on("connect", () => {
        const userId = getState().auth.user?._id?.toString();
        const isGuest = getState().auth?.isGuest;

        if (!isGuest && userId) {
          socket.emit("join", userId);
          socket.emit("join", "adminRoom");
          dispatch(fetchInitialPostCounts());
        }

        dispatch(setSocketInstance(socket));
        resolve(socket);
      });

      socket.on("connect_error", (err) => {
        dispatch(setError(err.message));
        console.error("Socket Connect Error:", err.message);
        toast.error("🚨 Can't connect to server. Please try again.");
        reject(err);
      });

      socket.on("disconnect", (reason) => {
        dispatch(setDisconnected());
      });

      socket.off("onlineUsersCount").on("onlineUsersCount", (count) => {
        dispatch(setOnlineUsersCount(count));
      });

      socket.off("newNotification").on("newNotification", (notification) => {
        const userId = getState().auth.user?._id?.toString();
        if (notification?.user?.toString() === userId) {
          dispatch(addNotification(notification));
          dispatch(newNotificationReceived(notification));
          dispatch(setNotificationDismissReason("deactivated"));
        }
      });

      socket.off("updateUnreadCount").on("updateUnreadCount", ({ count }) => {
        dispatch(updateUnreadCount(count));
      });

      socket.off("userStatus").on("userStatus", ({ userId, isOnline }) => {
        dispatch(setUserStatus({ userId, isOnline }));
      });

      socket.off("userLocationUpdate").on("userLocationUpdate", (location) => {
        if (
          location?.userId &&
          location?.coordinates?.lat &&
          location?.coordinates?.lon
        ) {
          debouncedLocationHandler(dispatch, location);
        }
      });

      socket.off("newAppeal").on("newAppeal", (appeal) => {
        const isAdmin = getState().auth.user?.role === "admin";
        if (isAdmin) {
          dispatch(
            newNotificationReceived({
              _id: appeal.postId,
              message: `New appeal for post: ${appeal.postTitle}`,
              type: "appeal",
            })
          );
        }
      });

      socket
        .off("newBroadcastNotification")
        .on("newBroadcastNotification", (notification) => {
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
                console.error("Error checking dismissed status:", err.message);
              });
          }
        });

      socket
        .off("postCountsUpdated")
        .on(
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

      const handleDeactivationOrDismissal = ({ id }) => {
        const current = getState().socket.newNotification;
        if (current?._id === id) {
          dispatch(newNotificationReceived(null));
          dispatch(setNotificationDismissReason("deactivated"));
        }
        const isAdmin = getState().auth.user?.role === "admin";
        if (isAdmin) {
          dispatch(fetchBannerNotifications());
        }
      };

      socket
        .off("broadcastNotificationDismissed")
        .on("broadcastNotificationDismissed", handleDeactivationOrDismissal);
      socket
        .off("broadcastNotificationDeactivated")
        .on("broadcastNotificationDeactivated", handleDeactivationOrDismissal);

      socket
        .off("broadcastNotificationDeletedAll")
        .on("broadcastNotificationDeletedAll", () => {
          const isAdmin = getState().auth.user?.role === "admin";
          if (isAdmin) {
            dispatch(fetchBannerNotifications());
          }
        });

      socket
        .off("postBlockToggled")
        .on("postBlockToggled", ({ postId, blocked }) => {
          dispatch({
            type: "admin/updatePostBlockStatus",
            payload: { postId, blocked },
          });
          dispatch({
            type: "post/updateCurrentPostBlockedStatus",
            payload: { postId, blocked },
          });
        });

      const debouncedGuestVisit = debounce((guest, dispatch) => {
        log("[socketSlice] 🔵 [Debounced] Processing guestVisitUpdate:", {
          guestId: guest.guestId,
          visitCount: guest.visitCount,
          lastVisit: guest.lastVisit,
          timestamp: new Date().toISOString(),
        });
        dispatch(addGuestVisit(guest));
      }, 1000);

      socket.off("guestVisitUpdate").on("guestVisitUpdate", (guest) => {
        log("[socketSlice] 🔴 Received guestVisitUpdate:", {
          guestId: guest.guestId,
          visitCount: guest.visitCount,
          lastVisit: guest.lastVisit,
          timestamp: new Date().toISOString(),
        });
        debouncedGuestVisit(guest, dispatch);
      });
      socket.off("showFeedbackPrompt").on("showFeedbackPrompt", (data) => {
        log("[socketSlice] 💬 Received showFeedbackPrompt:", data);
        dispatch(
          setFeedbackPrompt(data?.message || "We'd love your feedback!")
        );
      });
    });
  }
);

export const disconnectSocket = createAsyncThunk(
  "socket/disconnect",
  async (_, { dispatch, getState }) => {
    const socket = getState().socket.socketInstance;
    if (socket) {
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
      state.status = "disconnected";
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
          log(
            `[addGuestVisit] Trimming guestVisits to ${MAX_GUEST_VISITS}, removing oldest entry`
          );
          state.guestVisits = state.guestVisits.slice(0, MAX_GUEST_VISITS);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveNotifications.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchActiveNotifications.fulfilled, (state, action) => {
        state.status = "connected";
        state.newNotification = action.payload;
      })
      .addCase(fetchActiveNotifications.rejected, (state, action) => {
        state.status = "disconnected";
        state.error = action.payload;
      })
      .addCase(fetchInitialPostCounts.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchInitialPostCounts.fulfilled, (state, action) => {
        state.status = "connected";
        state.postCounts = action.payload;
      })
      .addCase(fetchInitialPostCounts.rejected, (state, action) => {
        state.status = "disconnected";
        state.error = action.payload;
      })
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
