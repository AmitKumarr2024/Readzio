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
  const [categoriesFetched, setCategoriesFetched] = useState(false);

  // ---- redux
  const { post, createLoading, createError } = useSelector((s) => s.post);
  const { postType, category: selectedCategoryId } = useSelector(
    (s) => s.postMeta
  );
  const { categories } = useSelector((s) => s.categories);

  // ---- refs / guards
  const isSubmittingRef = useRef(false);
  const hasCheckedPostTypeRef = useRef(false);

  // ---- Stable debounced handlers (moved outside component or memoized properly)
  const debouncedTitleChange = useCallback(
    debounce((value) => {
      // console.log("[CreatePost] Debounced title change:", value);
      setTitle(value);
    }, 300),
    [] // Empty dependency array since setTitle is stable
  );

  // ---- Debounced draft saver (for autosave / localStorage / backend)
  const debouncedSaveDraft = useMemo(
    () =>
      debounce((draft) => {
        // console.log("[CreatePost] Debounced draft save:", draft);
        // Example: localStorage.setItem("draftPost", JSON.stringify(draft));
        // Or dispatch(saveDraft(draft)) if you want to persist in redux/backend
      }, 500),
    []
  );

  // ---- Watch title/blocks and trigger debounced save
  useEffect(() => {
    if (title || blocks.length > 0) {
      debouncedSaveDraft({ title, blocks });
    }
    return () => debouncedSaveDraft.cancel();
  }, [title, blocks, debouncedSaveDraft]);

  const debouncedBlocksChange = useCallback(
    debounce((value) => {
      // console.log("[CreatePost] Debounced blocks change:", value);
      setBlocks(value);
    }, 300),
    [] // Empty dependency array since setBlocks is stable
  );

  // ---- Cleanup debounced functions
  useEffect(() => {
    // console.log("[CreatePost] Component mounted");
    return () => {
      // console.log(
      //   "[CreatePost] Component unmounting, cancelling debounced functions"
      // );
      debouncedTitleChange.cancel();
      debouncedBlocksChange.cancel();
    };
  }, []); // Remove debounced functions from dependencies

  // ---- Fetch categories (only once)
  useEffect(() => {
    if (categoriesFetched) return;

    // console.log("[CreatePost] Fetching categories");
    setCategoriesFetched(true);

    dispatch(fetchCategories())
      .unwrap?.()
      .catch((e) => {
        console.error("[CreatePost] Fetch categories error:", e);
        toast.error("Failed to load categories.", { position: "top-right" });
        setCategoriesFetched(false); // Reset on error to allow retry
      });
  }, [dispatch, categoriesFetched]);

  // ---- Handle saved postType and modal transitions (fixed dependencies)
  useEffect(() => {
    if (hasCheckedPostTypeRef.current) {
      // console.log("[CreatePost] Skipping postType check, already processed");
      return;
    }

    if (postType) {
      // console.log("[CreatePost] PostType already exists:", postType);
      return;
    }

    const savedPostType = localStorage.getItem("postType");
    // console.log(
    //   "[CreatePost] Checking saved postType:",
    //   savedPostType,
    //   "Categories length:",
    //   categories?.length
    // );

    if (savedPostType && categories?.length > 0) {
      // console.log("[CreatePost] Setting postType and opening category modal");
      dispatch(setPostType(savedPostType));
      setShowPostTypeModal(false);
      setShowCategoryModal(true);
      hasCheckedPostTypeRef.current = true;
    }
  }, [dispatch, categories?.length, postType]); // Use categories?.length instead of categories

  // ---- Memoized category map (stable dependencies)
  const categoryMap = useMemo(() => {
    if (!categories?.length) return {};

    const map = {};
    categories.forEach((cat) => {
      map[cat._id] = cat.name;
    });
    // console.log("[CreatePost] Category map created:", map);
    return map;
  }, [categories]); // Keep categories as dependency but check length inside

  // ---- Memoized filtered posts (more stable)
  const filteredPosts = useMemo(() => {
    if (!post) return [];

    const posts = [post];
    const filtered = selectedCategoryId
      ? posts.filter((p) => p.category === selectedCategoryId)
      : posts;
    // console.log("[CreatePost] Filtered posts:", filtered);
    return filtered;
  }, [post, selectedCategoryId]);

  // ---- Stable validation function
  const validateBeforeSubmit = useCallback(
    async (metaData) => {
      // console.log("[CreatePost] Validating post data:", {
      //   title,
      //   blocksLength: blocks.length,
      //   postType,
      //   selectedCategoryId,
      //   metaData,
      // });

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
      if (imageBlocks.length > MAX_IMAGE_COUNT) {
        throw new Error(`Maximum ${MAX_IMAGE_COUNT} images allowed per post`);
      }

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === "text") {
          const textSize = new TextEncoder().encode(block.value || "").length;
          if (textSize > MAX_TEXT_BLOCK_SIZE) {
            throw new Error(
              `Text block at position ${
                i + 1
              } too large (>100KB). Please reduce content.`
            );
          }
        }
        if (block.type === "table") {
          const tableSize = new TextEncoder().encode(
            JSON.stringify(block.data || [])
          ).length;
          if (tableSize > MAX_TABLE_BLOCK_SIZE) {
            throw new Error(
              `Table block at position ${
                i + 1
              } too large (>200KB). Please reduce table data.`
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
        throw new Error(
          "Post data exceeds 40MB. Reduce images, text, or table content."
        );
      }

      // console.log("[CreatePost] Validation passed");
      return postData;
    },
    [title, blocks, postType, selectedCategoryId]
  );

  // ---- Actions
  const handleCreatePost = useCallback(
    async (metaData) => {
      if (isSubmittingRef.current) {
        // console.log("[CreatePost] Submission blocked, already submitting");
        return;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      // console.log("[CreatePost] Creating post with metaData:", metaData);

      try {
        const postData = await validateBeforeSubmit(metaData);
        const resultAction = await dispatch(createPosts(postData)).unwrap();
        // console.log("[CreatePost] Post created successfully:", resultAction);

        toast.success("Post created successfully!", { position: "top-right" });
        setTitle("");
        setBlocks([]);
        dispatch(resetPostMeta());
        localStorage.removeItem("postType");
        navigate(`/post/${resultAction.post.slug}`);
      } catch (err) {
        console.error("[CreatePost] Post creation failed:", err);

        if (err?.code === "ECONNABORTED" || err?.isTimeout) {
          const slug = slugify(title, { lower: true, strict: true });
          try {
            const checkPost = await asyncRetry(
              () => dispatch(getSinglePost({ slug, isGuest: false })).unwrap(),
              { retries: 2, minTimeout: 1000 }
            );
            if (checkPost) {
              // console.log("[CreatePost] Post found after timeout:", checkPost);
              toast.success("Post created successfully!", {
                position: "top-right",
              });
              setTitle("");
              setBlocks([]);
              dispatch(resetPostMeta());
              localStorage.removeItem("postType");
              navigate(`/post/${checkPost.slug}`);
              return;
            }
          } catch {
            console.error("[CreatePost] Failed to verify post after timeout");
          }
          toast.error(
            "Request timed out. Please check if your post was created.",
            { position: "top-right" }
          );
        } else {
          toast.error(err?.message || "Failed to create post", {
            position: "top-right",
          });
        }
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        // console.log("[CreatePost] Submission complete");
      }
    },
    [dispatch, navigate, validateBeforeSubmit, title] // Added title for slug generation
  );

  const handleDeletePost = useCallback(
    (id) => {
      // console.log("[CreatePost] Deleting post with id:", id);
      dispatch(deletePost(id))
        .unwrap()
        .then(() => {
          // console.log("[CreatePost] Post deleted successfully");
          toast.success("Post deleted", { position: "top-right" });
        })
        .catch((err) => {
          console.error("[CreatePost] Delete post failed:", err);
          toast.error(err?.message || "Failed to delete post", {
            position: "top-right",
          });
        });
    },
    [dispatch]
  );

  const handleUpdateDraft = useCallback((draft) => {
    // console.log("[CreatePost] Updating draft:", draft);
    if (draft.title !== undefined) {
      setTitle(draft.title); // instant
    }
    if (draft.blocks !== undefined) {
      setBlocks(draft.blocks); // instant
    }
  }, []);

  // ---- Render
  // console.log("[CreatePost] Rendering, state:", {
  //   showPostTypeModal,
  //   showCategoryModal,
  //   title,
  //   blocksLength: blocks.length,
  //   isSubmitting,
  // });

  return (
    <div className="flex flex-col md:flex-row bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      {showPostTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
          <PostTypeSelector
            postType={postType}
            setPostType={(value) => {
              // console.log("[CreatePost] Setting postType:", value);
              dispatch(setPostType(value));
              localStorage.setItem("postType", value);
            }}
            onContinue={() => {
              // console.log("[CreatePost] PostTypeSelector onContinue");
              setShowPostTypeModal(false);
              setShowCategoryModal(true);
            }}
            onClose={() => {
              // console.log("[CreatePost] PostTypeSelector onClose");
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
              // console.log("[CreatePost] CategorySelector onBack");
              setShowCategoryModal(false);
              setShowPostTypeModal(true);
            }}
            onContinue={(selectedCategory) => {
              // console.log(
              //   "[CreatePost] CategorySelector onContinue:",
              //   selectedCategory
              // );
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
              // console.log("[CreatePost] CategorySelector onClose");
              localStorage.removeItem("postType");
              navigate("/");
            }}
          />
        </div>
      )}

      {/* 🔹 Show loader while submitting */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-black/70 flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-white text-lg font-semibold">
            Creating your post...
          </p>
        </div>
      )}

      {/* 🔹 Show editor only if not submitting */}
      {!showPostTypeModal && !showCategoryModal && !isSubmitting && (
        <div className="min-w-full flex container justify-around items-center flex-col flex-wrap md:flex-row">
          <div className="w-full flex justify-start px-4 pt-10 ml-20">
            <button
              onClick={() => {
                // console.log("[CreatePost] Cancel & Go Back clicked");
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
              setTitle={setTitle}
              blocks={blocks}
              setBlocks={setBlocks}
              postType={postType}
              category={selectedCategoryId}
              categoryName={
                categoryMap[selectedCategoryId] || selectedCategoryId
              }
            />
            <div className="text-sm text-gray-500 dark:text-gray-400 ml-28 mt-2">
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
