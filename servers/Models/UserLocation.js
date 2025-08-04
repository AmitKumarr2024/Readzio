import mongoose from "mongoose";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import { loadIndiaGeoJSON } from "../../servers/Utils/geoJsonCache.js";

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
      type: [Number], // [lng, lat]
      required: true,
    },
  },
  city: { type: String, default: "Unknown" },
  state: { type: String, default: "Unknown" },
  country: { type: String, default: "Unknown" },
  pincode: { type: String, default: "Unknown" },
  ip: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
});

userLocationSchema.index({ coordinates: "2dsphere" });

// Static method to resolve country/state/pincode from coordinates
userLocationSchema.statics.resolveGeoLocation = async function (
  longitude,
  latitude
) {
  const geoJSON = await loadIndiaGeoJSON();

  if (!geoJSON?.features) {
    return { country: "Unknown", state: "Unknown", pincode: "Unknown" };
  }

  const userPoint = point([longitude, latitude]);

  for (const feature of geoJSON.features) {
    if (
      feature.geometry &&
      booleanPointInPolygon(userPoint, feature.geometry)
    ) {
      const props = feature.properties || {};
      return {
        country: props.Country || "India",
        state: props.Circle || "Unknown",
        pincode: props.Pincode || "Unknown",
      };
    }
  }

  return { country: "Unknown", state: "Unknown", pincode: "Unknown" };
};

// Pre-save hook to resolve geolocation
userLocationSchema.pre("save", async function (next) {
  if (
    this.coordinates &&
    Array.isArray(this.coordinates.coordinates) &&
    this.coordinates.coordinates.length === 2
  ) {
    const [lng, lat] = this.coordinates.coordinates;

    if (isNaN(lng) || isNaN(lat)) {
      this.country = "Unknown";
      this.state = "Unknown";
      this.pincode = "Unknown";
      return next();
    }

    try {
      const geo = await this.constructor.resolveGeoLocation(lng, lat);
      this.country = geo.country;
      this.state = geo.state;
      this.pincode = geo.pincode;
    } catch (err) {
      console.error("[GeoResolve Error]", err.message);
    }
  } else {
    this.country = "Unknown";
    this.state = "Unknown";
    this.pincode = "Unknown";
  }

  next();
});

export default mongoose.models.UserLocation ||
  mongoose.model("UserLocation", userLocationSchema);
