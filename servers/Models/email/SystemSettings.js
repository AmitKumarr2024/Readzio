import mongoose from "mongoose";

const systemSettingsSchema = new mongoose.Schema(
  {
    dailyDigestEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("SystemSettings", systemSettingsSchema);
