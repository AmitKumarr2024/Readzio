import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0, // Stored in paise
    },
    postIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    durationDays: {
      type: Number,
      required: true,
      min: 1,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "not_confirmed", "deleted"],
      default: "not_confirmed",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    type: {
      type: String,
      enum: ["silver", "gold", "platinum", "custom"],
      default: "custom",
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique plan name per author
subscriptionPlanSchema.index({ author: 1, name: 1 }, { unique: true });

// Prevent multiple active plans per author
subscriptionPlanSchema.pre("save", async function (next) {
  if (this.status === "active") {
    const existingActivePlan = await mongoose
      .model("SubscriptionPlan")
      .findOne({
        author: this.author,
        status: "active",
        _id: { $ne: this._id },
      });
    if (existingActivePlan) {
      return next(new Error("An active plan already exists for this author."));
    }
  }
  next();
});

const SubscriptionPlanModel = mongoose.model(
  "SubscriptionPlan",
  subscriptionPlanSchema
);
export default SubscriptionPlanModel;
