import mongoose from "mongoose";

// Defines schema for contact form submissions
const contactMessageSchema = new mongoose.Schema(
  {
    // Submitter's name
    name: { 
      type: String, 
      required: true 
    },
    // Submitter's email
    email: { 
      type: String, 
      required: true 
    },
    // Optional subject line
    subject: { 
      type: String 
    },
    // Message content
    message: { 
      type: String, 
      required: true 
    },
    // Indicates if the message has been handled
    isHandled: { 
      type: Boolean, 
      default: false 
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

// Creates and exports the ContactMessage model
export default mongoose.model("ContactMessage", contactMessageSchema);