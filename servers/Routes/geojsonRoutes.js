import express from "express";
import { getIndiaBoundaryOnly } from "../Controllers/geojsonController.js";

const router = express.Router();

// Public route
// GET /india-border - Fetches India boundary GeoJSON
router.get("/india-border", getIndiaBoundaryOnly);

export default router;