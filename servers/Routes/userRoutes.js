import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
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
} from "../Controllers/userController.js";
import upload from "../Middlewares/uploadImage.js";

const routes = new express.Router();

// Protected routes for user operations
// GET /get-user - Fetches authenticated user's profile
routes.get("/get-user", protectedRoute, getProfile);
// GET /get-single-user/:id - Fetches a user by ID
routes.get("/get-single-user/:id", getSingleUserById);
// GET /get-all-user - Fetches all users
routes.get("/get-all-user", protectedRoute, getAllUser);
// GET /activity/:id - Fetches user activity
routes.get("/activity/:id", protectedRoute, getUserActivity);
// GET /locations - Fetches all user locations
routes.get("/locations", protectedRoute, getAllUserLocations);
// POST /save-location - Saves user location
routes.post("/save-location", protectedRoute, saveUserLocation);
// PATCH /update-user - Updates user profile with optional avatar/banner upload
routes.patch(
  "/update-user",
  protectedRoute,
  upload.fields([{ name: "avatar" }, { name: "banner" }]),
  updateProfile
);
// DELETE /delete-user - Deletes authenticated user
routes.delete("/delete-user", protectedRoute, deleteUser);
// DELETE /activity/clear - Clears user activity
routes.delete("/activity/clear", protectedRoute, clearUserActivity);
// DELETE /activity/clear-old - Clears old activity
routes.delete("/activity/clear-old", protectedRoute, clearOldActivity);
// POST /consent - Saves user cookie consent
routes.post("/consent", saveUserCookieConsent);

export default routes;