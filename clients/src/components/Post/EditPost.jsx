import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PostEditor from "../CreatePost/PostEditor";
import { updatePost, getSinglePost, clearError } from "../../store/postSlice";
import LoadingBar from "../../Utils/LoadingBar";
import { toast } from "react-hot-toast";
import TagsInput from "../CreatePost/TagsInput";
import {
  resetPostMeta,
  setPostType,
  setTags,
} from "../../store/Post/postMetaSlice";
import { fetchCategories, selectCategory } from "../../store/categorySlice";
import { X, Save, ImagePlus } from "lucide-react";
import { Transition } from "@headlessui/react";

const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-100 rounded-2xl mx-auto max-w-4xl">
        Something went wrong. Please try refreshing the page.
      </div>
    );
  }
  return children;
};

const EditPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { currentPost, loading, error, updateLoading, updateSuccess } =
    useSelector((state) => state.post);
  const { postType, tags } = useSelector((state) => state.postMeta);
  const { categories, selectedCategory } = useSelector(
    (state) => state.categories
  );

  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const [thumbnail, setThumbnail] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please log in to edit posts.");
      navigate("/login");
      return;
    }
    if (!slug || slug === "undefined") {
      toast.error("Invalid post slug.");
      navigate("/");
      return;
    }

    dispatch(getSinglePost({ slug, isGuest: false }));
    dispatch(fetchCategories());

    return () => {
      dispatch(clearError());
      dispatch(resetPostMeta());
    };
  }, [dispatch, slug, navigate, isAuthenticated]);

  useEffect(() => {
    if (!currentPost) return;

    if (title === "") setTitle(currentPost.title || "");
    if (blocks.length === 0) {
      const normalizedBlocks = (currentPost.blocks || []).map((block) => {
        if (block.type === "table") {
          const data =
            Array.isArray(block.data) && block.data.length > 0
              ? block.data
              : Array.isArray(block.items) && block.items.length > 0
              ? block.items
              : [
                  ["", ""],
                  ["", ""],
                ];
          return {
            id: block.id,
            type: "table",
            data,
            caption: block.caption || "",
            blocked: block.blocked || false,
          };
        }
        return block;
      });
      setBlocks(normalizedBlocks);
    }
    if (!postType) dispatch(setPostType(currentPost.postType || "Article"));
    if (tags.length === 0) dispatch(setTags(currentPost.tags || []));
    if (thumbnail === "") setThumbnail(currentPost.thumbnail || "");

    const category = categories.find((cat) => cat._id === currentPost.category);
    if (
      category &&
      (!selectedCategory || selectedCategory._id !== category._id)
    ) {
      dispatch(selectCategory(category));
    }
  }, [currentPost, categories, dispatch, postType, selectedCategory, tags]);

  useEffect(() => {
    if (updateSuccess) {
      toast.success("Post updated successfully");
      setTimeout(() => {
        setIsOpen(false);
        navigate(`/post/${currentPost.slug}`);
      }, 2000);
    }
  }, [updateSuccess, navigate, currentPost?.slug]);

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Post title cannot be empty");
    if (blocks.length === 0)
      return toast.error("Add at least one content block");
    if (!selectedCategory) return toast.error("Please select a category");
    if (!postType) return toast.error("Post type is required");
    if (!currentPost?.slug) return toast.error("Invalid post. Please reload.");

    const normalizedBlocks = blocks.map((block) => {
      if (block.type === "table") {
        const data =
          Array.isArray(block.data) && block.data.length > 0
            ? block.data
            : Array.isArray(block.items) && block.items.length > 0
            ? block.items
            : [
                ["", ""],
                ["", ""],
              ];
        return {
          id: block.id,
          type: "table",
          data,
          caption: block.caption || "",
          blocked: block.blocked || false,
        };
      }
      return block;
    });

    const updateData = {
      title,
      category: selectedCategory._id,
      postType,
      tags,
      blocks: normalizedBlocks,
      thumbnail,
    };

    try {
      const action = await dispatch(
        updatePost({ slug: currentPost.slug, updateData })
      );
      if (updatePost.fulfilled.match(action)) {
        dispatch(clearError());
      } else {
        throw new Error(action.error?.message || "Update failed");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update post");
    }
  };

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    const selected = categories.find((cat) => cat._id === categoryId);
    dispatch(selectCategory(selected || null));
  };

  const handlePostTypeChange = async (e) => {
    const newPostType = e.target.value;
    if (!["Article", "Blog"].includes(newPostType)) {
      toast.error("Invalid post type selected");
      return;
    }
    dispatch(setPostType(newPostType));
    try {
      const action = await dispatch(
        updatePost({
          slug: currentPost.slug,
          updateData: { postType: newPostType },
        })
      );
      if (updatePost.fulfilled.match(action)) {
        toast.success(`Post type updated to ${newPostType}`);
        dispatch(clearError());
      } else {
        throw new Error(action.error?.message || "Failed to update post type");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update post type");
      dispatch(setPostType(currentPost.postType || "Article"));
    }
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnail(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleBlocksChange = (newBlocks) => {
    setBlocks(newBlocks);
  };

  if (!isAuthenticated) return null;

  if (!slug || slug === "undefined") {
    return (
      <div className="p-6 text-center text-red-500 bg-red-100 rounded-2xl mx-auto max-w-4xl">
        Invalid post slug.
      </div>
    );
  }

  if (loading && !currentPost) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading post...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-100 rounded-2xl mx-auto max-w-4xl">
        Error: {error.message || "Unknown error"}
      </div>
    );
  }

  if (!currentPost) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-100 rounded-2xl mx-auto max-w-4xl">
        Post not found.
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <LoadingBar loading={updateLoading} />
      <Transition show={isOpen} as={React.Fragment}>
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-black/60 backdrop-blur-sm">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-8"
            enterTo="opacity-100 translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-8"
          >
            <div className="relative w-full h-full overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
              {/* Fixed Header */}
              <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient">
                        Edit Post
                      </h1>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Make your changes and save
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate(-1);
                      }}
                      className="ml-4 p-2 sm:p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200 hover:scale-110 shadow-lg hover:shadow-xl"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="space-y-6">
                  {/* Title Section */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200 hover:shadow-md">
                    <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Post Title
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 text-base sm:text-lg border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white transition-all duration-200"
                      value={title}
                      onChange={handleTitleChange}
                      placeholder="Enter your post title..."
                    />
                  </div>

                  {/* Two Column Layout for Medium+ screens */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {/* Thumbnail Section */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200 hover:shadow-md">
                        <label className="md:block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                          <ImagePlus className="w-4 h-4" />
                          Thumbnail Image
                        </label>
                        <div className="space-y-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200 transition-all cursor-pointer"
                          />
                          {thumbnail && (
                            <div className="relative group overflow-hidden rounded-lg">
                              <img
                                src={thumbnail}
                                alt="Thumbnail"
                                className="w-full h-48 object-cover rounded-lg shadow-md transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Category Section */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200 hover:shadow-md">
                        <label className="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Category
                        </label>
                        <select
                          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white transition-all duration-200 cursor-pointer"
                          value={selectedCategory?._id || ""}
                          onChange={handleCategoryChange}
                        >
                          <option value="">Select a category</option>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      {/* Post Type Section */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200 hover:shadow-md">
                        <label className="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Post Type
                        </label>
                        <select
                          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white transition-all duration-200 cursor-pointer"
                          value={postType}
                          onChange={handlePostTypeChange}
                        >
                          <option value="">Select post type</option>
                          <option value="Article">Article</option>
                          <option value="Blog">Blog</option>
                        </select>
                      </div>

                      {/* Tags Section */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200 hover:shadow-md">
                        <label className="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Tags
                        </label>
                        <TagsInput />
                      </div>
                    </div>
                  </div>

                  {/* Content Editor Section - Full Width */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200 hover:shadow-md">
                    <label className="block mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Content Blocks
                    </label>
                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg p-4 dark:bg-gray-900/50 min-h-[300px]">
                      <PostEditor
                        size={100}
                        blocks={blocks}
                        setBlocks={handleBlocksChange}
                        postType={postType}
                        category={selectedCategory?._id || ""}
                        title={title}
                        setTitle={setTitle}
                      />
                    </div>
                  </div>

                  {/* Save Button - Sticky on mobile */}
                  <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900 pt-6 pb-6 sm:pb-8">
                    <button
                      onClick={handleSave}
                      disabled={updateLoading}
                      className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 text-white font-semibold text-base sm:text-lg py-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                      {updateLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Saving Changes...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Transition>
    </ErrorBoundary>
  );
};

export default EditPost;
