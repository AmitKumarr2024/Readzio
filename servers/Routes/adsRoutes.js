import express from "express";

import {
  getAdsSettings,
  patchAdsSettings,
} from "../Controllers/adsController.js";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import { adminOnly } from "../Middlewares/AdminMiddleware.js";

const router = express.Router();

router.get("/", getAdsSettings);
router.patch("/", protectedRoute, adminOnly, patchAdsSettings);

export default router;
