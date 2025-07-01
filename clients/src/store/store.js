import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../store/authSlice";
import userReducer from "../store/userSlice";
import postReducer from "../store/postSlice";
import postMetaReducer from "../store/Post/postMetaSlice";
import postInteractionReducer from "../store/Post interactions";
import followReducer from "../store/followSlice";
import subscriptionReducer from "../store/subscriptionSlice";
import categoriesReducer from "../store/categorySlice";
import analyticsReducer from "../store/analyticsSlice";
import blockReducer from "../store/blockSlice";
import achievementReducer from "../store/achievementSlice";
import bankReducer from "../store/bankSlice";
import commentReducer from "../store/commentSlice";
import suggestReducer from "../store/suggestedPostsSlice";
import adminReducer from "../store/adminSlice";
import notificationReducer from "../store/notificationSlice";
import socketReducer from "../store/socketSlice";
// import adsReducer from "../store/adsSlice";
import themeReducer from "../store/themeSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    post: postReducer,
    postMeta: postMetaReducer,
    postInteraction: postInteractionReducer,
    follow: followReducer,
    subscription: subscriptionReducer,
    categories: categoriesReducer,
    analytics: analyticsReducer,
    block: blockReducer,
    achievements: achievementReducer,
    banks: bankReducer,
    comment: commentReducer,
    suggestedPosts: suggestReducer,
    admin: adminReducer,
    notifications: notificationReducer,
    socket: socketReducer,
    // ads: adsReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: process.env.NODE_ENV !== "production" ? false : true,
    }),
});

console.log("Initial store state:", store.getState());
export default store;
