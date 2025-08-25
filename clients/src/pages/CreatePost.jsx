import React, { useState, useEffect, useMemo, useCallback } from "react";
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

  const MAX_PAYLOAD_SIZE = 16 * 1024 * 1024; // 16 MB
  const MAX_TEXT_BLOCK_SIZE = 100 * 1024; // 100KB
  const MAX_TABLE_BLOCK_SIZE = 200 * 1024; // 200KB
  const MAX_IMAGE_COUNT = 20; // 20 images
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image

  useEffect(() => {
    const savedPostType = localStorage.getItem("postType");
    if (savedPostType) {
      dispatch(setPostType(savedPostType));
      setShowPostTypeModal(false);
      setShowCategoryModal(true);
    }
    dispatch(fetchCategories()).catch((e) => {
      console.error("[CreatePost] Fetch categories error:", e);
      toast.error("Failed to load categories.", { position: "top-right" });
    });
  }, [dispatch]);

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
      if (isSubmitting) {
        // console.log("[CreatePost] Submission already in progress");
        return;
      }
      setIsSubmitting(true);

      if (!title.trim()) {
        toast.error("Please enter a title", { position: "top-right" });
        setIsSubmitting(false);
        return;
      }
      if (title.length < 3) {
        toast.error("Title must be at least 3 characters long", {
          position: "top-right",
        });
        setIsSubmitting(false);
        return;
      }
      if (!blocks.length) {
        toast.error("Please add content blocks", { position: "top-right" });
        setIsSubmitting(false);
        return;
      }
      if (!postType && !localStorage.getItem("postType")) {
        toast.error("Please select a post type", { position: "top-right" });
        setIsSubmitting(false);
        return;
      }
      if (!selectedCategoryId) {
        toast.error("Please select a category", { position: "top-right" });
        setIsSubmitting(false);
        return;
      }
      if (!metaData.tags?.length) {
        toast.error("Please provide at least one tag", {
          position: "top-right",
        });
        setIsSubmitting(false);
        return;
      }
      if (!/^[a-z]{2}$/i.test(metaData.language)) {
        toast.error("Invalid language code", { position: "top-right" });
        setIsSubmitting(false);
        return;
      }

      const imageBlocks = blocks.filter((b) => b.type === "image");
      if (imageBlocks.length > MAX_IMAGE_COUNT) {
        toast.error(`Maximum ${MAX_IMAGE_COUNT} images allowed per post`, {
          position: "top-right",
        });
        setIsSubmitting(false);
        return;
      }

      for (const [index, block] of blocks.entries()) {
        if (block.type === "text") {
          const textSize = new TextEncoder().encode(block.value || "").length;
          if (textSize > MAX_TEXT_BLOCK_SIZE) {
            toast.error(
              `Text block at position ${
                index + 1
              } too large (>100KB). Please reduce content.`,
              { position: "top-right" }
            );
            setIsSubmitting(false);
            return;
          }
        }
        if (block.type === "table") {
          if (!block.data?.length || !block.data.some((row) => row.length)) {
            toast.error(
              `Table block at position ${index + 1} must have non-empty data`,
              { position: "top-right" }
            );
            setIsSubmitting(false);
            return;
          }
          const tableSize = new TextEncoder().encode(
            JSON.stringify(block.data)
          ).length;
          if (tableSize > MAX_TABLE_BLOCK_SIZE) {
            toast.error(
              `Table block at position ${
                index + 1
              } too large (>200KB). Please reduce table data.`,
              { position: "top-right" }
            );
            setIsSubmitting(false);
            return;
          }
        }
        if (block.type === "image" && block.src && !block.isEmbed) {
          try {
            const file = await fetch(block.src).then((res) => res.blob());
            if (file.size > MAX_IMAGE_SIZE) {
              toast.error(`Image at position ${index + 1} exceeds 5MB limit`, {
                position: "top-right",
              });
              setIsSubmitting(false);
              return;
            }
          } catch (err) {
            console.error(
              `[CreatePost] Image validation failed at index ${index + 1}:`,
              err
            );
            toast.error(`Invalid image at position ${index + 1}`, {
              position: "top-right",
            });
            setIsSubmitting(false);
            return;
          }
        }
      }

      let thumbnail = metaData.thumbnail;
      let thumbnailSize = metaData.thumbnailSize || 0;
      if (
        thumbnail &&
        thumbnail.startsWith("data:image") &&
        !metaData.isEmbed
      ) {
        try {
          const file = await fetch(thumbnail).then((res) => res.blob());
          if (file.size > MAX_IMAGE_SIZE) {
            toast.error("Thumbnail exceeds 5MB limit", {
              position: "top-right",
            });
            setIsSubmitting(false);
            return;
          }
          thumbnailSize = file.size;
        } catch (err) {
          console.error("[CreatePost] Thumbnail validation failed:", err);
          toast.error("Invalid thumbnail", { position: "top-right" });
          setIsSubmitting(false);
          return;
        }
      }

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
      const payloadString = JSON.stringify(postData);
      const payloadSize = new TextEncoder().encode(payloadString).length;
      if (payloadSize > MAX_PAYLOAD_SIZE) {
        toast.error(
          "Post data exceeds 8MB. Reduce images (max 20), text, or table content.",
          { position: "top-right" }
        );
        setIsSubmitting(false);
        return;
      }

      try {
        // console.log("[CreatePost] Sending postData:", postData);
        const resultAction = await dispatch(createPosts(postData)).unwrap();
        // console.log("[CreatePost] Server response:", resultAction);
        toast.success("Post created successfully!", { position: "top-right" });
        setTitle("");
        setBlocks([]);
        dispatch(resetPostMeta());
        localStorage.removeItem("postType");
        navigate(`/post/${resultAction.post.slug}`);
      } catch (err) {
        console.error("[CreatePost] Post creation failed:", err);

        // Handle timeout/server errors differently
        if (err?.isTimeout || err?.isServerError) {
          // Don't show error immediately - check if post was created
          const slug = slugify(title, { lower: true, strict: true });

          try {
            // console.log(
            //   "[CreatePost] Checking if post exists after timeout:",
            //   slug
            // );
            const checkPost = await asyncRetry(
              () => dispatch(getSinglePost({ slug, isGuest: false })).unwrap(),
              { retries: 5, minTimeout: 2000 }
            );

            if (checkPost) {
              // console.log(
              //   "[CreatePost] Post was created despite timeout:",
              //   checkPost.slug
              // );
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
          } catch (checkErr) {
            console.error("[CreatePost] Post was not found");
          }

          // Show timeout-specific error
          toast.error(
            err?.message ||
              "Request timed out. Please check if your post was created.",
            {
              position: "top-right",
            }
          );
        } else {
          // Handle normal errors
          if (
            err?.message?.includes(
              "A post with this title was recently created"
            )
          ) {
            toast.error(
              "Please wait before creating another post with the same title.",
              {
                position: "top-right",
              }
            );
          } else {
            toast.error(err?.message || "Failed to create post", {
              position: "top-right",
            });
          }

          // Only retry for non-timeout errors if it might be a duplicate title issue
          if (
            err?.message?.includes(
              "A post with this title was recently created"
            )
          ) {
            const slug = slugify(title, { lower: true, strict: true });
            try {
              // console.log(
              //   "[CreatePost] Checking for duplicate post with slug:",
              //   slug
              // );
              const checkPost = await asyncRetry(
                () =>
                  dispatch(getSinglePost({ slug, isGuest: false })).unwrap(),
                { retries: 3, minTimeout: 1000 }
              );

              if (checkPost) {
                // console.log(
                //   "[CreatePost] Duplicate post found, redirecting:",
                //   checkPost.slug
                // );
                toast.success("Post already exists. Redirecting...", {
                  position: "top-right",
                });
                navigate(`/post/${checkPost.slug}`);
              }
            } catch (checkErr) {
              console.error("[CreatePost] No duplicate post found");
            }
          }
        }
      } finally {
        setIsSubmitting(false);
      }
    }, 1000),
    [dispatch, title, blocks, postType, selectedCategoryId, isSubmitting]
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
