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
import { X } from "lucide-react";
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
                ]; // Default 2x2 table
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
              ]; // Default 2x2 table
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
    dispatch(setPostType(newPostType)); // Update local state
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
      dispatch(setPostType(currentPost.postType || "Article")); // Revert on failure
    }
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
        <div className="text-center text-gray-600 dark:text-gray-300 animate-pulse">
          Loading post...
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate(-1);
                }}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-3xl font-semibold text-center mb-8 text-gray-900 dark:text-white">
                Edit Post
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Title
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white transition-all"
                    value={title}
                    onChange={handleTitleChange}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Category
                  </label>
                  <select
                    className="w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white transition-all"
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

                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Post Type
                  </label>
                  <select
                    className="w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white transition-all"
                    value={postType}
                    onChange={handlePostTypeChange}
                  >
                    <option value="">Select post type</option>
                    <option value="Article">Article</option>
                    <option value="Blog">Blog</option>
                  </select>
                </div>

                <div>
                  <TagsInput />
                </div>

                <div>
                  <label className="block mb-2 text-lg font-semibold text-gray-700 dark:text-gray-200">
                    Content Blocks
                  </label>
                  <div className="border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm p-4 dark:bg-gray-900">
                    <PostEditor
                      size={100}
                      blocks={blocks}
                      setBlocks={handleBlocksChange}
                      postType={postType}
                      category={selectedCategory?._id || ""}
                      title={title}
                      setTitle={handleTitleChange}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={updateLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-400 text-white font-medium text-lg py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {updateLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Transition>
    </ErrorBoundary>
  );
};

export default EditPost;
