// models/category.js
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Category name is required"],
    unique: true, // Implicitly creates index
    trim: true,
    minlength: [2, "Name must be at least 2 characters"],
    maxlength: [50, "Name cannot exceed 50 characters"],
  },
  slug: {
    type: String,
    required: [true, "Slug is required"],
    unique: true, // Implicitly creates index
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, "Slug must be lowercase, alphanumeric, and contain only dashes"],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, "Description cannot exceed 200 characters"],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null, // Null for predefined categories, user ID for user-created ones
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Remove explicit indexes, as unique: true already creates them
// categorySchema.index({ name: 1 }); // Removed
// categorySchema.index({ slug: 1 }); // Removed

const CategoryModel = mongoose.model("Category", categorySchema);

export default CategoryModel;