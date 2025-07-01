import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../connection/axiosInstance';

// Async thunks for API calls
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Fetching all categories...');
      const response = await axiosInstance.get('/category/all-category');
      console.log('Fetch categories response:', response.data);
      return response.data.categories;
    } catch (err) {
      console.error('Fetch categories error:', err);
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchUserSelectedCategories = createAsyncThunk(
  'categories/fetchUserSelectedCategories',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Fetching user-selected categories...');
      const response = await axiosInstance.get('/category/user-selected');
      console.log('Fetch user-selected categories response:', response.data);
      return response.data.categories;
    } catch (err) {
      console.error('Fetch user-selected categories error:', err);
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async ({ userId, name, slug, description }, { rejectWithValue, getState }) => {
    try {
      console.log('Creating category with payload:', { userId, name, slug, description });
      const response = await axiosInstance.post('/category/', { name, slug, description });
      console.log('Create category response:', response.data);
      return { category: response.data.category, userId };
    } catch (err) {
      console.error('Create category error:', err);
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async ({ categoryId, updates }, { rejectWithValue }) => {
    try {
      console.log('Updating category ID:', categoryId, 'with payload:', updates);
      const response = await axiosInstance.patch(`/category/${categoryId}`, updates);
      console.log('Update category response:', response.data);
      return response.data.category;
    } catch (err) {
      console.error('Update category error:', err);
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (categoryId, { rejectWithValue }) => {
    try {
      console.log('Deleting category ID:', categoryId);
      const response = await axiosInstance.delete(`/category/${categoryId}`);
      console.log('Delete category response:', response.data);
      return { categoryId, message: response.data.message };
    } catch (err) {
      console.error('Delete category error:', err);
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const assignCategoriesToUser = createAsyncThunk(
  'categories/assignCategoriesToUser',
  async ({ userId, categoryIds }, { rejectWithValue }) => {
    try {
      console.log('Assigning categories to user:', { userId, categoryIds });
      const response = await axiosInstance.post(`/category/users/${userId}/categories`, {
        categoryIds,
        newCategories: [], // Always empty in current implementation
      });
      console.log('Assign categories response:', response.data);
      return response.data.categories;
    } catch (err) {
      console.error('Assign categories error:', err);
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const seedCategories = createAsyncThunk(
  'categories/seedCategories',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Seeding predefined categories...');
      const response = await axiosInstance.post('/category/seed');
      console.log('Seed categories response:', response.data);
      return response.data.message;
    } catch (err) {
      console.error('Seed categories error:', err);
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const categorySlice = createSlice({
  name: 'categories',
  initialState: {
    categories: [], // All available categories
    userSelectedCategories: [], // User-specific categories
    selectedCategory: null, // Currently selected category for UI
    status: 'idle',
    error: null,
  },
  reducers: {
    selectCategory: (state, action) => {
      console.log('Selecting category:', action.payload);
      state.selectedCategory = action.payload;
    },
    clearSelectedCategory: (state) => {
      console.log('Clearing selected category');
      state.selectedCategory = null;
    },
    clearError: (state) => {
      console.log('Clearing error');
      state.error = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Categories
      .addCase(fetchCategories.pending, (state) => {
        console.log('Fetch categories pending');
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        console.log('Fetch categories succeeded:', action.payload);
        state.status = 'succeeded';
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        console.log('Categories failed:', action.payload);
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch User-Selected Categories
      .addCase(fetchUserSelectedCategories.pending, (state) => {
        console.log('Fetch user-selected categories pending');
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUserSelectedCategories.fulfilled, (state, action) => {
        console.log('Fetch user-selected categories succeeded:', action.payload);
        state.status = 'succeeded';
        state.userSelectedCategories = action.payload;
      })
      .addCase(fetchUserSelectedCategories.rejected, (state, action) => {
        console.log('Fetch user-selected categories failed:', action.payload);
        state.status = 'failed';
        state.error = action.payload;
      })
      // Create Category
      .addCase(createCategory.pending, (state) => {
        console.log('Create category pending');
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        console.log('Create category succeeded:', action.payload);
        const { category, userId } = action.payload;
        state.categories.push(category);
        state.selectedCategory = category;
        const { auth } = state;
        // Add to userSelectedCategories if created by logged-in user
        if (userId && auth._id === userId) {
          state.userSelectedCategories = [...state.userSelectedCategories, category];
        }
        state.status = 'succeeded';
      })
      .addCase(createCategory.rejected, (state, action) => {
        console.log('Create category failed:', action.payload);
        state.status = 'failed';
        state.error = action.payload;
      })
      // Update Category
      .addCase(updateCategory.pending, (state) => {
        console.log('Update category pending');
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        console.log('Update category succeeded:', action.payload);
        const index = state.categories.findIndex((cat) => cat._id === action.payload._id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
        const userIndex = state.userSelectedCategories.findIndex(
          (cat) => cat._id === action.payload._id
        );
        if (userIndex !== -1) {
          state.userSelectedCategories[userIndex] = action.payload;
        }
        state.status = 'succeeded';
      })
      .addCase(updateCategory.rejected, (state, action) => {
        console.log('Update category failed:', action.payload);
        state.status = 'failed';
        state.error = action.payload;
      })
      // Delete Category
      .addCase(deleteCategory.pending, (state) => {
        console.log('Delete category pending');
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        console.log('Delete category succeeded:', action.payload);
        state.categories = state.categories.filter((cat) => cat._id !== action.payload.categoryId);
        state.userSelectedCategories = state.userSelectedCategories.filter(
          (cat) => cat._id !== action.payload.categoryId
        );
        if (state.selectedCategory?._id === action.payload.categoryId) {
          state.selectedCategory = null;
        }
        state.status = 'succeeded';
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        console.log('Delete category failed:', action.payload);
        state.status = 'failed';
        state.error = action.payload;
      })
      // Assign Categories to User
      .addCase(assignCategoriesToUser.pending, (state) => {
        console.log('Assign categories pending');
        state.status = 'loading';
        state.error = null;
      })
      .addCase(assignCategoriesToUser.fulfilled, (state, action) => {
        console.log('Assign categories succeeded:', action.payload);
        state.userSelectedCategories = action.payload;
        state.status = 'succeeded';
      })
      .addCase(assignCategoriesToUser.rejected, (state, action) => {
        console.log('Assign categories failed:', action.payload);
        state.status = 'failed';
        state.error = action.payload;
      })
      // Seed Categories
      .addCase(seedCategories.pending, (state) => {
        console.log('Seed categories pending');
        state.status = 'loading';
        state.error = null;
      })
      .addCase(seedCategories.fulfilled, (state) => {
        console.log('Seed categories succeeded');
        state.status = 'succeeded';
      })
      .addCase(seedCategories.rejected, (state, action) => {
        console.log('Seed categories failed:', action.payload);
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { selectCategory, clearSelectedCategory, clearError } = categorySlice.actions;
export default categorySlice.reducer;