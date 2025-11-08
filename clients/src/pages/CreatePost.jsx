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
import LoadingBar from "../Utils/LoadingBar";

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

const MAX_PAYLOAD_SIZE = 40 * 1024 * 1024;
const MAX_TEXT_BLOCK_SIZE = 100 * 1024;
const MAX_TABLE_BLOCK_SIZE = 200 * 1024;
const MAX_IMAGE_COUNT = 40;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const CreatePost = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showPostTypeModal, setShowPostTypeModal] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoriesFetched, setCategoriesFetched] = useState(false);

  const { post, createLoading, createError } = useSelector((s) => s.post);
  const { postType, category: selectedCategoryId } = useSelector(
    (s) => s.postMeta
  );
  const { categories } = useSelector((s) => s.categories);

  const isSubmittingRef = useRef(false);
  const hasCheckedPostTypeRef = useRef(false);

  const debouncedTitleChange = useCallback(
    debounce((value) => {
      setTitle(value);
    }, 300),
    []
  );

  const debouncedSaveDraft = useMemo(
    () =>
      debounce((draft) => {
        // Save draft logic
      }, 500),
    []
  );

  useEffect(() => {
    if (title || blocks.length > 0) {
      debouncedSaveDraft({ title, blocks });
    }
    return () => debouncedSaveDraft.cancel();
  }, [title, blocks, debouncedSaveDraft]);

  const debouncedBlocksChange = useCallback(
    debounce((value) => {
      setBlocks(value);
    }, 300),
    []
  );

  useEffect(() => {
    return () => {
      debouncedTitleChange.cancel();
      debouncedBlocksChange.cancel();
    };
  }, []);

  useEffect(() => {
    if (categoriesFetched) return;

    setCategoriesFetched(true);

    dispatch(fetchCategories())
      .unwrap?.()
      .catch((e) => {
        console.error("[CreatePost] Fetch categories error:", e);
        toast.error("Failed to load categories.", { position: "top-right" });
        setCategoriesFetched(false);
      });
  }, [dispatch, categoriesFetched]);

  useEffect(() => {
    if (hasCheckedPostTypeRef.current) {
      return;
    }

    if (postType) {
      return;
    }

    const savedPostType = localStorage.getItem("postType");

    if (savedPostType && categories?.length > 0) {
      dispatch(setPostType(savedPostType));
      setShowPostTypeModal(false);
      setShowCategoryModal(true);
      hasCheckedPostTypeRef.current = true;
    }
  }, [dispatch, categories?.length, postType]);

  const categoryMap = useMemo(() => {
    if (!categories?.length) return {};

    const map = {};
    categories.forEach((cat) => {
      map[cat._id] = cat.name;
    });
    return map;
  }, [categories]);

  const filteredPosts = useMemo(() => {
    if (!post) return [];

    const posts = [post];
    const filtered = selectedCategoryId
      ? posts.filter((p) => p.category === selectedCategoryId)
      : posts;
    return filtered;
  }, [post, selectedCategoryId]);

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

      return postData;
    },
    [title, blocks, postType, selectedCategoryId]
  );

  const handleCreatePost = useCallback(
    async (metaData) => {
      if (isSubmittingRef.current) {
        return;
      }

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

        if (err?.code === "ECONNABORTED" || err?.isTimeout) {
          const slug = slugify(title, { lower: true, strict: true });
          try {
            const checkPost = await asyncRetry(
              () => dispatch(getSinglePost({ slug, isGuest: false })).unwrap(),
              { retries: 2, minTimeout: 1000 }
            );
            if (checkPost) {
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
      }
    },
    [dispatch, navigate, validateBeforeSubmit, title]
  );

  const handleDeletePost = useCallback(
    (id) => {
      dispatch(deletePost(id))
        .unwrap()
        .then(() => {
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
    if (draft.title !== undefined) {
      setTitle(draft.title);
    }
    if (draft.blocks !== undefined) {
      setBlocks(draft.blocks);
    }
  }, []);

  // Just replace the return statement in your CreatePost component with this:

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      {/* Post Type Modal */}
      {showPostTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
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

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
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

      {/* Loading Overlay */}
      {isSubmitting && <LoadingBar text="Creating your post..." />}

      {/* Main Content Area */}
      {!showPostTypeModal && !showCategoryModal && !isSubmitting && (
        <div className="w-full mt-36">
          {/* Sticky Header with Back Button */}
          <div className="sticky  top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <button
                onClick={() => {
                  localStorage.removeItem("postType");
                  navigate("/");
                }}
                className="inline-flex items-center gap-2 font-semibold text-red-600 dark:text-red-400 border border-red-500 dark:border-red-400 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 text-sm sm:text-base"
              >
                <span className="text-lg">←</span>
                <span className="hidden xs:inline">Cancel & Go Back</span>
                <span className="inline xs:hidden">Cancel</span>
              </button>
            </div>
          </div>

          {/* Two Column Layout Container */}
          <div className="max-w-full mx-auto px-2 sm:px-3 lg:px-4 py-6 sm:py-8">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Left Column - Editor */}
              <div className="w-full lg:w-3/5 xl:w-3/5">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
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

                  {/* Image Upload Info Box */}
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 text-base flex-shrink-0">
                        💡
                      </span>
                      <span>
                        Images will be uploaded in their original format and
                        quality (up to 5MB each).
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Preview */}
              <div className="w-full lg:w-2/5 xl:w-2/5">
                <div className="lg:sticky lg:top-24">
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePost;
