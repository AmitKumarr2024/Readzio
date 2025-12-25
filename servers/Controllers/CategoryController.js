import CategoryModel from "../Models/category.js";
import PostModel from "../Models/Post.js";
import UserModel from "../Models/User.js";
import { AppError } from "../Utils/AppError.js";

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
    const seededCategories = [];
    for (const cat of predefinedCategories) {
      const existing = await CategoryModel.findOne({ slug: cat.slug });
      if (!existing) {
        const newCat = await new CategoryModel(cat).save();
        seededCategories.push(newCat);
      }
    }
    res.status(200).json({
      success: true,
      message: "Predefined categories seeded",
      seeded: seededCategories.length,
    });
  } catch (error) {
    next(
      new AppError(
        "Failed to seed categories",
        500,
        "SeedCategories",
        error.message
      )
    );
  }
};

// Retrieves all categories, sorted by name
export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await CategoryModel.find().sort("name");
    res.status(200).json({
      success: true,
      count: categories.length,
      categories: Array.isArray(categories) ? categories : [],
    });
  } catch (error) {
    next(
      new AppError(
        "Failed to fetch categories",
        500,
        "GetAllCategories",
        error.message
      )
    );
  }
};

// Gets categories assigned to the logged-in user
export const getUserSelectedCategories = async (req, res, next) => {
  try {
    const userId = req.user._id;

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

    res.status(200).json({
      success: true,
      count: user.categories?.length || 0,
      categories: Array.isArray(user.categories) ? user.categories : [],
    });
  } catch (error) {
    next(
      new AppError(
        "Failed to fetch user categories",
        500,
        "GetUserSelectedCategories",
        error.message
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

    // Validate slug format
    if (!/^[a-z0-9-]+$/i.test(slug)) {
      return next(
        new AppError(
          "Invalid slug format. Only letters, numbers, and hyphens allowed",
          400,
          "CreateCategory",
          "Invalid slug format"
        )
      );
    }

    // Checks for existing category by name or slug
    const existing = await CategoryModel.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, "i") } },
        { slug: slug.toLowerCase() },
      ],
    });

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
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      description: description?.trim() || "",
      createdBy: req.user?._id,
    });

    await newCategory.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: newCategory,
    });
  } catch (error) {
    next(
      new AppError(
        "Failed to create category",
        500,
        "CreateCategory",
        error.message
      )
    );
  }
};

// Updates an existing category by ID
export const updateCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const updates = req.body;

    // Validates category ID format
    if (!categoryId || !/^[a-f\d]{24}$/i.test(categoryId)) {
      return next(
        new AppError(
          "Invalid category ID format",
          400,
          "UpdateCategory",
          "Invalid ID"
        )
      );
    }

    // Check if category exists first
    const existingCategory = await CategoryModel.findById(categoryId);
    if (!existingCategory) {
      return next(
        new AppError(
          "Category not found",
          404,
          "UpdateCategory",
          "Category does not exist"
        )
      );
    }

    // If updating name or slug, check for duplicates
    if (updates.name || updates.slug) {
      const duplicateQuery = [];
      if (updates.name) {
        duplicateQuery.push({
          name: { $regex: new RegExp(`^${updates.name}$`, "i") },
        });
      }
      if (updates.slug) {
        duplicateQuery.push({ slug: updates.slug.toLowerCase() });
      }

      const duplicate = await CategoryModel.findOne({
        $and: [{ _id: { $ne: categoryId } }, { $or: duplicateQuery }],
      });

      if (duplicate) {
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

    // Clean the updates
    const cleanUpdates = {};
    if (updates.name) cleanUpdates.name = updates.name.trim();
    if (updates.slug) cleanUpdates.slug = updates.slug.toLowerCase().trim();
    if (updates.description !== undefined)
      cleanUpdates.description = updates.description.trim();

    // Updates category with validation
    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      categoryId,
      cleanUpdates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    next(
      new AppError(
        "Failed to update category",
        500,
        "UpdateCategory",
        error.message
      )
    );
  }
};

// Deletes a category by ID
export const deleteCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    // Validates category ID format
    if (!categoryId || !/^[a-f\d]{24}$/i.test(categoryId)) {
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
    const usersWithCategory = await UserModel.countDocuments({
      categories: categoryId,
    });

    if (usersWithCategory > 0) {
      return next(
        new AppError(
          `Cannot delete category as it is assigned to ${usersWithCategory} user(s)`,
          400,
          "DeleteCategory",
          "Category is in use"
        )
      );
    }

    // Checks if category is assigned to any posts
    const postsWithCategory = await PostModel.countDocuments({
      category: categoryId,
    });

    if (postsWithCategory > 0) {
      return next(
        new AppError(
          `Cannot delete category as it is assigned to ${postsWithCategory} post(s)`,
          400,
          "DeleteCategory",
          "Category is in use by posts"
        )
      );
    }

    // Deletes category
    await CategoryModel.findByIdAndDelete(categoryId);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(
      new AppError(
        "Failed to delete category",
        500,
        "DeleteCategory",
        error.message
      )
    );
  }
};

