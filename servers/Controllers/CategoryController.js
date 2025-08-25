import CategoryModel from "../Models/category.js";
import PostModel from "../Models/Post.js"; // Fixed path - removed "../../servers/"
import UserModel from "../Models/User.js"; // Fixed path - removed "../../servers/"
import { AppError } from "../Utils/AppError.js"; // Fixed path - removed "../../servers/"

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

// Seeds predefined categories if they don't exist
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
    next(
      new AppError(
        error.message,
        500,
        "SeedCategories",
        "Failed to seed categories"
      )
    );
  }
};

// Retrieves all categories, sorted by name
export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await CategoryModel.find().sort("name");
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(
      new AppError(
        error.message,
        500,
        "GetAllCategories",
        "Failed to fetch categories"
      )
    );
  }
};

// Gets categories assigned to the logged-in user
export const getUserSelectedCategories = async (req, res, next) => {
  try {
    const userId = req.user._id; // From auth middleware

    // Validates user existence and populates categories
    const user = await UserModel.findById(userId).populate({
      path: "categories",
      strictPopulate: false,
    });

    if (!user) {
      return next(
        new AppError(
          "User not found",
          404,
          "GetUserSelectedCategories",
          "User does not exist"
        )
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
            "GetUserSelectedCategories",
            "Failed to fetch user categories"
          )
    );
  }
};

// Creates a new category
export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description } = req.body;

    // Validates required fields
    if (!name || !slug) {
      return next(
        new AppError(
          "Name and slug are required",
          400,
          "CreateCategory",
          "Missing required fields"
        )
      );
    }

    // Checks for existing category by name or slug
    const existing = await CategoryModel.findOne({ $or: [{ name }, { slug }] });
    if (existing) {
      return next(
        new AppError(
          "Category with this name or slug already exists",
          400,
          "CreateCategory",
          "Category already exists"
        )
      );
    }

    const newCategory = new CategoryModel({
      name,
      slug,
      description,
      createdBy: req.user._id,
    });
    await newCategory.save();

    res.status(201).json({ success: true, category: newCategory });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "CreateCategory",
            "Failed to create category"
          )
    );
  }
};

// Updates an existing category by ID
export const updateCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const updates = req.body;

    // Validates category ID format (if using MongoDB ObjectId)
    if (!categoryId || categoryId.length !== 24) {
      return next(
        new AppError(
          "Invalid category ID format",
          400,
          "UpdateCategory",
          "Invalid ID"
        )
      );
    }

    // If updating name or slug, check for duplicates
    if (updates.name || updates.slug) {
      const duplicateQuery = [];
      if (updates.name) duplicateQuery.push({ name: updates.name });
      if (updates.slug) duplicateQuery.push({ slug: updates.slug });

      const existing = await CategoryModel.findOne({
        $and: [
          { _id: { $ne: categoryId } }, // Exclude current category
          { $or: duplicateQuery },
        ],
      });

      if (existing) {
        return next(
          new AppError(
            "Category with this name or slug already exists",
            400,
            "UpdateCategory",
            "Duplicate category"
          )
        );
      }
    }

    // Updates category with validation
    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      categoryId,
      updates,
      { new: true, runValidators: true }
    );

    // Checks if category exists
    if (!updatedCategory) {
      return next(
        new AppError(
          "Category not found",
          404,
          "UpdateCategory",
          "Category does not exist"
        )
      );
    }

    res.status(200).json({ success: true, category: updatedCategory });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "UpdateCategory",
            "Failed to update category"
          )
    );
  }
};

// Deletes a category by ID
export const deleteCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    // Validates category ID format
    if (!categoryId || categoryId.length !== 24) {
      return next(
        new AppError(
          "Invalid category ID format",
          400,
          "DeleteCategory",
          "Invalid ID"
        )
      );
    }

    // Checks if category exists first
    const category = await CategoryModel.findById(categoryId);
    if (!category) {
      return next(
        new AppError(
          "Category not found",
          404,
          "DeleteCategory",
          "Category does not exist"
        )
      );
    }

    // Checks if category is assigned to any users
    const usersWithCategory = await UserModel.find({ categories: categoryId });
    if (usersWithCategory.length > 0) {
      return next(
        new AppError(
          "Cannot delete category as it is assigned to one or more users",
          400,
          "DeleteCategory",
          "Category is in use"
        )
      );
    }

    // Checks if category is assigned to any posts (optional check)
    const postsWithCategory = await PostModel.find({ category: categoryId });
    if (postsWithCategory.length > 0) {
      return next(
        new AppError(
          "Cannot delete category as it is assigned to one or more posts",
          400,
          "DeleteCategory",
          "Category is in use by posts"
        )
      );
    }

    // Deletes category
    await CategoryModel.findByIdAndDelete(categoryId);

    res
      .status(200)
      .json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "DeleteCategory",
            "Failed to delete category"
          )
    );
  }
};

