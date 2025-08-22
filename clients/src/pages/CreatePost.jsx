import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
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

  // Client-side image compression
  const compressImage = async (file) => {
    const image = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      if (file.size > 2 * 1024 * 1024) {
        // Reduced to 2MB per image
        return reject(new Error("Image size exceeds 2MB limit"));
      }

      reader.onload = (e) => {
        image.src = e.target.result;
        image.onload = () => {
          const maxWidth = 400; // Reduced from 600
          const maxHeight = 400;
          let { width, height } = image;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(image, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            },
            "image/webp",
            0.2 // Reduced to 20% quality
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
      toast.error("Failed to load categories.");
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
    if (!selectedCategory?.id) return toast.error("Please select a category");
    dispatch(setCategory(selectedCategory.id));
    setShowCategoryModal(false);
  };

  const handleCreatePost = async (metaData) => {
    if (!title.trim()) return toast.error("Please enter a title");
    if (!blocks.length) return toast.error("Please add content blocks");
    if (!postType && !localStorage.getItem("postType"))
      return toast.error("Please select a post type");
    if (!selectedCategoryId) return toast.error("Please select a category");
    if (!metaData.tags?.length)
      return toast.error("Please provide at least one tag");
    if (!/^[a-z]{2}$/i.test(metaData.language))
      return toast.error("Invalid language code");

    // Limit number of images
    const imageBlocks = blocks.filter((b) => b.type === "image");
    if (imageBlocks.length > 3) {
      return toast.error("Maximum 3 images allowed per post");
    }

    // Compress images in blocks
    const updatedBlocks = await Promise.all(
      blocks.map(async (block) => {
        if (
          block.type === "image" &&
          block.src &&
          block.src.startsWith("data:image")
        ) {
          try {
            const file = await fetch(block.src).then((res) => res.blob());
            const compressedSrc = await compressImage(file);
            return { ...block, src: compressedSrc, blocked: false };
          } catch (err) {
            toast.error(err.message || "Failed to compress image");
            throw err;
          }
        }
        if (block.type === "table") {
          if (!block.data?.length || !block.data.some((row) => row.length)) {
            toast.error("Table block must have non-empty data");
            throw new Error("Invalid table block");
          }
        }
        return { ...block, blocked: false };
      })
    );

    // Compress thumbnail
    let compressedThumbnail = metaData.thumbnail;
    if (compressedThumbnail && compressedThumbnail.startsWith("data:image")) {
      try {
        const file = await fetch(compressedThumbnail).then((res) => res.blob());
        compressedThumbnail = await compressImage(file);
      } catch (err) {
        toast.error(err.message || "Failed to compress thumbnail");
        throw err;
      }
    }

    // Estimate payload size
    const postData = {
      postType,
      category: selectedCategoryId,
      title,
      blocks: updatedBlocks,
      thumbnail: compressedThumbnail,
      ...metaData,
    };
    const payloadSize = Buffer.byteLength(JSON.stringify(postData), "utf8");
    if (payloadSize > 6 * 1024 * 1024) {
      // Warn before sending
      return toast.error("Post data exceeds 6MB. Reduce images or content.");
    }

    try {
      const resultAction = await dispatch(createPosts(postData)).unwrap();
      toast.success("Post created successfully!");
      setTitle("");
      setBlocks([]);
      dispatch(resetPostMeta());
      localStorage.removeItem("postType");
      navigate(`/post/${resultAction.post.slug}`);
    } catch (err) {
      console.error("[CreatePost] Post creation failed:", err);
      if (err.message === "Payload exceeds 8MB limit") {
        toast.error(
          "Post data too large. Use fewer or smaller images (max 3)."
        );
      } else {
        toast.error(err?.message || "Post creation failed");
      }
      // Check if post was created
      const slug = slugify(title, { lower: true, strict: true });
      try {
        const checkPost = await dispatch(
          getSinglePost({ slug, isGuest: false })
        ).unwrap();
        if (checkPost) {
          toast.success(
            "Post was created but response was delayed. Redirecting..."
          );
          navigate(`/post/${checkPost.slug}`);
        }
      } catch (checkErr) {
        console.error("[CreatePost] Check post failed:", checkErr);
      }
    }
  };

  const handleDeletePost = (id) => {
    dispatch(deletePost(id))
      .unwrap()
      .then(() => toast.success("Post deleted"))
      .catch((err) => {
        console.error("[CreatePost] Delete post failed:", err);
        toast.error(err.message || "Failed to delete post");
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
