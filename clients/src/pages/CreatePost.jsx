import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import slugify from "slugify";
import { debounce } from "lodash";
import CategorySelector from "../components/CreatePost/CategorySelector";
import PostTypeSelector from "../components/CreatePost/PostTypeSelector";
import PostEditor from "../components/CreatePost/PostEditor";
import PostPreviewList from "../components/CreatePost/PostPreviewList";
import { createPosts, deletePost, getSinglePost } from "../store/postSlice";
import { fetchCategories } from "../store/categorySlice";
import {
  setCategory,
  setPostType,
  resetPostMeta,
} from "../store/Post/postMetaSlice";

// Async retry utility
const asyncRetry = async (fn, options = {}) => {
  const { retries = 5, minTimeout = 2000 } = options;
  let lastError = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, minTimeout * (i + 1)));
    }
  }
  throw lastError;
};

const CreatePost = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isSubmittingRef = useRef(false);

  const [showPostTypeModal, setShowPostTypeModal] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false); // Track submission state
  const { post, createLoading, createError } = useSelector(
    (state) => state.post
  );
  const { postType, category: selectedCategoryId } = useSelector(
    (state) => state.postMeta
  );
  const { categories } = useSelector((state) => state.categories);

  const MAX_PAYLOAD_SIZE = 40 * 1024 * 1024; // 40 MB
  const MAX_TEXT_BLOCK_SIZE = 100 * 1024; // 100KB
  const MAX_TABLE_BLOCK_SIZE = 200 * 1024; // 200KB
  const MAX_IMAGE_COUNT = 40; // 40 images
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image

  useEffect(() => {
    const savedPostType = localStorage.getItem("postType");
    if (savedPostType) {
      dispatch(setPostType(savedPostType));
      if (categories.length) {
        setShowPostTypeModal(false);
        setShowCategoryModal(true);
      }
    }
    dispatch(fetchCategories()).catch((e) => {
      console.error("[CreatePost] Fetch categories error:", e);
      toast.error("Failed to load categories.", { position: "top-right" });
    });
  }, [dispatch, categories.length]);

  useEffect(() => {
    return () => {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    };
  }, []);

  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      map[cat._id] = cat.name;
    });
    return map;
  }, [categories]);

  const posts = post ? [post] : [];
  const filteredPosts = selectedCategoryId
    ? posts.filter((p) => p.category === selectedCategoryId)
    : posts;

  const handleCategoryContinue = (selectedCategory) => {
    if (!selectedCategory?.id)
      return toast.error("Please select a category", { position: "top-right" });
    dispatch(setCategory(selectedCategory.id));
    setShowCategoryModal(false);
  };

  // Debounced handleCreatePost to prevent multiple submissions
  const handleCreatePost = useCallback(
    debounce(async (metaData) => {
      if (isSubmittingRef.current) return; // prevent double submit
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      try {
        // ... your validation + dispatch(createPosts) logic
      } catch (err) {
        console.error("[CreatePost] Post creation failed:", err);
        // ... your error handling
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    }, 1000),
    [dispatch, title, blocks, postType, selectedCategoryId]
  );

  const handleDeletePost = (id) => {
    dispatch(deletePost(id))
      .unwrap()
      .then(() => toast.success("Post deleted", { position: "top-right" }))
      .catch((err) => {
        console.error("[CreatePost] Delete post failed:", err);
        toast.error(err.message || "Failed to delete post", {
          position: "top-right",
        });
      });
  };

  const handleUpdateDraft = (draft) => {
    setTitle(draft.title || "");
    setBlocks(draft.blocks || []);
  };

  return (
    <div className="flex flex-col md:flex-row bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      {showPostTypeModal && (
        <div
          id="post-type-modal"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
        >
          <PostTypeSelector
            postType={postType}
            setPostType={(value) => {
              dispatch(setPostType(value));
              localStorage.setItem("postType", value);
            }}
            onContinue={() => {
              setShowPostTypeModal(false);
              setShowCategoryModal(true);
            }}
            onClose={() => {
              localStorage.removeItem("postType");
              navigate("/");
            }}
          />
        </div>
      )}
      {showCategoryModal && (
        <div
          id="category-modal"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
        >
          <CategorySelector
            onBack={() => {
              setShowCategoryModal(false);
              setShowPostTypeModal(true);
            }}
            onContinue={handleCategoryContinue}
            onClose={() => {
              localStorage.removeItem("postType");
              navigate("/");
            }}
          />
        </div>
      )}
      {!showPostTypeModal && !showCategoryModal && (
        <div
          id="create-post-main"
          className="min-w-full flex container justify-around items-center flex-col flex-wrap md:flex-row"
        >
          <div className="w-full flex justify-start px-4 pt-10 pl-11">
            <button
              onClick={() => {
                localStorage.removeItem("postType");
                navigate("/");
              }}
              id="cancel-post-button"
              className="font-bold text-red-600 dark:text-red-400 border border-red-500 dark:border-red-400 px-4 py-1.5 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
            >
              ⬅ Cancel & Go Back
            </button>
          </div>
          <div id="post-editor-wrapper" className="w-full md:w-3/5 my-4">
            <PostEditor
              size={55}
              title={title}
              setTitle={setTitle}
              blocks={blocks}
              setBlocks={setBlocks}
              postType={postType}
              category={selectedCategoryId}
              categoryName={
                categoryMap[selectedCategoryId] || selectedCategoryId
              }
            />
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Images will be uploaded in their original format and quality (up
              to 5MB).
            </div>
          </div>
          <div
            id="post-preview-list-wrapper"
            className="w-full md:w-2/5 md:pl-1"
          >
            <PostPreviewList
              currentDraftPost={{ title, blocks }}
              onUpdateDraft={handleUpdateDraft}
              postType={postType}
              category={selectedCategoryId}
              categoryName={
                categoryMap[selectedCategoryId] || selectedCategoryId
              }
              allPosts={filteredPosts}
              deletePost={handleDeletePost}
              createLoading={createLoading}
              createError={createError}
              onCreatePost={handleCreatePost}
              isSubmitting={isSubmitting} // Pass isSubmitting to disable button
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePost;
