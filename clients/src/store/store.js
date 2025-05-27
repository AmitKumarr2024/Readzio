// store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/authSlice';
import userReducer from '../store/userSlice'

const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
  },
});

export default store;
