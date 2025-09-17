// servers/Models/Bounce.js
import mongoose from "mongoose";

const bounceSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  error: { type: String },
  status: {
    type: String,
    enum: ["permanent", "temporary"],
    default: "permanent",
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Bounce", bounceSchema);
