import mongoose from "mongoose";

const AdsSettingsSchema = new mongoose.Schema(
  {
    globalEnabled: {
      type: Boolean,
      default: true,
    },

    disableForAdmins: {
      type: Boolean,
      default: true,
    },

    placements: {
      card: { type: Boolean, default: true },
      inFeed: { type: Boolean, default: true },
      inArticle: { type: Boolean, default: true },
      multiplex: { type: Boolean, default: true },
      float: { type: Boolean, default: true },
      horizontal: { type: Boolean, default: true },
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("AdsSettings", AdsSettingsSchema);
