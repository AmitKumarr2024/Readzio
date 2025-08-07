// GeoJSON from Firebase temporarily disabled to reduce memory usage
import mongoose from "mongoose";
// import axios from "axios";
// import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
// import { point } from "@turf/helpers";

// const INDIA_GEOJSON_URL = "https://demoapp-f7d71.web.app/india-accurate.json";

// 🛑 Prevent ReferenceError by declaring indiaGeoJSON, even if unused now
let indiaGeoJSON = null;

// // 🔄 Load India GeoJSON once at startup (disabled for low-memory environments)
// (async () => {
//   try {
//     const response = await axios.get(INDIA_GEOJSON_URL);
//     indiaGeoJSON = response.data;
//     console.log("✅ India GeoJSON loaded from Firebase.");
//   } catch (error) {
//     console.error("❌ Failed to fetch India GeoJSON from Firebase:", error.message);
//   }
// })();

// 📍 Defines schema for user location data
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
  city: { type: String, default: "Unknown" },
  country: { type: String, default: "Unknown" },
  state: { type: String, default: "Unknown" },
  pincode: { type: String, default: "Unknown" },
  ip: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
});

// 🗺️ Create geospatial index
userLocationSchema.index({ coordinates: "2dsphere" });

// 🌐 Resolve location using GeoJSON — currently disabled
userLocationSchema.statics.resolveGeoLocation = function (longitude, latitude) {
  if (!indiaGeoJSON || !indiaGeoJSON.features) {
    return { country: "Unknown", state: "Unknown", pincode: "Unknown" };
  }

  // Uncomment below if re-enabling GeoJSON logic:
  /*
  const userPoint = point([longitude, latitude]);
  for (const feature of indiaGeoJSON.features) {
    if (feature.geometry && booleanPointInPolygon(userPoint, feature.geometry)) {
      const props = feature.properties || {};
      return {
        country: props.Country || "India",
        state: props.Circle || "Unknown",
        pincode: props.Pincode || "Unknown",
      };
    }
  }
  */

  return { country: "Unknown", state: "Unknown", pincode: "Unknown" };
};

// ✅ Pre-save hook to enrich location (fallback to "Unknown")
userLocationSchema.pre("save", function (next) {
  if (this.coordinates?.coordinates) {
    const [lon, lat] = this.coordinates.coordinates;
    if (isNaN(lon) || isNaN(lat)) {
      this.country = "Unknown";
      this.state = "Unknown";
      this.pincode = "Unknown";
    } else {
      const geoData = this.constructor.resolveGeoLocation(lon, lat);
      this.country = geoData.country || "Unknown";
      this.state = geoData.state || "Unknown";
      this.pincode = geoData.pincode || "Unknown";
    }
  } else {
    this.country = "Unknown";
    this.state = "Unknown";
    this.pincode = "Unknown";
  }
  next();
});

// 📦 Export model
export default mongoose.models.UserLocation ||
  mongoose.model("UserLocation", userLocationSchema);
