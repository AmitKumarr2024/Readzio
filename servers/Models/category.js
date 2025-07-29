import mongoose from "mongoose";

// Defines schema for post categories
const categorySchema = new mongoose.Schema({
  // Category name, must be unique
  name: {
    type: String,
    required: [true, "Category name is required"],
    unique: true, // Creates index
    trim: true,
    minlength: [2, "Name must be at least 2 characters"],
    maxlength: [50, "Name cannot exceed 50 characters"],
  },
  // URL-friendly slug, must be unique
  slug: {
    type: String,
    required: [true, "Slug is required"],
    unique: true, // Creates index
    trim: true,
    lowercase: true,
    match: [
      /^[a-z0-9-]+$/,
      "Slug must be lowercase, alphanumeric, and contain only dashes",
    ],
  },
  // Optional category description
  description: {
    type: String,
    trim: true,
    maxlength: [200, "Description cannot exceed 200 characters"],
  },
  // Optional creator for user-generated categories
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null, // Null for predefined categories
  },
  // Timestamp of category creation
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Creates and exports the Category model
export const CategoryModel =
  mongoose.models.Category || mongoose.model("Category", categorySchema);
export default CategoryModel;
