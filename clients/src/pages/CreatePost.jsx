import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import slugify from "slugify";
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
import debounce from "lodash/debounce";

const asyncRetry = async (fn, { retries = 3, minTimeout = 1000 } = {}) => {
  let lastError = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, minTimeout * (i + 1)));
    }
  }
  throw lastError;
};

const MAX_PAYLOAD_SIZE = 40 * 1024 * 1024; // 40 MB
const MAX_TEXT_BLOCK_SIZE = 100 * 1024; // 100KB
const MAX_TABLE_BLOCK_SIZE = 200 * 1024; // 200KB
const MAX_IMAGE_COUNT = 40; // 40 images
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image

const CreatePost = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // ---- local state
  const [showPostTypeModal, setShowPostTypeModal] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- redux
  const { post, createLoading, createError } = useSelector((s) => s.post);
  const { postType, category: selectedCategoryId } = useSelector(
    (s) => s.postMeta
  );
  const { categories } = useSelector((s) => s.categories);

  // ---- refs / guards
  const isSubmittingRef = useRef(false);
  const hasCheckedPostTypeRef = useRef(false);

  // ---- Debounced handlers
  const handleTitleChange = useMemo(
    () =>
      debounce((value) => {
        setTitle(value);
      }, 300),
    []
  );

  const handleBlocksChange = useMemo(
    () =>
      debounce((value) => {
        setBlocks(value);
      }, 300),
    []
  );

  // ---- Cleanup debounced functions
  useEffect(() => {
    return () => {
      handleTitleChange.cancel();
      handleBlocksChange.cancel();
    };
  }, [handleTitleChange, handleBlocksChange]);

  // ---- Fetch categories
  useEffect(() => {
    dispatch(fetchCategories())
      .unwrap?.()
      .catch((e) => {
        console.error("[CreatePost] Fetch categories error:", e);
        toast.error("Failed to load categories.", { position: "top-right" });
      });
  }, [dispatch]);

  // ---- Handle saved postType and modal transitions (fix infinite loop)
  useEffect(() => {
    if (hasCheckedPostTypeRef.current || postType) return;

    const savedPostType = localStorage.getItem("postType");
    if (savedPostType && categories?.length > 0) {
      hasCheckedPostTypeRef.current = true; // ✅ set before dispatch
      dispatch(setPostType(savedPostType));
      setShowPostTypeModal(false);
      setShowCategoryModal(true);
    }
  }, [categories, postType, dispatch]);

  // ---- Memoized category map
  const categoryMap = useMemo(() => {
    const map = {};
    categories?.forEach?.((cat) => {
      map[cat._id] = cat.name;
    });
    return map;
  }, [categories]);

  // ---- Memoized filtered posts
  const filteredPosts = useMemo(() => {
    const posts = post ? [post] : [];
    return selectedCategoryId
      ? posts.filter((p) => p.category === selectedCategoryId)
      : posts;
  }, [post, selectedCategoryId]);

  // ---- Validation
  const validateBeforeSubmit = useCallback(
    async (metaData) => {
      if (!title.trim()) throw new Error("Please enter a title");
      if (title.trim().length < 3)
        throw new Error("Title must be at least 3 characters long");
      if (!blocks.length) throw new Error("Please add content blocks");
      if (!postType && !localStorage.getItem("postType"))
        throw new Error("Please select a post type");
      if (!selectedCategoryId) throw new Error("Please select a category");
      if (!metaData?.tags?.length)
        throw new Error("Please provide at least one tag");
      if (!/^[a-z]{2}$/i.test(metaData.language || ""))
        throw new Error("Invalid language code");

      const imageBlocks = blocks.filter((b) => b.type === "image");
      if (imageBlocks.length > MAX_IMAGE_COUNT)
        throw new Error(`Maximum ${MAX_IMAGE_COUNT} images allowed per post`);

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === "text") {
          const textSize = new TextEncoder().encode(block.value || "").length;
          if (textSize > MAX_TEXT_BLOCK_SIZE) {
            throw new Error(
              `Text block ${i + 1} too large (>100KB). Please reduce content.`
            );
          }
        }
        if (block.type === "table") {
          const tableSize = new TextEncoder().encode(
            JSON.stringify(block.data || [])
          ).length;
          if (tableSize > MAX_TABLE_BLOCK_SIZE) {
            throw new Error(
              `Table block ${i + 1} too large (>200KB). Please reduce data.`
            );
          }
        }
      }

      const postData = {
        postType,
        category: selectedCategoryId,
        title,
        blocks,
        thumbnail: metaData.thumbnail,
        excerpt: metaData.excerpt || "",
        tags: metaData.tags,
        language: metaData.language,
        isEmbed: metaData.isEmbed || false,
        isFeatured: metaData.isFeatured || false,
        isPinned: metaData.isPinned || false,
      };

      const payloadSize = new TextEncoder().encode(
        JSON.stringify(postData)
      ).length;
      if (payloadSize > MAX_PAYLOAD_SIZE) {
        throw new Error("Post data exceeds 40MB. Reduce content.");
      }

      return postData;
    },
    [title, blocks, postType, selectedCategoryId]
  );

  // ---- Actions
  const handleCreatePost = useCallback(
    async (metaData) => {
      if (isSubmittingRef.current) return;

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      try {
        const postData = await validateBeforeSubmit(metaData);
        const resultAction = await dispatch(createPosts(postData)).unwrap();
        toast.success("Post created successfully!", { position: "top-right" });
        setTitle("");
        setBlocks([]);
        dispatch(resetPostMeta());
        localStorage.removeItem("postType");
        navigate(`/post/${resultAction.post.slug}`);
      } catch (err) {
        console.error("[CreatePost] Post creation failed:", err);
        toast.error(err?.message || "Failed to create post", {
          position: "top-right",
        });
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [dispatch, navigate, validateBeforeSubmit]
  );

  const handleDeletePost = useCallback(
    (id) => {
      dispatch(deletePost(id))
        .unwrap()
        .then(() => {
          toast.success("Post deleted", { position: "top-right" });
        })
        .catch((err) => {
          toast.error(err?.message || "Failed to delete post", {
            position: "top-right",
          });
        });
    },
    [dispatch]
  );

  const handleUpdateDraft = useCallback(
    (draft) => {
      handleTitleChange(draft.title || "");
      handleBlocksChange(draft.blocks || []);
    },
    [handleTitleChange, handleBlocksChange]
  );

  // ---- Render
  return (
    <div className="flex flex-col md:flex-row bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      {showPostTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
          <CategorySelector
            onBack={() => {
              setShowCategoryModal(false);
              setShowPostTypeModal(true);
            }}
            onContinue={(selectedCategory) => {
              if (!selectedCategory?.id) {
                toast.error("Please select a category", {
                  position: "top-right",
                });
                return;
              }
              dispatch(setCategory(selectedCategory.id));
              setShowCategoryModal(false);
            }}
            onClose={() => {
              localStorage.removeItem("postType");
              navigate("/");
            }}
          />
        </div>
      )}

      {!showPostTypeModal && !showCategoryModal && !isSubmitting && (
        <div className="min-w-full flex container justify-around items-center flex-col flex-wrap md:flex-row">
          <div className="w-full flex justify-start px-4 pt-10 pl-11">
            <button
              onClick={() => {
                localStorage.removeItem("postType");
                navigate("/");
              }}
              className="font-bold text-red-600 dark:text-red-400 border border-red-500 dark:border-red-400 px-4 py-1.5 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
            >
              ⬅ Cancel & Go Back
            </button>
          </div>
          <div className="w-full md:w-3/5 my-4">
            <PostEditor
              size={55}
              title={title}
              setTitle={handleTitleChange}
              blocks={blocks}
              setBlocks={handleBlocksChange}
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
          <div className="w-full md:w-2/5 md:pl-1">
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
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePost;
