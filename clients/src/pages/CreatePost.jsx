import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { setCategory, setPostType, resetPostMeta } from "../store/Post/postMetaSlice";

const asyncRetry = async (fn, { retries = 5, minTimeout = 2000 } = {}) => {
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
  const { postType, category: selectedCategoryId } = useSelector((s) => s.postMeta);
  const { categories } = useSelector((s) => s.categories);

  // ---- refs / guards
  const isSubmittingRef = useRef(false);
  const timersRef = useRef(new Set()); // track timeouts to clear on unmount

  // ---------- EFFECTS

  // Fetch categories ONCE on mount
  useEffect(() => {
    let mounted = true;
    dispatch(fetchCategories())
      .unwrap?.()
      .catch((e) => {
        if (!mounted) return;
        console.error("[CreatePost] Fetch categories error:", e);
        toast.error("Failed to load categories.", { position: "top-right" });
      });
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  // Handle saved postType and modal transitions when categories are available
  useEffect(() => {
    const savedPostType = localStorage.getItem("postType");
    if (savedPostType) {
      dispatch(setPostType(savedPostType));
      if (categories && categories.length > 0) {
        setShowPostTypeModal(false);
        setShowCategoryModal(true);
      }
    }
  }, [dispatch, categories]); // no fetch here, just UI state

  // Cleanup on unmount — cancel timers and reset flags
  useEffect(() => {
    return () => {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      // clear all pending timers
      for (const t of timersRef.current) clearTimeout(t);
      timersRef.current.clear();
    };
  }, []);

  // ---------- MEMOS

  const categoryMap = useMemo(() => {
    const map = {};
    categories?.forEach?.((cat) => {
      map[cat._id] = cat.name;
    });
    return map;
  }, [categories]);

  const posts = post ? [post] : [];
  const filteredPosts = selectedCategoryId ? posts.filter((p) => p.category === selectedCategoryId) : posts;

  // ---------- HELPERS

  const timeout = (ms) =>
    new Promise((_, rej) => {
      const t = setTimeout(() => rej({ isTimeout: true, message: `Timed out after ${ms}ms` }), ms);
      timersRef.current.add(t);
    });

  const fetchWithTimeout = async (url, ms = 7000) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), ms);
    timersRef.current.add(t);
    try {
      const res = await fetch(url, { signal: controller.signal });
      return res;
    } finally {
      clearTimeout(t);
      timersRef.current.delete(t);
    }
  };

  const validateBeforeSubmit = async (metaData) => {
    // title
    if (!title.trim()) throw new Error("Please enter a title");
    if (title.trim().length < 3) throw new Error("Title must be at least 3 characters long");
    // content
    if (!blocks.length) throw new Error("Please add content blocks");
    if (!postType && !localStorage.getItem("postType")) throw new Error("Please select a post type");
    if (!selectedCategoryId) throw new Error("Please select a category");
    if (!metaData?.tags?.length) throw new Error("Please provide at least one tag");
    if (!/^[a-z]{2}$/i.test(metaData.language || "")) throw new Error("Invalid language code");

    // images count
    const imageBlocks = blocks.filter((b) => b.type === "image");
    if (imageBlocks.length > MAX_IMAGE_COUNT) throw new Error(`Maximum ${MAX_IMAGE_COUNT} images allowed per post`);

    // validate blocks (with timeouts to avoid hangs)
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      if (block.type === "text") {
        const textSize = new TextEncoder().encode(block.value || "").length;
        if (textSize > MAX_TEXT_BLOCK_SIZE) {
          throw new Error(`Text block at position ${i + 1} too large (>100KB). Please reduce content.`);
        }
      }

      if (block.type === "table") {
        if (!block.data?.length || !block.data.some((row) => row.length)) {
          throw new Error(`Table block at position ${i + 1} must have non-empty data`);
        }
        const tableSize = new TextEncoder().encode(JSON.stringify(block.data)).length;
        if (tableSize > MAX_TABLE_BLOCK_SIZE) {
          throw new Error(`Table block at position ${i + 1} too large (>200KB). Please reduce table data.`);
        }
      }

      if (block.type === "image" && block.src && !block.isEmbed) {
        try {
          const res = await Promise.race([fetchWithTimeout(block.src, 7000), timeout(9000)]);
          const file = await res.blob();
          if (file.size > MAX_IMAGE_SIZE) {
            throw new Error(`Image at position ${i + 1} exceeds 5MB limit`);
          }
        } catch (err) {
          if (err?.name === "AbortError" || err?.isTimeout) {
            throw new Error(`Image at position ${i + 1} validation timed out`);
          }
          throw new Error(`Invalid image at position ${i + 1}`);
        }
      }
    }

    // thumbnail
    let thumbnail = metaData.thumbnail;
    let thumbnailSize = metaData.thumbnailSize || 0;
    if (thumbnail && thumbnail.startsWith("data:image") && !metaData.isEmbed) {
      try {
        const res = await Promise.race([fetchWithTimeout(thumbnail, 7000), timeout(9000)]);
        const file = await res.blob();
        if (file.size > MAX_IMAGE_SIZE) throw new Error("Thumbnail exceeds 5MB limit");
        thumbnailSize = file.size;
      } catch (err) {
        if (err?.name === "AbortError" || err?.isTimeout) throw new Error("Thumbnail validation timed out");
        throw new Error("Invalid thumbnail");
      }
    }

    // payload size
    const postData = {
      postType,
      category: selectedCategoryId,
      title,
      blocks,
      thumbnail,
      thumbnailSize,
      excerpt: metaData.excerpt || "",
      tags: metaData.tags,
      language: metaData.language,
      isEmbed: metaData.isEmbed || false,
      isFeatured: metaData.isFeatured || false,
      isPinned: metaData.isPinned || false,
    };
    const payloadSize = new TextEncoder().encode(JSON.stringify(postData)).length;
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      throw new Error("Post data exceeds 40MB. Reduce images (max 40), text, or table content.");
    }

    return postData;
  };

  // ---------- ACTIONS

  // No debounce: just guard with ref. Debounce + async can swallow calls/errors.
  const handleCreatePost = useCallback(
    async (metaData) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      try {
        // 1) Validate (with timeouts)
        const postData = await validateBeforeSubmit(metaData);

        // 2) Submit with an overall timeout (e.g., 25s)
        const resultAction = await Promise.race([
          dispatch(createPosts(postData)).unwrap(),
          timeout(60000),
        ]);

        toast.success("Post created successfully!", { position: "top-right" });
        // reset local + meta
        setTitle("");
        setBlocks([]);
        dispatch(resetPostMeta());
        localStorage.removeItem("postType");

        // 3) Navigate to created post
        navigate(`/post/${resultAction.post.slug}`);
      } catch (err) {
        console.error("[CreatePost] Post creation failed:", err);

        // If it was a timeout/server hang, try to check if the post was actually created
        if (err?.isTimeout || err?.isServerError) {
          const slug = slugify(title, { lower: true, strict: true });
          try {
            const checkPost = await asyncRetry(
              () => dispatch(getSinglePost({ slug, isGuest: false })).unwrap(),
              { retries: 3, minTimeout: 1500 }
            );
            if (checkPost) {
              toast.success("Post created successfully!", { position: "top-right" });
              setTitle("");
              setBlocks([]);
              dispatch(resetPostMeta());
              localStorage.removeItem("postType");
              navigate(`/post/${checkPost.slug}`);
              return;
            }
          } catch {
            // fallthrough to error toast below
          }
          toast.error(err?.message || "Request timed out. Please check if your post was created.", {
            position: "top-right",
          });
        } else {
          // Normal errors
          const msg = err?.message || "Failed to create post";
          toast.error(msg, { position: "top-right" });

          if (msg.includes("A post with this title was recently created")) {
            const slug = slugify(title, { lower: true, strict: true });
            try {
              const checkPost = await asyncRetry(
                () => dispatch(getSinglePost({ slug, isGuest: false })).unwrap(),
                { retries: 3, minTimeout: 1000 }
              );
              if (checkPost) {
                toast.success("Post already exists. Redirecting...", { position: "top-right" });
                navigate(`/post/${checkPost.slug}`);
              }
            } catch {
              /* ignore */
            }
          }
        }
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [dispatch, navigate, postType, selectedCategoryId, title, blocks]
  );

  // ---------- OTHER HANDLERS

  const handleDeletePost = (id) => {
    dispatch(deletePost(id))
      .unwrap()
      .then(() => toast.success("Post deleted", { position: "top-right" }))
      .catch((err) => {
        console.error("[CreatePost] Delete post failed:", err);
        toast.error(err?.message || "Failed to delete post", { position: "top-right" });
      });
  };

  const handleUpdateDraft = (draft) => {
    setTitle(draft.title || "");
    setBlocks(draft.blocks || []);
  };

  // ---------- RENDER

  return (
    <div className="flex flex-col md:flex-row bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      {showPostTypeModal && (
        <div id="post-type-modal" className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
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
        <div id="category-modal" className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
          <CategorySelector
            onBack={() => {
              setShowCategoryModal(false);
              setShowPostTypeModal(true);
            }}
            onContinue={(selectedCategory) => {
              if (!selectedCategory?.id) {
                toast.error("Please select a category", { position: "top-right" });
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

      {!showPostTypeModal && !showCategoryModal && (
        <div id="create-post-main" className="min-w-full flex container justify-around items-center flex-col flex-wrap md:flex-row">
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
              categoryName={categoryMap[selectedCategoryId] || selectedCategoryId}
            />
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Images will be uploaded in their original format and quality (up to 5MB).
            </div>
          </div>

          <div id="post-preview-list-wrapper" className="w-full md:w-2/5 md:pl-1">
            <PostPreviewList
              currentDraftPost={{ title, blocks }}
              onUpdateDraft={handleUpdateDraft}
              postType={postType}
              category={selectedCategoryId}
              categoryName={categoryMap[selectedCategoryId] || selectedCategoryId}
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
