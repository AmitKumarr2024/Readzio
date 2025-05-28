import mongoose from "mongoose";

const subscribeSchema = new mongoose.Schema({
  subscriber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  subscribedToUser: {  // Agar user ko follow karna hai
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  subscribedToCategory: {  // Agar category ko subscribe karna hai
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Unique index: subscriber can follow a user only once (ignore nulls)
subscribeSchema.index(
  { subscriber: 1, subscribedToUser: 1 },
  {
    unique: true,
    partialFilterExpression: { subscribedToUser: { $ne: null } },
  }
);

// Unique index: subscriber can subscribe to a category only once (ignore nulls)
subscribeSchema.index(
  { subscriber: 1, subscribedToCategory: 1 },
  {
    unique: true,
    partialFilterExpression: { subscribedToCategory: { $ne: null } },
  }
);

const SubscribeModel = mongoose.model("Subscribe", subscribeSchema);

export default SubscribeModel;
