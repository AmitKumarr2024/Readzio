import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import { geoLocationMiddleware } from "../Middlewares/geoLocationMiddleware.js";
import upload from "../Middlewares/uploadImage.js";

import {
  clearOldActivity,
  clearUserActivity,
  deleteUser,
  getAllUser,
  getProfile,
  getSingleUserById,
  getUserActivity,
  getAllUserLocations,
  updateProfile,
  saveUserLocation,
  saveUserCookieConsent,
  getIPLocation,
  trackIPLocation,
  shouldShowFeedbackPrompt,
  submitFeedback,
  getAllFeedbacks,
  adminSendFeedbackPrompt,
} from "../../servers/Controllers/userController.js";

const routes = new express.Router();

// 🔐 Protected user profile routes
routes.get("/get-user", protectedRoute, getProfile);
routes.get("/get-single-user/:id", getSingleUserById);
routes.get("/get-all-user", protectedRoute, getAllUser);

// 📍 Location tracking
routes.get("/locations", protectedRoute, getAllUserLocations);
routes.post("/save-location", protectedRoute, saveUserLocation);

// 🌐 IP-based geo location
routes.get("/ip-location", geoLocationMiddleware, getIPLocation);
routes.post(
  "/track-ip-location",
  protectedRoute,
  geoLocationMiddleware,
  trackIPLocation
);

// 🧾 Activity & profile
routes.get("/activity/:id", protectedRoute, getUserActivity);
routes.delete("/activity/clear", protectedRoute, clearUserActivity);
routes.delete("/activity/clear-old", protectedRoute, clearOldActivity);

// 🧑‍🎨 Profile update with image upload
routes.patch(
  "/update-user",
  protectedRoute,
  upload.fields([{ name: "avatar" }, { name: "banner" }]),
  updateProfile
);

// ❌ Account deletion
routes.delete("/delete-user", protectedRoute, deleteUser);

// 🍪 Cookie consent
routes.post("/consent", saveUserCookieConsent);

// ⭐ Feedback system
routes.get("/feedback/check", protectedRoute, shouldShowFeedbackPrompt);
routes.post("/feedback/submit", protectedRoute, submitFeedback);
routes.get("/feedback/all", protectedRoute, getAllFeedbacks); // 👈 Admin check should be inside controller

// ⭐ Admin can trigger feedback prompt manually to a user
routes.post(
  "/feedback/manual/:userId",
  protectedRoute,
  adminSendFeedbackPrompt
);
export default routes;
