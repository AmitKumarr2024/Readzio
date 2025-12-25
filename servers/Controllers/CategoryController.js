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

import CategoryModel from "../Models/category.js";
import UserModel from "../Models/User.js";
import { AppError } from "../Utils/AppError.js";

export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description } = req.body;

    if (!name || !slug) {
      return next(new AppError("Name and slug are required", 400));
    }

    if (!/^[a-z0-9-]+$/i.test(slug)) {
      return next(
        new AppError(
          "Invalid slug format. Only letters, numbers, and hyphens allowed",
          400
        )
      );
    }

    const existing = await CategoryModel.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, "i") } },
        { slug: slug.toLowerCase() },
      ],
    });

    if (existing) {
      return next(
        new AppError("Category with this name or slug already exists", 409)
      );
    }

    const newCategory = await CategoryModel.create({
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      description: description?.trim() || "",
      createdBy: req.user?._id || null,
    });

    // 🔴 REQUIRED FIX — attach category to user
    if (req.user?._id) {
      await UserModel.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { categories: newCategory._id } },
        { new: true }
      );
    }

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: newCategory,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError("Category already exists", 409));
    }
    next(new AppError("Failed to create category", 500));
  }
};

// old code for createCategory
// export const createCategory = async (req, res, next) => {
//   try {
//     console.log("[createCategory] STARTED - Request body:", req.body);

//     const { name, slug, description } = req.body;

//     console.log(
//       "[createCategory] Step 1: Validating required fields (name & slug)"
//     );
//     if (!name || !slug) {
//       console.log("[createCategory] Validation failed: missing name or slug");
//       return next(
//         new AppError(
//           "Name and slug are required",
//           400,
//           "CreateCategory",
//           "Missing required fields"
//         )
//       );
//     }

//     console.log("[createCategory] Step 2: Validating slug format");
//     if (!/^[a-z0-9-]+$/i.test(slug)) {
//       console.log("[createCategory] Validation failed: invalid slug format");
//       return next(
//         new AppError(
//           "Invalid slug format. Only letters, numbers, and hyphens allowed",
//           400,
//           "CreateCategory",
//           "Invalid slug format"
//         )
//       );
//     }

//     console.log("[createCategory] Step 3: Checking for duplicate name or slug");
//     const existing = await CategoryModel.findOne({
//       $or: [
//         { name: { $regex: new RegExp(`^${name}$`, "i") } },
//         { slug: slug.toLowerCase() },
//       ],
//     });

//     if (existing) {
//       console.log(
//         "[createCategory] Duplicate found - Existing category ID:",
//         existing._id
//       );
//       return next(
//         new AppError(
//           "Category with this name or slug already exists",
//           400,
//           "CreateCategory",
//           "Category already exists"
//         )
//       );
//     }

//     console.log("[createCategory] Step 4: Creating new category document");
//     const newCategory = new CategoryModel({
//       name: name.trim(),
//       slug: slug.toLowerCase().trim(),
//       description: description?.trim() || "",
//       createdBy: req.user?._id,
//     });

//     console.log("[createCategory] Step 5: Saving new category to DB");
//     await newCategory.save();
//     console.log(
//       "[createCategory] SUCCESS: Category created - New ID:",
//       newCategory._id
//     );

//     res.status(201).json({
//       success: true,
//       message: "Category created successfully",
//       category: newCategory,
//     });
//   } catch (error) {
//     console.error("[createCategory] ERROR CAUGHT:");
//     console.error("Message:", error.message);
//     console.error("Stack:", error.stack);
//     console.error("Full error:", error);
//     next(
//       new AppError(
//         "Failed to create category",
//         500,
//         "CreateCategory",
//         error.message
//       )
//     );
//   }
// };

export const updateCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const updates = req.body;

    if (!categoryId || !/^[a-f\d]{24}$/i.test(categoryId)) {
      return next(new AppError("Invalid category ID format", 400));
    }

    if (!updates || Object.keys(updates).length === 0) {
      return next(new AppError("No update data provided", 400));
    }

    const existingCategory = await CategoryModel.findById(categoryId);
    if (!existingCategory) {
      return next(new AppError("Category not found", 404));
    }

    if (updates.name || updates.slug) {
      const duplicateQuery = [];
      if (updates.name)
        duplicateQuery.push({
          name: { $regex: new RegExp(`^${updates.name}$`, "i") },
        });
      if (updates.slug)
        duplicateQuery.push({ slug: updates.slug.toLowerCase() });

      const duplicate = await CategoryModel.findOne({
        _id: { $ne: categoryId },
        $or: duplicateQuery,
      });

      if (duplicate) {
        return next(
          new AppError("Category with this name or slug already exists", 400)
        );
      }
    }

    const cleanUpdates = {};
    if (updates.name) cleanUpdates.name = updates.name.trim();
    if (updates.slug) cleanUpdates.slug = updates.slug.toLowerCase().trim();
    if (updates.description !== undefined)
      cleanUpdates.description = updates.description?.trim() || "";

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
    next(new AppError("Failed to update category", 500, error.message));
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId || !/^[a-f\d]{24}$/i.test(categoryId)) {
      return next(new AppError("Invalid category ID format", 400));
    }

    const category = await CategoryModel.findById(categoryId);
    if (!category) {
      return next(new AppError("Category not found", 404));
    }

    const postsWithCategory = await PostModel.countDocuments({
      category: categoryId,
    });

    if (postsWithCategory > 0) {
      return next(
        new AppError("Cannot delete category assigned to posts", 400)
      );
    }

    // 🔴 REQUIRED FIX — remove from users
    await UserModel.updateMany(
      { categories: categoryId },
      { $pull: { categories: categoryId } }
    );

    await CategoryModel.findByIdAndDelete(categoryId);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(new AppError("Failed to delete category", 500, error.message));
  }
};

export const assignCategoriesToUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { categoryIds = [], newCategories = [] } = req.body;

    if (!userId || !/^[a-f\d]{24}$/i.test(userId)) {
      return next(new AppError("Invalid user ID format", 400));
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    let finalCategoryIds = [];

    if (categoryIds.length > 0) {
      const validCategories = await CategoryModel.find({
        _id: { $in: categoryIds },
      });

      if (validCategories.length !== categoryIds.length) {
        return next(new AppError("Invalid category IDs", 400));
      }

      finalCategoryIds.push(...categoryIds);
    }

    for (const cat of newCategories) {
      const exists = await CategoryModel.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${cat.name}$`, "i") } },
          { slug: cat.slug.toLowerCase() },
        ],
      });

      if (exists) {
        finalCategoryIds.push(exists._id);
        continue;
      }

      const created = await CategoryModel.create({
        name: cat.name.trim(),
        slug: cat.slug.toLowerCase().trim(),
        description: cat.description?.trim() || "",
        createdBy: req.user._id,
      });

      finalCategoryIds.push(created._id);
    }

    // 🔴 FIX — do not overwrite existing categories
    await UserModel.findByIdAndUpdate(
      userId,
      { $addToSet: { categories: { $each: finalCategoryIds } } },
      { new: true }
    );

    const updatedUser = await UserModel.findById(userId).populate("categories");

    res.status(200).json({
      success: true,
      message: "Categories assigned successfully",
      categories: updatedUser.categories,
    });
  } catch (error) {
    next(new AppError("Failed to assign categories", 500, error.message));
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
