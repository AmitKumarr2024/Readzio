import React, { useState, useEffect, useMemo } from "react";
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

// Async retry utility
const asyncRetry = async (fn, options = {}) => {
  const { retries = 3, minTimeout = 1000 } = options;
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
  const { post, createLoading, createError } = useSelector(
    (state) => state.post
  );
  const { postType, category: selectedCategoryId } = useSelector(
    (state) => state.postMeta
  );
  const { categories } = useSelector((state) => state.categories);

  const MAX_PAYLOAD_SIZE = 8 * 1024 * 1024; // 8MB
  const MAX_TEXT_BLOCK_SIZE = 100 * 1024; // 100KB
  const MAX_TABLE_BLOCK_SIZE = 200 * 1024; // 200KB
  const MAX_IMAGE_COUNT = 20; // 20 images
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image

  const compressImage = async (file) => {
    const image = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      if (file.size > MAX_IMAGE_SIZE) {
        return reject(new Error("Image size exceeds 5MB limit"));
      }

      reader.onload = (e) => {
        image.src = e.target.result;
        image.onload = () => {
          const maxWidth = 2400;
          const maxHeight = 2400;
          let { width, height } = image;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(image, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              const reader = new FileReader();
              reader.onloadend = () =>
                resolve({ src: reader.result, size: blob.size });
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            },
            "image/webp",
            0.95
          );
        };
        image.onerror = reject;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

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

  const handleCreatePost = async (metaData) => {
    if (!title.trim())
      return toast.error("Please enter a title", { position: "top-right" });
    if (!blocks.length)
      return toast.error("Please add content blocks", {
        position: "top-right",
      });
    if (!postType && !localStorage.getItem("postType"))
      return toast.error("Please select a post type", {
        position: "top-right",
      });
    if (!selectedCategoryId)
      return toast.error("Please select a category", { position: "top-right" });
    if (!metaData.tags?.length)
      return toast.error("Please provide at least one tag", {
        position: "top-right",
      });
    if (!/^[a-z]{2}$/i.test(metaData.language))
      return toast.error("Invalid language code", { position: "top-right" });

    const imageBlocks = blocks.filter((b) => b.type === "image");
    if (imageBlocks.length > MAX_IMAGE_COUNT) {
      return toast.error(`Maximum ${MAX_IMAGE_COUNT} images allowed per post`, {
        position: "top-right",
      });
    }

    for (const [index, block] of blocks.entries()) {
      if (block.type === "text") {
        const textSize = new TextEncoder().encode(block.value || "").length;
        if (textSize > MAX_TEXT_BLOCK_SIZE) {
          return toast.error(
            `Text block at position ${
              index + 1
            } too large (>100KB). Please reduce content.`,
            { position: "top-right" }
          );
        }
      }
      if (block.type === "table") {
        if (!block.data?.length || !block.data.some((row) => row.length)) {
          return toast.error(
            `Table block at position ${index + 1} must have non-empty data`,
            { position: "top-right" }
          );
        }
        const tableSize = new TextEncoder().encode(
          JSON.stringify(block.data)
        ).length;
        if (tableSize > MAX_TABLE_BLOCK_SIZE) {
          return toast.error(
            `Table block at position ${
              index + 1
            } too large (>200KB). Please reduce table data.`,
            { position: "top-right" }
          );
        }
      }
    }

    const updatedBlocks = await Promise.all(
      blocks.map(async (block, index) => {
        if (
          block.type === "image" &&
          block.src &&
          block.src.startsWith("data:image") &&
          !block.isEmbed
        ) {
          try {
            const file = await fetch(block.src).then((res) => res.blob());
            const compressed = await compressImage(file);
            return {
              ...block,
              src: compressed.src,
              size: compressed.size,
              blocked: false,
            };
          } catch (err) {
            console.error(
              `[CreatePost] Image compression failed at index ${index + 1}:`,
              err
            );
            toast.error(`Failed to compress image at position ${index + 1}`, {
              position: "top-right",
            });
            throw err;
          }
        }
        return { ...block, blocked: false };
      })
    );

    let compressedThumbnail = metaData.thumbnail;
    let thumbnailSize = metaData.thumbnailSize || 0;
    if (
      compressedThumbnail &&
      compressedThumbnail.startsWith("data:image") &&
      !metaData.isEmbed
    ) {
      try {
        const file = await fetch(compressedThumbnail).then((res) => res.blob());
        const compressed = await compressImage(file);
        compressedThumbnail = compressed.src;
        thumbnailSize = compressed.size;
      } catch (err) {
        console.error("[CreatePost] Thumbnail compression failed:", err);
        toast.error("Failed to compress thumbnail", { position: "top-right" });
        throw err;
      }
    }

    const postData = {
      postType,
      category: selectedCategoryId,
      title,
      blocks: updatedBlocks,
      thumbnail: compressedThumbnail,
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
      return toast.error(
        "Post data exceeds 8MB. Reduce images (max 20), text, or table content.",
        { position: "top-right" }
      );
    }

    try {
      console.log("[CreatePost] Sending postData:", postData);
      const resultAction = await dispatch(createPosts(postData)).unwrap();
      console.log("[CreatePost] Server response:", resultAction);
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

      // Retry getSinglePost to handle potential indexing delays
      const slug = slugify(title, { lower: true, strict: true });
      try {
        console.log("[CreatePost] Retrying getSinglePost with slug:", slug);
        const checkPost = await asyncRetry(
          () => dispatch(getSinglePost({ slug, isGuest: false })).unwrap(),
          { retries: 3, minTimeout: 2000 }
        );
        if (checkPost) {
          console.log("[CreatePost] Post found on retry:", checkPost.slug);
          toast.success(
            "Post was created but response was delayed. Redirecting...",
            { position: "top-right" }
          );
          navigate(`/post/${checkPost.slug}`);
        }
      } catch (checkErr) {
        console.error("[CreatePost] Check post failed:", checkErr);
        toast.error("Failed to verify post creation", {
          position: "top-right",
        });
      }
    }
  };

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
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePost;
