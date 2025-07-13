// controllers/categoryController.js
import CategoryModel from "../Models/category.js";
import PostModel from "../Models/Post.js";
import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";

// Predefined categories for seeding
const predefinedCategories = [
  {
    name: "Technology",
    slug: "technology",
    description: "Tech-related content",
  },
  {
    name: "Lifestyle",
    slug: "lifestyle",
    description: "Lifestyle and culture",
  },
  {
    name: "Education",
    slug: "education",
    description: "Learning and education",
  },
];

// Seed predefined categories
export const seedCategories = async (req, res, next) => {
  try {
    for (const cat of predefinedCategories) {
      const existing = await CategoryModel.findOne({ slug: cat.slug });
      if (!existing) {
        await new CategoryModel(cat).save();
      }
    }
    res
      .status(200)
      .json({ success: true, message: "Predefined categories seeded" });
  } catch (error) {
    next(new AppError(error.message, 500, "seedCategories Controller"));
  }
};

// Get all categories (for admin or category management)
export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await CategoryModel.find().sort("name");
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(new AppError(error.message, 500, "getAllCategories Controller"));
  }
};

// Get categories assigned to the logged-in user
export const getUserSelectedCategories = async (req, res, next) => {
  try {
    const userId = req.user._id; // From auth middleware
    const user = await UserModel.findById(userId).populate({
      path: "categories",
      strictPopulate: false,
    });
    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "getUserSelectedCategories Controller"
      );
    }
    res.status(200).json({ success: true, categories: user.categories });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "getUserSelectedCategories Controller"
          )
    );
  }
};

// Create new category
export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description } = req.body;

    if (!name || !slug) {
      throw new AppError(
        "Name and slug are required",
        400,
        "createCategory Controller"
      );
    }

    const existing = await CategoryModel.findOne({ $or: [{ name }, { slug }] }); // Fixed syntax error
    if (existing) {
      throw new AppError(
        "Category with this name or slug already exists",
        400,
        "createCategory Controller"
      );
    }

    const newCategory = new CategoryModel({
      name,
      slug,
      description,
      createdBy: req.user._id, // Track user who created the category
    });
    await newCategory.save();

    res.status(201).json({ success: true, category: newCategory });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "createCategory Controller")
    );
  }
};

// Update category by ID
export const updateCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const updates = req.body;

    // console.log("Update Payload:", updates); 

    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      categoryId,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      throw new AppError(
        "Category not found",
        404,
        "updateCategory Controller"
      );
    }

    res.status(200).json({ success: true, category: updatedCategory });
  } catch (error) {
    console.error("Update error:", error);
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "updateCategory Controller")
    );
  }
};

// Delete category by ID
export const deleteCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    // Check if category is assigned to any users
    const usersWithCategory = await UserModel.find({ categories: categoryId });
    if (usersWithCategory.length > 0) {
      throw new AppError(
        "Cannot delete category as it is assigned to one or more users",
        400,
        "deleteCategory Controller"
      );
    }

    const deleted = await CategoryModel.findByIdAndDelete(categoryId);

    if (!deleted) {
      throw new AppError(
        "Category not found",
        404,
        "deleteCategory Controller"
      );
    }

    res
      .status(200)
      .json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "deleteCategory Controller")
    );
  }
};

// controllers/categoryController.js (relevant part)
// controllers/categoryController.js (assignCategoriesToUser)
export const assignCategoriesToUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { categoryIds, newCategories } = req.body;
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "assignCategoriesToUser Controller"
      );
    }
    if (
      !categoryIds ||
      !Array.isArray(categoryIds) ||
      categoryIds.length === 0
    ) {
      throw new AppError(
        "At least one category ID is required",
        400,
        "assignCategoriesToUser Controller"
      );
    }
    const validCategories = await CategoryModel.find({
      _id: { $in: categoryIds },
    });
    if (validCategories.length !== categoryIds.length) {
      throw new AppError(
        "One or more category IDs are invalid",
        400,
        "assignCategoriesToUser Controller"
      );
    }
    if (
      newCategories &&
      Array.isArray(newCategories) &&
      newCategories.length > 0
    ) {
      for (const { name, slug, description } of newCategories) {
        if (!name || !slug) {
          throw new AppError(
            "Name and slug are required for new categories",
            400,
            "assignCategoriesToUser Controller"
          );
        }
        const existing = await CategoryModel.findOne({
          $or: [{ name }, { slug }],
        });
        if (existing) {
          throw new AppError(
            "New category with this name or slug already exists",
            400,
            "assignCategoriesToUser Controller"
          );
        }
        const newCategory = new CategoryModel({
          name,
          slug,
          description,
          createdBy: req.user._id,
        });
        await newCategory.save();
        categoryIds.push(newCategory._id);
      }
    }
    user.categories = [...new Set(categoryIds)];
    await user.save();
    const updatedUser = await UserModel.findById(userId).populate("categories");
    res.status(200).json({ success: true, categories: updatedUser.categories });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "assignCategoriesToUser Controller")
    );
  }
};


export const checkSlugAvailability = async (req, res, next) => {
  try {
    const { slug, type } = req.query;

    if (!slug || !type) {
      throw new AppError("Slug and type are required", 400, "checkSlugAvailability");
    }

    let existing;

    if (type === "post") {
      existing = await PostModel.findOne({ slug });
    } else if (type === "category") {
      existing = await CategoryModel.findOne({ slug });
    } else {
      throw new AppError("Invalid type. Must be 'post' or 'category'", 400, "checkSlugAvailability");
    }

    res.status(200).json({
      success: true,
      isAvailable: !existing,
      message: !existing ? "Slug is available" : "Slug is already taken",
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "checkSlugAvailability")
    );
  }
};
