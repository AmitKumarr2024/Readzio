import mongoose from "mongoose";

const bounceSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: "Invalid email format",
    },
  },
  error: {
    type: String,
    maxlength: 1000,
    trim: true,
  },
  status: {
    type: String,
    enum: ["active", "suppressed", "resolved"],
    default: "active",
    index: true,
  },
  bounceType: {
    type: String,
    enum: ["hard", "soft", "spam", "reputation"],
    required: true,
    index: true,
  },
  bounceCount: {
    type: Number,
    default: 1,
    min: 1,
  },
  lastBounceAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-update timestamp
bounceSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  if (this.bounceType === "hard" && this.status !== "suppressed") {
    this.status = "suppressed";
  }
  next();
});

// Static method to check if email is suppressed
bounceSchema.statics.isEmailSuppressed = async function (email) {
  const bounce = await this.findOne({
    email: email.toLowerCase().trim(),
    status: "suppressed",
  });
  return !!bounce;
};

const Bounce = mongoose.model("Bounce", bounceSchema);
export default Bounce;
