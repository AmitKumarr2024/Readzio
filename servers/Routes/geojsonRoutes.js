import express from "express";
import { getIndiaBoundaryOnly } from "../Controllers/geojsonController.js";

const router = express.Router();

router.get("/india-border", getIndiaBoundaryOnly);

export default router;