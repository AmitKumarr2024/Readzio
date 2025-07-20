import mongoose from "mongoose";

// Defines schema for tracking guest visits to posts
const guestVisitSchema = new mongoose.Schema(
  {
    // Post slug visited
    slug: { 
      type: String, 
      required: true 
    },
    // Visitor's IP address
    ip: String,
    // Visitor's user agent
    userAgent: String,
    // Timestamp of the visit
    visitedAt: { 
      type: Date, 
      default: Date.now 
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

// Creates and exports the GuestVisit model
const GuestVisitModel = mongoose.model("GuestVisit", guestVisitSchema);
export default GuestVisitModel;