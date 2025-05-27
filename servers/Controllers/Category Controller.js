import CategoryModel from "../Models/category.js";
import { AppError } from "../utils/AppError.js";

// Get all categories
export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await CategoryModel.find().sort("name");
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(new AppError(error.message, 500, "getAllCategories Controller"));
  }
};

// Create new category
export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description } = req.body;

    if (!name || !slug) {
      throw new AppError("Name and slug are required", 400, "createCategory Controller");
    }

    const existing = await Category.findOne({ $or: [{ name }, { slug }] });
    if (existing) {
      throw new AppError("Category with this name or slug already exists", 400, "createCategory Controller");
    }

    const newCategory = new Category({ name, slug, description });
    await newCategory.save();

    res.status(201).json({ success: true, category: newCategory });
  } catch (error) {
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "createCategory Controller"));
    }
    next(error);
  }
};

// Update category by ID
export const updateCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const updates = req.body;

    const updatedCategory = await Category.findByIdAndUpdate(categoryId, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedCategory) {
      throw new AppError("Category not found", 404, "updateCategory Controller");
    }

    res.status(200).json({ success: true, category: updatedCategory });
  } catch (error) {
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "updateCategory Controller"));
    }
    next(error);
  }
};

// Delete category by ID
export const deleteCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const deleted = await Category.findByIdAndDelete(categoryId);

    if (!deleted) {
      throw new AppError("Category not found", 404, "deleteCategory Controller");
    }

    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    next(new AppError(error.message, 500, "deleteCategory Controller"));
  }
};
