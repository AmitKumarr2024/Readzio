// store.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../store/authSlice";
import userReducer from "../store/userSlice";
import postReducer from "../store/postSlice";
import postMetaReducer from "../store/Post/postMetaSlice";
import postInteractionReducer from "../store/Post interactions";
import subscribeReducer from "../store/subscribeSlice";
import membershipReducer from "../store/membershipSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    post: postReducer,
    postMeta: postMetaReducer,
    postInteraction: postInteractionReducer,
    subscribe: subscribeReducer,
    membershipPlan: membershipReducer,
  },
});

export default store;