// Assigns categories to a user, including creating new ones
export const assignCategoriesToUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { categoryIds = [], newCategories = [] } = req.body;

    // Validate user ID
    if (!userId || !/^[a-f\d]{24}$/i.test(userId)) {
      return next(
        new AppError(
          "Invalid user ID format",
          400,
          "AssignCategoriesToUser",
          "Invalid ID"
        )
      );
    }

    // Find user
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

    // Validate input
    if (
      (!Array.isArray(categoryIds) || categoryIds.length === 0) &&
      (!Array.isArray(newCategories) || newCategories.length === 0)
    ) {
      return next(
        new AppError(
          "No categories provided",
          400,
          "AssignCategoriesToUser",
          "At least one category is required"
        )
      );
    }

    let finalCategoryIds = [];

    // Validate existing category IDs
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      // Validate all IDs are valid MongoDB ObjectIds
      const invalidIds = categoryIds.filter((id) => !/^[a-f\d]{24}$/i.test(id));
      if (invalidIds.length > 0) {
        return next(
          new AppError(
            "Invalid category ID format",
            400,
            "AssignCategoriesToUser",
            `Invalid IDs: ${invalidIds.join(", ")}`
          )
        );
      }

      // Check if all categories exist
      const validCategories = await CategoryModel.find({
        _id: { $in: categoryIds },
      });

      if (validCategories.length !== categoryIds.length) {
        return next(
          new AppError(
            "One or more category IDs do not exist",
            400,
            "AssignCategoriesToUser",
            "Invalid category IDs"
          )
        );
      }

      finalCategoryIds = [...categoryIds];
    }

    // Create new categories
    if (Array.isArray(newCategories) && newCategories.length > 0) {
      for (const categoryData of newCategories) {
        const { name, slug, description } = categoryData;

        // Validate required fields
        if (!name || !slug) {
          return next(
            new AppError(
              "Each new category must have name and slug",
              400,
              "AssignCategoriesToUser",
              "Missing required fields"
            )
          );
        }

        // Validate slug format
        if (!/^[a-z0-9-]+$/i.test(slug)) {
          return next(
            new AppError(
              `Invalid slug format for category '${name}'`,
              400,
              "AssignCategoriesToUser",
              "Invalid slug format"
            )
          );
        }

        // Check if category already exists
        const exists = await CategoryModel.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${name}$`, "i") } },
            { slug: slug.toLowerCase() },
          ],
        });

        if (exists) {
          return next(
            new AppError(
              `Category '${name}' already exists`,
              400,
              "AssignCategoriesToUser",
              "Duplicate category"
            )
          );
        }

        // Create new category
        const category = await CategoryModel.create({
          name: name.trim(),
          slug: slug.toLowerCase().trim(),
          description: description?.trim() || "",
          createdBy: req.user._id,
        });

        finalCategoryIds.push(category._id.toString());
      }
    }

    // Remove duplicates and assign to user
    user.categories = [...new Set(finalCategoryIds.map((id) => id.toString()))];
    await user.save();

    // Fetch updated user with populated categories
    const updatedUser = await UserModel.findById(userId).populate("categories");

    res.status(200).json({
      success: true,
      message: "Categories assigned successfully",
      count: updatedUser.categories?.length || 0,
      categories: updatedUser.categories || [],
    });
  } catch (error) {
    next(
      new AppError(
        "Failed to assign categories to user",
        500,
        "AssignCategoriesToUser",
        error.message
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

    // Validates slug format
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
    const normalizedSlug = slug.toLowerCase().trim();

    // Checks slug based on type
    if (type === "post") {
      existing = await PostModel.findOne({ slug: normalizedSlug });
    } else if (type === "category") {
      existing = await CategoryModel.findOne({ slug: normalizedSlug });
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
      slug: normalizedSlug,
      message: !existing ? "Slug is available" : "Slug is already taken",
    });
  } catch (error) {
    next(
      new AppError(
        "Failed to check slug availability",
        500,
        "CheckSlugAvailability",
        error.message
      )
    );
  }
};
