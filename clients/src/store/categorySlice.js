import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

export const fetchCategories = createAsyncThunk(
  "categories/fetchCategories",
  async (_, { rejectWithValue, getState }) => {
    const { categories } = getState();
    if (categories.categories.length > 0 && categories.status !== "failed") {
      console.log(
        "[categorySlice:fetchCategories] Categories already loaded, skipping"
      );
      return categories.categories;
    }
    try {
      console.log("[categorySlice:fetchCategories] Fetching all categories...");
      const response = await axiosInstance.get("/category/all-category");
      console.log("[categorySlice:fetchCategories] Response:", response.data);
      return response.data.categories;
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to fetch categories";
      console.error("[categorySlice:fetchCategories] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

export const fetchUserSelectedCategories = createAsyncThunk(
  "categories/fetchUserSelectedCategories",
  async (_, { rejectWithValue, getState }) => {
    const { categories } = getState();
    if (
      categories.userSelectedCategories.length > 0 &&
      categories.status !== "failed"
    ) {
      console.log(
        "[categorySlice:fetchUserSelectedCategories] User categories already loaded, skipping"
      );
      return categories.userSelectedCategories;
    }
    try {
      console.log(
        "[categorySlice:fetchUserSelectedCategories] Fetching user-selected categories..."
      );
      const response = await axiosInstance.get("/category/user-selected");
      console.log(
        "[categorySlice:fetchUserSelectedCategories] Response:",
        response.data
      );
      return response.data.categories;
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        "Failed to fetch user-selected categories";
      console.error(
        "[categorySlice:fetchUserSelectedCategories] Error:",
        errMsg
      );
      return rejectWithValue(errMsg);
    }
  }
);

export const createCategory = createAsyncThunk(
  "categories/createCategory",
  async ({ userId, name, slug, description }, { rejectWithValue }) => {
    try {
      console.log("[categorySlice:createCategory] Creating category:", {
        userId,
        name,
        slug,
        description,
      });
      const response = await axiosInstance.post("/category/", {
        name,
        slug,
        description,
      });
      console.log("[categorySlice:createCategory] Response:", response.data);
      return { category: response.data.category, userId };
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to create category";
      console.error("[categorySlice:createCategory] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

export const updateCategory = createAsyncThunk(
  "categories/updateCategory",
  async ({ categoryId, updates }, { rejectWithValue }) => {
    try {
      console.log("[categorySlice:updateCategory] Updating category:", {
        categoryId,
        updates,
      });
      const response = await axiosInstance.patch(
        `/category/${categoryId}`,
        updates
      );
      console.log("[categorySlice:updateCategory] Response:", response.data);
      return response.data.category;
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to update category";
      console.error("[categorySlice:updateCategory] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

export const deleteCategory = createAsyncThunk(
  "categories/deleteCategory",
  async (categoryId, { rejectWithValue }) => {
    try {
      console.log(
        "[categorySlice:deleteCategory] Deleting category:",
        categoryId
      );
      const response = await axiosInstance.delete(`/category/${categoryId}`);
      console.log("[categorySlice:deleteCategory] Response:", response.data);
      return { categoryId, message: response.data.message };
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to delete category";
      console.error("[categorySlice:deleteCategory] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

export const assignCategoriesToUser = createAsyncThunk(
  "categories/assignCategoriesToUser",
  async ({ userId, categoryIds }, { rejectWithValue }) => {
    try {
      console.log(
        "[categorySlice:assignCategoriesToUser] Assigning categories:",
        { userId, categoryIds }
      );
      const response = await axiosInstance.post(
        `/category/users/${userId}/categories`,
        {
          categoryIds,
          newCategories: [],
        }
      );
      console.log(
        "[categorySlice:assignCategoriesToUser] Response:",
        response.data
      );
      return response.data.categories;
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to assign categories";
      console.error("[categorySlice:assignCategoriesToUser] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

export const seedCategories = createAsyncThunk(
  "categories/seedCategories",
  async (_, { rejectWithValue }) => {
    try {
      console.log(
        "[categorySlice:seedCategories] Seeding predefined categories..."
      );
      const response = await axiosInstance.post("/category/seed");
      console.log("[categorySlice:seedCategories] Response:", response.data);
      return response.data.message;
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to seed categories";
      console.error("[categorySlice:seedCategories] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

export const checkSlugAvailability = createAsyncThunk(
  "categories/checkSlugAvailability",
  async ({ slug }, { rejectWithValue }) => {
    try {
      console.log("[categorySlice:checkSlugAvailability] Checking slug:", slug);
      const response = await axiosInstance.get("/category/check-slug", {
        params: { slug, type: "category" },
      });
      console.log(
        "[categorySlice:checkSlugAvailability] Response:",
        response.data
      );
      return response.data.isAvailable;
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to check slug availability";
      console.error("[categorySlice:checkSlugAvailability] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

const categorySlice = createSlice({
  name: "categories",
  initialState: {
    categories: [],
    userSelectedCategories: [],
    selectedCategory: null,
    status: "idle",
    error: null,
    slugAvailability: {
      loading: false,
      isAvailable: null,
    },
  },
  reducers: {
    selectCategory: (state, action) => {
      console.log(
        "[categorySlice:selectCategory] Selecting category:",
        action.payload
      );
      state.selectedCategory = action.payload;
    },
    clearSelectedCategory: (state) => {
      console.log(
        "[categorySlice:clearSelectedCategory] Clearing selected category"
      );
      state.selectedCategory = null;
    },
    clearError: (state) => {
      console.log("[categorySlice:clearError] Clearing error");
      state.error = null;
    },
    resetSlugAvailability: (state) => {
      console.log(
        "[categorySlice:resetSlugAvailability] Resetting slug availability"
      );
      state.slugAvailability = { loading: false, isAvailable: null };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Categories
      .addCase(fetchCategories.pending, (state) => {
        console.log("[categorySlice:fetchCategories] Pending");
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        console.log(
          "[categorySlice:fetchCategories] Succeeded:",
          action.payload
        );
        state.status = "succeeded";
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        console.log("[categorySlice:fetchCategories] Failed:", action.payload);
        state.status = "failed";
        state.error = action.payload;
      })
      // Fetch User-Selected Categories
      .addCase(fetchUserSelectedCategories.pending, (state) => {
        console.log("[categorySlice:fetchUserSelectedCategories] Pending");
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUserSelectedCategories.fulfilled, (state, action) => {
        console.log(
          "[categorySlice:fetchUserSelectedCategories] Succeeded:",
          action.payload
        );
        state.status = "succeeded";
        state.userSelectedCategories = action.payload;
        state.error = null;
      })
      .addCase(fetchUserSelectedCategories.rejected, (state, action) => {
        console.log(
          "[categorySlice:fetchUserSelectedCategories] Failed:",
          action.payload
        );
        state.status = "failed";
        state.error = action.payload;
      })
      // Create Category
      .addCase(createCategory.pending, (state) => {
        console.log("[categorySlice:createCategory] Pending");
        state.status = "loading";
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        console.log(
          "[categorySlice:createCategory] Succeeded:",
          action.payload
        );
        const { category } = action.payload;
        state.categories.push(category);
        state.selectedCategory = category;
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(createCategory.rejected, (state, action) => {
        console.log("[categorySlice:createCategory] Failed:", action.payload);
        state.status = "failed";
        state.error = action.payload;
      })
      // Update Category
      .addCase(updateCategory.pending, (state) => {
        console.log("[categorySlice:updateCategory] Pending");
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        console.log(
          "[categorySlice:updateCategory] Succeeded:",
          action.payload
        );
        const index = state.categories.findIndex(
          (cat) => cat._id === action.payload._id
        );
        if (index !== -1) state.categories[index] = action.payload;
        const userIndex = state.userSelectedCategories.findIndex(
          (cat) => cat._id === action.payload._id
        );
        if (userIndex !== -1)
          state.userSelectedCategories[userIndex] = action.payload;
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(updateCategory.rejected, (state, action) => {
        console.log("[categorySlice:updateCategory] Failed:", action.payload);
        state.status = "failed";
        state.error = action.payload;
      })
      // Delete Category
      .addCase(deleteCategory.pending, (state) => {
        console.log("[categorySlice:deleteCategory] Pending");
        state.status = "loading";
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        console.log(
          "[categorySlice:deleteCategory] Succeeded:",
          action.payload
        );
        state.categories = state.categories.filter(
          (cat) => cat._id !== action.payload.categoryId
        );
        state.userSelectedCategories = state.userSelectedCategories.filter(
          (cat) => cat._id !== action.payload.categoryId
        );
        if (state.selectedCategory?._id === action.payload.categoryId) {
          state.selectedCategory = null;
        }
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        console.log("[categorySlice:deleteCategory] Failed:", action.payload);
        state.status = "failed";
        state.error = action.payload;
      })
      // Assign Categories to User
      .addCase(assignCategoriesToUser.pending, (state) => {
        console.log("[categorySlice:assignCategoriesToUser] Pending");
        state.status = "loading";
        state.error = null;
      })
      .addCase(assignCategoriesToUser.fulfilled, (state, action) => {
        console.log(
          "[categorySlice:assignCategoriesToUser] Succeeded:",
          action.payload
        );
        state.userSelectedCategories = action.payload;
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(assignCategoriesToUser.rejected, (state, action) => {
        console.log(
          "[categorySlice:assignCategoriesToUser] Failed:",
          action.payload
        );
        state.status = "failed";
        state.error = action.payload;
      })
      // Seed Categories
      .addCase(seedCategories.pending, (state) => {
        console.log("[categorySlice:seedCategories] Pending");
        state.status = "loading";
        state.error = null;
      })
      .addCase(seedCategories.fulfilled, (state) => {
        console.log("[categorySlice:seedCategories] Succeeded");
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(seedCategories.rejected, (state, action) => {
        console.log("[categorySlice:seedCategories] Failed:", action.payload);
        state.status = "failed";
        state.error = action.payload;
      })
      // Check Slug Availability
      .addCase(checkSlugAvailability.pending, (state) => {
        console.log("[categorySlice:checkSlugAvailability] Pending");
        state.slugAvailability.loading = true;
        state.slugAvailability.isAvailable = null;
      })
      .addCase(checkSlugAvailability.fulfilled, (state, action) => {
        console.log(
          "[categorySlice:checkSlugAvailability] Succeeded:",
          action.payload
        );
        state.slugAvailability.loading = false;
        state.slugAvailability.isAvailable = action.payload;
      })
      .addCase(checkSlugAvailability.rejected, (state, action) => {
        console.log(
          "[categorySlice:checkSlugAvailability] Failed:",
          action.payload
        );
        state.slugAvailability.loading = false;
        state.slugAvailability.isAvailable = false;
      });
  },
});

export const {
  selectCategory,
  clearSelectedCategory,
  clearError,
  resetSlugAvailability,
} = categorySlice.actions;
export default categorySlice.reducer;
