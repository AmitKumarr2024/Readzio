import mongoose from "mongoose";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import fs from "fs";
import path from "path";

const geoJsonPath = path.resolve("servers/data/india-accurate.json");
let indiaGeoJSON = null;

try {
  if (fs.existsSync(geoJsonPath)) {
    indiaGeoJSON = JSON.parse(fs.readFileSync(geoJsonPath, "utf-8"));
    console.log(
      `[GeoJSON] Loaded ${indiaGeoJSON.features.length} features from india-accurate.json`
    );
  } else {
    console.error("[GeoJSON] File not found:", geoJsonPath);
  }
} catch (error) {
  console.error("[GeoJSON] Error loading GeoJSON:", error.message);
}

const userLocationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  coordinates: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  city: {
    type: String,
    default: "Unknown",
  },
  country: {
    type: String,
    default: "Unknown",
  },
  state: {
    type: String,
    default: "Unknown",
  },
  pincode: {
    type: String,
    default: "Unknown",
  },
  ip: {
    type: String,
    default: "",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create geospatial index
userLocationSchema.index({ coordinates: "2dsphere" });

// Resolve GeoJSON data for coordinates
userLocationSchema.statics.resolveGeoLocation = function (longitude, latitude) {
  if (!indiaGeoJSON || !indiaGeoJSON.features) {
    console.error("[GeoJSON] indiaGeoJSON not loaded");
    return { country: "Unknown", state: "Unknown", pincode: "Unknown" };
  }

  const userPoint = point([longitude, latitude]);
  for (const feature of indiaGeoJSON.features) {
    if (
      feature.geometry &&
      booleanPointInPolygon(userPoint, feature.geometry)
    ) {
      const properties = feature.properties || {};
      console.log(
        `[GeoJSON] Matched coordinates [${longitude}, ${latitude}] to ${
          properties.Circle || "Unknown"
        }, ${properties.Pincode || "Unknown"}, ${properties.Country || "India"}`
      );
      return {
        country: properties.Country || "India",
        state: properties.Circle || "Unknown",
        pincode: properties.Pincode || "Unknown",
      };
    }
  }
  console.warn(
    `[GeoJSON] No match for coordinates [${longitude}, ${latitude}]`
  );
  return { country: "Unknown", state: "Unknown", pincode: "Unknown" };
};

// Pre-save hook to resolve country, state, and pincode
userLocationSchema.pre("save", function (next) {
  if (this.coordinates && this.coordinates.coordinates) {
    const [longitude, latitude] = this.coordinates.coordinates;
    if (!longitude || !latitude || isNaN(longitude) || isNaN(latitude)) {
      console.error(
        `[UserLocation] Invalid coordinates for userId=${this.userId}: [${longitude}, ${latitude}]`
      );
      this.country = "Unknown";
      this.state = "Unknown";
      this.pincode = "Unknown";
    } else {
      const geoData = this.constructor.resolveGeoLocation(longitude, latitude);
      this.country = geoData.country || this.country || "Unknown";
      this.state = geoData.state || this.state || "Unknown";
      this.pincode = geoData.pincode || this.pincode || "Unknown";
      console.log(
        `[UserLocation] Pre-save resolved for userId=${this.userId}: country=${this.country}, state=${this.state}, pincode=${this.pincode}`
      );
    }
  } else {
    console.error(
      `[UserLocation] Missing coordinates for userId=${this.userId}`
    );
    this.country = "Unknown";
    this.state = "Unknown";
    this.pincode = "Unknown";
  }
  next();
});

// Export model, checking if it already exists
export default mongoose.models.UserLocation || mongoose.model("UserLocation", userLocationSchema);