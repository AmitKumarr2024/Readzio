import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import {
  checkAuth,
  googleLogin,
  Login,
  Logout,
  Signup,
} from "../Controllers/authController.js";

const routes = express.Router();

routes.post("/signup", Signup);
routes.post("/login", Login);
routes.post("/logout", Logout);
routes.get("/check", protectedRoute, checkAuth);
routes.post("/google-login", googleLogin);

export default routes;
