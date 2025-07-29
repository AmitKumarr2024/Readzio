import mongoose from "mongoose";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import fs from "fs";
import path from "path";

// Loads GeoJSON data for location resolution
const geoJsonPath = path.resolve("servers/data/india-accurate.json");
let indiaGeoJSON = null;

try {
  if (fs.existsSync(geoJsonPath)) {
    indiaGeoJSON = JSON.parse(fs.readFileSync(geoJsonPath, "utf-8"));
  }
} catch (error) {
  // Handle GeoJSON loading errors gracefully
}

// Defines schema for user location data
const userLocationSchema = new mongoose.Schema({
  // User associated with the location
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Geospatial coordinates (GeoJSON Point)
  coordinates: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true,
    },
    coordinates: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
  },
  // City name
  city: {
    type: String,
    default: "Unknown",
  },
  // Country name
  country: {
    type: String,
    default: "Unknown",
  },
  // State name
  state: {
    type: String,
    default: "Unknown",
  },
  // Postal code
  pincode: {
    type: String,
    default: "Unknown",
  },
  // IP address
  ip: {
    type: String,
    default: "",
  },
  // Timestamp of location recording
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Creates geospatial index for coordinate queries
userLocationSchema.index({ coordinates: "2dsphere" });

// Resolves GeoJSON data for coordinates
userLocationSchema.statics.resolveGeoLocation = function (longitude, latitude) {
  if (!indiaGeoJSON || !indiaGeoJSON.features) {
    return { country: "Unknown", state: "Unknown", pincode: "Unknown" };
  }

  const userPoint = point([longitude, latitude]);
  for (const feature of indiaGeoJSON.features) {
    if (
      feature.geometry &&
      booleanPointInPolygon(userPoint, feature.geometry)
    ) {
      const properties = feature.properties || {};
      return {
        country: properties.Country || "India",
        state: properties.Circle || "Unknown",
        pincode: properties.Pincode || "Unknown",
      };
    }
  }
  return { country: "Unknown", state: "Unknown", pincode: "Unknown" };
};

// Pre-save hook to resolve country, state, and pincode from coordinates
userLocationSchema.pre("save", function (next) {
  if (this.coordinates && this.coordinates.coordinates) {
    const [longitude, latitude] = this.coordinates.coordinates;
    if (!longitude || !latitude || isNaN(longitude) || isNaN(latitude)) {
      this.country = "Unknown";
      this.state = "Unknown";
      this.pincode = "Unknown";
    } else {
      const geoData = this.constructor.resolveGeoLocation(longitude, latitude);
      this.country = geoData.country || this.country || "Unknown";
      this.state = geoData.state || this.state || "Unknown";
      this.pincode = geoData.pincode || this.pincode || "Unknown";
    }
  } else {
    this.country = "Unknown";
    this.state = "Unknown";
    this.pincode = "Unknown";
  }
  next();
});

// Creates and exports the UserLocation model
export default mongoose.models.UserLocation ||
  mongoose.model("UserLocation", userLocationSchema);
