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
} from "../Controllers/userController.js";
import upload from "../Middlewares/uploadImage.js";

const routes = new express.Router();

routes.get("/get-user", protectedRoute, getProfile);
routes.get("/get-single-user/:id", getSingleUserById);
routes.get("/get-all-user", protectedRoute, getAllUser);
routes.get("/activity/:id", protectedRoute, getUserActivity);
routes.get("/locations", protectedRoute, getAllUserLocations);
routes.post("/save-location", protectedRoute, saveUserLocation);
routes.patch(
  "/update-user",
  protectedRoute,
  upload.fields([{ name: "avatar" }, { name: "banner" }]),
  updateProfile
);
routes.delete("/delete-user", protectedRoute, deleteUser);
routes.delete("/activity/clear", protectedRoute, clearUserActivity);
routes.delete("/activity/clear-old", protectedRoute, clearOldActivity);

export default routes;