import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import {
  deleteUser,
  getAllUser,
  getProfile,
  updateProfile,
} from "../Controllers/userController.js";
import upload from "../Middlewares/uploadImage.js";

const routes = new express.Router();

routes.get("/get-user", protectedRoute, getProfile);
routes.get("/get-all-user", protectedRoute, getAllUser);
routes.patch(
  "/update-user",
  protectedRoute,
  upload.single("avatar"),
  updateProfile
);
routes.delete("/delete-user", protectedRoute, deleteUser);

export default routes;
