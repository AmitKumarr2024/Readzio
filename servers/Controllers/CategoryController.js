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

export const seedCategories = async (req, res, next) => {
  try {
    console.log("[seedCategories] STARTED");

    const seededCategories = [];
    console.log(
      "[seedCategories] Step 1: Starting loop through predefined categories"
    );

    for (const cat of predefinedCategories) {
      console.log(
        "[seedCategories] Checking for existing category with slug:",
        cat.slug
      );
      const existing = await CategoryModel.findOne({ slug: cat.slug });
      if (!existing) {
        console.log(
          "[seedCategories] No existing category found, creating new:",
          cat.name
        );
        const newCat = await new CategoryModel(cat).save();
        console.log(
          "[seedCategories] Successfully created category ID:",
          newCat._id
        );
        seededCategories.push(newCat);
      } else {
        console.log(
          "[seedCategories] Category already exists, skipping:",
          cat.name
        );
      }
    }

    console.log(
      "[seedCategories] SUCCESS: Seeding complete, seeded count:",
      seededCategories.length
    );
    res.status(200).json({
      success: true,
      message: "Predefined categories seeded",
      seeded: seededCategories.length,
    });
  } catch (error) {
    console.error("[seedCategories] ERROR CAUGHT:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Full error:", error);
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

export const getAllCategories = async (req, res, next) => {
  try {
    console.log("[getAllCategories] STARTED");

    console.log("[getAllCategories] Step 1: Querying all categories from DB");
    const categories = await CategoryModel.find().sort("name");

    console.log(
      "[getAllCategories] SUCCESS: Found categories count:",
      categories.length
    );
    res.status(200).json({
      success: true,
      count: categories.length,
      categories: Array.isArray(categories) ? categories : [],
    });
  } catch (error) {
    console.error("[getAllCategories] ERROR CAUGHT:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Full error:", error);
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

export const getUserSelectedCategories = async (req, res, next) => {
  try {
    console.log(
      "[getUserSelectedCategories] STARTED - Auth user ID:",
      req.user?._id
    );

    const userId = req.user._id;
    console.log(
      "[getUserSelectedCategories] Step 1: Finding user by ID and populating categories"
    );
    const user = await UserModel.findById(userId).populate({
      path: "categories",
      strictPopulate: false,
    });

    if (!user) {
      console.log("[getUserSelectedCategories] User not found in DB");
      return next(
        new AppError(
          "User not found",
          404,
          "GetUserSelectedCategories",
          "User does not exist"
        )
      );
    }

    console.log(
      "[getUserSelectedCategories] SUCCESS: User found, selected categories count:",
      user.categories?.length || 0
    );
    res.status(200).json({
      success: true,
      count: user.categories?.length || 0,
      categories: Array.isArray(user.categories) ? user.categories : [],
    });
  } catch (error) {
    console.error("[getUserSelectedCategories] ERROR CAUGHT:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Full error:", error);
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

export const createCategory = async (req, res, next) => {
  try {
    console.log("[createCategory] STARTED - Request body:", req.body);

    const { name, slug, description } = req.body;

    console.log(
      "[createCategory] Step 1: Validating required fields (name & slug)"
    );
    if (!name || !slug) {
      console.log("[createCategory] Validation failed: missing name or slug");
      return next(
        new AppError(
          "Name and slug are required",
          400,
          "CreateCategory",
          "Missing required fields"
        )
      );
    }

    console.log("[createCategory] Step 2: Validating slug format");
    if (!/^[a-z0-9-]+$/i.test(slug)) {
      console.log("[createCategory] Validation failed: invalid slug format");
      return next(
        new AppError(
          "Invalid slug format. Only letters, numbers, and hyphens allowed",
          400,
          "CreateCategory",
          "Invalid slug format"
        )
      );
    }

    console.log("[createCategory] Step 3: Checking for duplicate name or slug");
    const existing = await CategoryModel.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, "i") } },
        { slug: slug.toLowerCase() },
      ],
    });

    if (existing) {
      console.log(
        "[createCategory] Duplicate found - Existing category ID:",
        existing._id
      );
      return next(
        new AppError(
          "Category with this name or slug already exists",
          400,
          "CreateCategory",
          "Category already exists"
        )
      );
    }

    console.log("[createCategory] Step 4: Creating new category document");
    const newCategory = new CategoryModel({
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      description: description?.trim() || "",
      createdBy: req.user?._id,
    });

    console.log("[createCategory] Step 5: Saving new category to DB");
    await newCategory.save();
    console.log(
      "[createCategory] SUCCESS: Category created - New ID:",
      newCategory._id
    );

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: newCategory,
    });
  } catch (error) {
    console.error("[createCategory] ERROR CAUGHT:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Full error:", error);
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

export const updateCategory = async (req, res, next) => {
  try {
    console.log(
      "[updateCategory] STARTED - Params:",
      req.params,
      "- Body:",
      req.body
    );

    const { categoryId } = req.params;
    const updates = req.body;

    console.log("[updateCategory] Step 1: Validating categoryId format");
    if (!categoryId || !/^[a-f\d]{24}$/i.test(categoryId)) {
      console.log(
        "[updateCategory] Validation failed: invalid categoryId format"
      );
      return next(
        new AppError(
          "Invalid category ID format",
          400,
          "UpdateCategory",
          "Invalid ID"
        )
      );
    }

    console.log("[updateCategory] Step 2: Finding existing category");
    const existingCategory = await CategoryModel.findById(categoryId);
    if (!existingCategory) {
      console.log("[updateCategory] Category not found");
      return next(
        new AppError(
          "Category not found",
          404,
          "UpdateCategory",
          "Category does not exist"
        )
      );
    }
    console.log(
      "[updateCategory] Existing category found:",
      existingCategory._id
    );

    console.log(
      "[updateCategory] Step 3: Checking for name/slug duplicates if updating"
    );
    if (updates.name || updates.slug) {
      const duplicateQuery = [];
      if (updates.name)
        duplicateQuery.push({
          name: { $regex: new RegExp(`^${updates.name}$`, "i") },
        });
      if (updates.slug)
        duplicateQuery.push({ slug: updates.slug.toLowerCase() });

      const duplicate = await CategoryModel.findOne({
        $and: [{ _id: { $ne: categoryId } }, { $or: duplicateQuery }],
      });

      if (duplicate) {
        console.log("[updateCategory] Duplicate found during update");
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

    console.log("[updateCategory] Step 4: Preparing clean updates");
    const cleanUpdates = {};
    if (updates.name) cleanUpdates.name = updates.name.trim();
    if (updates.slug) cleanUpdates.slug = updates.slug.toLowerCase().trim();
    if (updates.description !== undefined)
      cleanUpdates.description = updates.description.trim();

    console.log("[updateCategory] Step 5: Updating category in DB");
    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      categoryId,
      cleanUpdates,
      { new: true, runValidators: true }
    );

    console.log(
      "[updateCategory] SUCCESS: Category updated - ID:",
      updatedCategory._id
    );
    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("[updateCategory] ERROR CAUGHT:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Full error:", error);
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

export const deleteCategory = async (req, res, next) => {
  try {
    console.log(
      "[deleteCategory] STARTED - Category ID:",
      req.params.categoryId
    );

    const { categoryId } = req.params;

    console.log("[deleteCategory] Step 1: Validating categoryId format");
    if (!categoryId || !/^[a-f\d]{24}$/i.test(categoryId)) {
      console.log("[deleteCategory] Validation failed: invalid ID format");
      return next(
        new AppError(
          "Invalid category ID format",
          400,
          "DeleteCategory",
          "Invalid ID"
        )
      );
    }

    console.log("[deleteCategory] Step 2: Finding category");
    const category = await CategoryModel.findById(categoryId);
    if (!category) {
      console.log("[deleteCategory] Category not found");
      return next(
        new AppError(
          "Category not found",
          404,
          "DeleteCategory",
          "Category does not exist"
        )
      );
    }

    console.log(
      "[deleteCategory] Step 3: Checking if category assigned to users"
    );
    const usersWithCategory = await UserModel.countDocuments({
      categories: categoryId,
    });
    if (usersWithCategory > 0) {
      console.log(
        "[deleteCategory] Cannot delete: assigned to users count:",
        usersWithCategory
      );
      return next(
        new AppError(
          `Cannot delete category as it is assigned to ${usersWithCategory} user(s)`,
          400,
          "DeleteCategory",
          "Category is in use"
        )
      );
    }

    console.log(
      "[deleteCategory] Step 4: Checking if category assigned to posts"
    );
    const postsWithCategory = await PostModel.countDocuments({
      category: categoryId,
    });
    if (postsWithCategory > 0) {
      console.log(
        "[deleteCategory] Cannot delete: assigned to posts count:",
        postsWithCategory
      );
      return next(
        new AppError(
          `Cannot delete category as it is assigned to ${postsWithCategory} post(s)`,
          400,
          "DeleteCategory",
          "Category is in use by posts"
        )
      );
    }

    console.log("[deleteCategory] Step 5: Deleting category from DB");
    await CategoryModel.findByIdAndDelete(categoryId);

    console.log("[deleteCategory] SUCCESS: Category deleted");
    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("[deleteCategory] ERROR CAUGHT:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Full error:", error);
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

export const assignCategoriesToUser = async (req, res, next) => {
  try {
    console.log("[assignCategoriesToUser] STARTED");
    console.log("[assignCategoriesToUser] Request details:", {
      userId: req.params.userId,
      categoryIds: req.body.categoryIds,
      newCategories: req.body.newCategories,
      authUserId: req.user?._id,
    });

    const { userId } = req.params;
    const { categoryIds = [], newCategories = [] } = req.body;

    console.log("[assignCategoriesToUser] Step 1: Validating userId format");
    if (!userId || !/^[a-f\d]{24}$/i.test(userId)) {
      console.log("[assignCategoriesToUser] Invalid userId format");
      return next(
        new AppError(
          "Invalid user ID format",
          400,
          "AssignCategoriesToUser",
          "Invalid ID"
        )
      );
    }

    console.log("[assignCategoriesToUser] Step 2: Finding user in DB");
    const user = await UserModel.findById(userId);
    if (!user) {
      console.log("[assignCategoriesToUser] User not found");
      return next(
        new AppError(
          "User not found",
          404,
          "AssignCategoriesToUser",
          "User does not exist"
        )
      );
    }
    console.log("[assignCategoriesToUser] User found:", user._id);

    console.log(
      "[assignCategoriesToUser] Step 3: Validating at least one category provided"
    );
    if (
      (!Array.isArray(categoryIds) || categoryIds.length === 0) &&
      (!Array.isArray(newCategories) || newCategories.length === 0)
    ) {
      console.log("[assignCategoriesToUser] No categories provided");
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

    console.log(
      "[assignCategoriesToUser] Step 4: Processing existing categoryIds"
    );
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      console.log(
        "[assignCategoriesToUser] Received categoryIds:",
        categoryIds
      );

      const invalidIds = categoryIds.filter((id) => !/^[a-f\d]{24}$/i.test(id));
      if (invalidIds.length > 0) {
        console.log(
          "[assignCategoriesToUser] Invalid category ID formats:",
          invalidIds
        );
        return next(
          new AppError(
            "Invalid category ID format",
            400,
            "AssignCategoriesToUser",
            `Invalid IDs: ${invalidIds.join(", ")}`
          )
        );
      }

      console.log(
        "[assignCategoriesToUser] Querying DB for existing categories"
      );
      const validCategories = await CategoryModel.find({
        _id: { $in: categoryIds },
      });
      console.log(
        "[assignCategoriesToUser] Found existing categories count:",
        validCategories.length
      );

      if (validCategories.length !== categoryIds.length) {
        console.log("[assignCategoriesToUser] Some category IDs do not exist");
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
      console.log(
        "[assignCategoriesToUser] finalCategoryIds after existing:",
        finalCategoryIds
      );
    } else {
      console.log("[assignCategoriesToUser] No existing categoryIds");
    }

    console.log("[assignCategoriesToUser] Step 5: Processing newCategories");
    if (Array.isArray(newCategories) && newCategories.length > 0) {
      console.log(
        "[assignCategoriesToUser] Received newCategories:",
        newCategories
      );
      for (const categoryData of newCategories) {
        const { name, slug, description } = categoryData;
        console.log("[assignCategoriesToUser] Processing new category data:", {
          name,
          slug,
        });

        if (!name || !slug) {
          console.log(
            "[assignCategoriesToUser] Missing name or slug in new category"
          );
          return next(
            new AppError(
              "Each new category must have name and slug",
              400,
              "AssignCategoriesToUser",
              "Missing required fields"
            )
          );
        }

        if (!/^[a-z0-9-]+$/i.test(slug)) {
          console.log(
            "[assignCategoriesToUser] Invalid slug format in new category"
          );
          return next(
            new AppError(
              `Invalid slug format for category '${name}'`,
              400,
              "AssignCategoriesToUser",
              "Invalid slug format"
            )
          );
        }

        const exists = await CategoryModel.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${name}$`, "i") } },
            { slug: slug.toLowerCase() },
          ],
        });

        if (exists) {
          console.log(
            "[assignCategoriesToUser] New category already exists:",
            exists._id
          );
          return next(
            new AppError(
              `Category '${name}' already exists`,
              400,
              "AssignCategoriesToUser",
              "Duplicate category"
            )
          );
        }

        console.log("[assignCategoriesToUser] Creating new category");
        const category = await CategoryModel.create({
          name: name.trim(),
          slug: slug.toLowerCase().trim(),
          description: description?.trim() || "",
          createdBy: req.user._id,
        });
        console.log(
          "[assignCategoriesToUser] New category created ID:",
          category._id
        );

        finalCategoryIds.push(category._id.toString());
      }
    } else {
      console.log("[assignCategoriesToUser] No newCategories");
    }

    console.log(
      "[assignCategoriesToUser] Step 6: Deduping and assigning to user"
    );
    user.categories = [...new Set(finalCategoryIds.map((id) => id.toString()))];
    console.log(
      "[assignCategoriesToUser] Final assigned categories:",
      user.categories
    );

    console.log("[assignCategoriesToUser] Step 7: Saving user");
    await user.save();
    console.log("[assignCategoriesToUser] User saved successfully");

    console.log(
      "[assignCategoriesToUser] Step 8: Populating updated categories"
    );
    const updatedUser = await UserModel.findById(userId).populate({
      path: "categories",
      strictPopulate: false,
    });
    console.log(
      "[assignCategoriesToUser] Populated categories count:",
      updatedUser.categories?.length || 0
    );

    console.log("[assignCategoriesToUser] SUCCESS: Sending response");
    res.status(200).json({
      success: true,
      message: "Categories assigned successfully",
      count: updatedUser.categories?.length || 0,
      categories: updatedUser.categories || [],
    });
  } catch (error) {
    console.error("[assignCategoriesToUser] ERROR CAUGHT:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Full error:", error);
    next(
      new AppError(
        "Failed to assign categories to user",
        500,
        "AssignCategoriesToUser",
        error.message || "Unknown error"
      )
    );
  }
};

export const checkSlugAvailability = async (req, res, next) => {
  try {
    console.log("[checkSlugAvailability] STARTED - Query params:", req.query);

    const { slug, type } = req.query;

    console.log("[checkSlugAvailability] Step 1: Validating required params");
    if (!slug || !type) {
      console.log("[checkSlugAvailability] Missing slug or type");
      return next(
        new AppError(
          "Slug and type are required",
          400,
          "CheckSlugAvailability",
          "Missing required fields"
        )
      );
    }

    console.log("[checkSlugAvailability] Step 2: Validating slug format");
    if (!/^[a-z0-9-]+$/i.test(slug)) {
      console.log("[checkSlugAvailability] Invalid slug format");
      return next(
        new AppError(
          "Invalid slug format. Only letters, numbers, and hyphens allowed",
          400,
          "CheckSlugAvailability",
          "Invalid slug format"
        )
      );
    }

    const normalizedSlug = slug.toLowerCase().trim();
    let existing;

    console.log(
      "[checkSlugAvailability] Step 3: Checking slug in DB based on type:",
      type
    );
    if (type === "post") {
      existing = await PostModel.findOne({ slug: normalizedSlug });
    } else if (type === "category") {
      existing = await CategoryModel.findOne({ slug: normalizedSlug });
    } else {
      console.log("[checkSlugAvailability] Invalid type parameter");
      return next(
        new AppError(
          "Invalid type. Must be 'post' or 'category'",
          400,
          "CheckSlugAvailability",
          "Invalid type parameter"
        )
      );
    }

    console.log("[checkSlugAvailability] SUCCESS: Slug available?", !existing);
    res.status(200).json({
      success: true,
      isAvailable: !existing,
      slug: normalizedSlug,
      message: !existing ? "Slug is available" : "Slug is already taken",
    });
  } catch (error) {
    console.error("[checkSlugAvailability] ERROR CAUGHT:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Full error:", error);
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
