import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  postType: "", // 'Article' or 'Blog'
  category: "",
  selectedCategory: null,

  visibility: "Public", // future: Public, Private, Unlisted
  tags: [], // future support
  isFeatured: false, // New field
  isPinned: false, // New field
  isPublished: false, // New field
  language: "en", // New field
  status: "draft", // New field
  options: {
    postTypes: ["Article", "Blog"],
    visibilities: ["Public", "Private", "Unlisted"],
    categories: [], // can be fetched separately
  },

  isSidebarOpen: false,
  isMobile: typeof window !== "undefined" ? window.innerWidth < 1024 : true,
  interaction: {
    liked: false,
    likesCount: 0,
    bookmarked: false,
    bookmarksCount: 0,
    views: 0,
  },
};

const postMetaSlice = createSlice({
  name: "postMeta",
  initialState,
  reducers: {
    setPostType: (state, action) => {
      state.postType = action.payload;
    },
    setCategory: (state, action) => {
      state.category = action.payload;
    },
    selectCategory: (state, action) => {
      state.selectedCategory = action.payload; // ✅ set full category object
    },
    setVisibility: (state, action) => {
      state.visibility = action.payload;
    },
    setTags: (state, action) => {
      state.tags = action.payload;
    },
    setIsFeatured: (state, action) => {
      state.isFeatured = action.payload;
    },
    setIsPinned: (state, action) => {
      state.isPinned = action.payload;
    },
    setIsPublished: (state, action) => {
      state.isPublished = action.payload;
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    setStatus: (state, action) => {
      state.status = action.payload;
    },
    resetPostMeta: (state) => {
      state.postType = "";
      state.category = "";
      state.visibility = "Public";
      state.tags = [];
      state.isFeatured = false;
      state.isPinned = false;
      state.isPublished = false;
      state.language = "en";
      state.status = "draft";
      state.interaction = {
        liked: false,
        likesCount: 0,
        bookmarked: false,
        bookmarksCount: 0,
        views: 0,
      };
    },
    setPostMetaOptions: (state, action) => {
      state.options = { ...state.options, ...action.payload };
    },
    setLikeInfo: (state, action) => {
      state.interaction.liked = action.payload.liked;
      state.interaction.likesCount = action.payload.likesCount;
    },
    setBookmarkInfo: (state, action) => {
      state.interaction.bookmarked = action.payload.bookmarked;
      state.interaction.bookmarksCount = action.payload.bookmarksCount;
    },
    setViewCount: (state, action) => {
      state.interaction.views = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.isSidebarOpen = action.payload;
    },
    setIsMobile: (state, action) => {
      state.isMobile = action.payload;
    },
  },
});

export const {
  setPostType,
  setCategory,
  setVisibility,
  setTags,
  setIsFeatured,
  setIsPinned,
  setIsPublished,
  setLanguage,
  setStatus,
  resetPostMeta,
  setPostMetaOptions,
  setLikeInfo,
  setBookmarkInfo,
  setViewCount,
  toggleSidebar,
  setSidebarOpen,
  setIsMobile,
} = postMetaSlice.actions;

export default postMetaSlice.reducer;
