
import { createSlice, createSelector } from '@reduxjs/toolkit';
import { io } from 'socket.io-client';
import { getToken } from '../Utils/getToken';
import { checkAuth } from './authSlice';
import { addNotification, updateUnreadCount } from './notificationSlice';

export let socketInstance = null;

const initialState = {
  status: 'disconnected',
  error: null,
  onlineUsersCount: 0,
  newNotification: null,
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    setConnected(state) {
      state.status = 'connected';
      state.error = null;
    },
    setDisconnected(state) {
      state.status = 'disconnected';
      state.newNotification = null;
    },
    setError(state, action) {
      state.error = action.payload;
      state.status = 'disconnected';
      state.newNotification = null;
    },
    setOnlineUsersCount(state, action) {
      state.onlineUsersCount = Number(action.payload) || 0;
    },
    newNotificationReceived(state, action) {
      state.newNotification = action.payload;
    },
  },
});

export const { setConnected, setDisconnected, setError, setOnlineUsersCount, newNotificationReceived } = socketSlice.actions;

export const selectSocketState = createSelector(
  [(state) => state.socket || {}],
  (socket) => ({
    isConnected: socket.status === 'connected',
    error: socket.error,
    onlineUsersCount: socket.onlineUsersCount,
    newNotification: socket.newNotification,
  })
);

export const initializeSocket = () => async (dispatch, getState) => {
  if (socketInstance?.connected) {
    return;
  }

  let token = getToken();
  if (!token) {
    try {
      await dispatch(checkAuth()).unwrap();
      token = getToken();
      if (!token) {
        dispatch(setError('No token found'));
        return;
      }
    } catch (err) {
      dispatch(setError('Authentication failed: ' + err.message));
      return;
    }
  }

  try {
    socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:8001', {
      auth: { token },
      transports: ['websocket'],
      path: '/socket.io',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      const userId = getState().auth.user?._id;
      if (userId) {
        socketInstance.emit('join', userId);
      }
      dispatch(setConnected());
    });

    socketInstance.on('disconnect', (reason) => {
      dispatch(setDisconnected());
    });

    socketInstance.on('connect_error', (err) => {
      dispatch(setError(err.message));
    });

    socketInstance.on('newNotification', (notification) => {
      const userId = getState().auth.user?._id?.toString();
      if (notification?.user?.toString() === userId) {
        dispatch(addNotification(notification));
        dispatch(newNotificationReceived(notification));
      }
    });

    socketInstance.on('updateUnreadCount', ({ count }) => {
      dispatch(updateUnreadCount(count));
    });

    socketInstance.on('onlineUsersCount', (count) => {
      dispatch(setOnlineUsersCount(count));
    });

    socketInstance.on('adEarningsUpdate', (data) => {
      // Handle ad earnings if needed
    });
  } catch (err) {
    dispatch(setError('Socket initialization failed: ' + err.message));
  }
};

export const disconnectSocket = () => (dispatch) => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    dispatch(setDisconnected());
  }
};

export default socketSlice.reducer;