// Assigns categories to a user, including creating new ones
export const assignCategoriesToUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { categoryIds, newCategories } = req.body;

    // Validates user ID format
    if (!userId || userId.length !== 24) {
      return next(
        new AppError(
          "Invalid user ID format",
          400,
          "AssignCategoriesToUser",
          "Invalid user ID"
        )
      );
    }

    // Validates user existence
    const user = await UserModel.findById(userId);
    if (!user) {
      return next(
        new AppError(
          "User not found",
          404,
          "AssignCategoriesToUser",
          "User does not exist"
        )
      );
    }

    // Validates category IDs
    if (
      !categoryIds ||
      !Array.isArray(categoryIds) ||
      categoryIds.length === 0
    ) {
      return next(
        new AppError(
          "At least one category ID is required",
          400,
          "AssignCategoriesToUser",
          "Missing or invalid category IDs"
        )
      );
    }

    // Validates existing category IDs
    const validCategories = await CategoryModel.find({
      _id: { $in: categoryIds },
    });
    if (validCategories.length !== categoryIds.length) {
      return next(
        new AppError(
          "One or more category IDs are invalid",
          400,
          "AssignCategoriesToUser",
          "Invalid category IDs"
        )
      );
    }

    let finalCategoryIds = [...categoryIds];

    // Processes new categories if provided
    if (
      newCategories &&
      Array.isArray(newCategories) &&
      newCategories.length > 0
    ) {
      for (const { name, slug, description } of newCategories) {
        // Validates required fields for new categories
        if (!name || !slug) {
          return next(
            new AppError(
              "Name and slug are required for new categories",
              400,
              "AssignCategoriesToUser",
              "Missing required fields for new category"
            )
          );
        }

        // Checks for existing category by name or slug
        const existing = await CategoryModel.findOne({
          $or: [{ name }, { slug }],
        });
        if (existing) {
          return next(
            new AppError(
              `Category '${name}' or slug '${slug}' already exists`,
              400,
              "AssignCategoriesToUser",
              "Category already exists"
            )
          );
        }

        const newCategory = new CategoryModel({
          name,
          slug,
          description,
          createdBy: req.user._id,
        });
        await newCategory.save();
        finalCategoryIds.push(newCategory._id);
      }
    }

    // Assigns unique category IDs to user
    user.categories = [...new Set(finalCategoryIds.map((id) => id.toString()))];
    await user.save();

    const updatedUser = await UserModel.findById(userId).populate("categories");
    res.status(200).json({ success: true, categories: updatedUser.categories });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "AssignCategoriesToUser",
            "Failed to assign categories"
          )
    );
  }
};

// Checks availability of a slug for posts or categories
export const checkSlugAvailability = async (req, res, next) => {
  try {
    const { slug, type } = req.query;

    // Validates required query parameters
    if (!slug || !type) {
      return next(
        new AppError(
          "Slug and type are required",
          400,
          "CheckSlugAvailability",
          "Missing required fields"
        )
      );
    }

    // Validates slug format (basic validation)
    if (!/^[a-z0-9-]+$/i.test(slug)) {
      return next(
        new AppError(
          "Invalid slug format. Only letters, numbers, and hyphens allowed",
          400,
          "CheckSlugAvailability",
          "Invalid slug format"
        )
      );
    }

    let existing;

    // Checks slug based on type
    if (type === "post") {
      existing = await PostModel.findOne({ slug });
    } else if (type === "category") {
      existing = await CategoryModel.findOne({ slug });
    } else {
      return next(
        new AppError(
          "Invalid type. Must be 'post' or 'category'",
          400,
          "CheckSlugAvailability",
          "Invalid type parameter"
        )
      );
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
        : new AppError(
            error.message,
            500,
            "CheckSlugAvailability",
            "Failed to check slug availability"
          )
    );
  }
};
