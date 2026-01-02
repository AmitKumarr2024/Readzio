import express from "express";
import {
  getAdsSettings,
  patchAdsSettings,
  getAdsRuntime,
  getAdsHealth,
} from "../Controllers/adsController.js";

import { protectedRoute } from "../Middlewares/authMiddleware.js";
import { adminOnly } from "../Middlewares/AdminMiddleware.js";

const router = express.Router();

/* ---------- PUBLIC ---------- */
router.get("/", getAdsSettings);
router.get("/health", getAdsHealth);

/* ---------- RUNTIME (USER AWARE) ---------- */
router.get("/runtime", protectedRoute, getAdsRuntime);

/* ---------- ADMIN ---------- */
router.patch("/", protectedRoute, adminOnly, patchAdsSettings);

export default router;
