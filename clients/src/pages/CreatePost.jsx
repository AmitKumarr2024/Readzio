import React, { useState, useEffect, useMemo } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import CategorySelector from "../components/CreatePost/CategorySelector";
import PostTypeSelector from "../components/CreatePost/PostTypeSelector";
import PostEditor from "../components/CreatePost/PostEditor";
import PostPreviewList from "../components/CreatePost/PostPreviewList";
import LoadingBar from "../Utils/LoadingBar";
import { createPosts, deletePost } from "../store/postSlice";
import { fetchCategories } from "../store/categorySlice";
import {
  setCategory,
  setPostType,
  resetPostMeta,
} from "../store/Post/postMetaSlice";

// Creates new post with category and type selection
const CreatePost = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showPostTypeModal, setShowPostTypeModal] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([]);
  const { post, createLoading, createError } = useSelector((state) => state.post);
  const { postType, category: selectedCategoryId } = useSelector((state) => state.postMeta);
  const { categories } = useSelector((state) => state.categories);

  // Fetch categories
  useEffect(() => {
    try {
      dispatch(fetchCategories());
    } catch (e) {
      console.error("[CreatePost] Fetch categories error:", e);
      toast.error("Failed to load categories.");
    }
  }, [dispatch]);

  // Create category map
  const categoryMap = useMemo(() => {
    try {
      const map = {};
      categories.forEach((cat) => {
        map[cat._id] = cat.name;
      });
      return map;
    } catch (e) {
      console.error("[CreatePost] Category map error:", e);
      return {};
    }
  }, [categories]);

  const posts = post ? [post] : [];
  const filteredPosts = selectedCategoryId
    ? posts.filter((p) => p.category === selectedCategoryId)
    : posts;

  // Handle category selection
  const handleCategoryContinue = (selectedCategory) => {
    if (!selectedCategory?.id) return toast.error("Please select a category");
    dispatch(setCategory(selectedCategory.id));
    setShowCategoryModal(false);
  };

  // Handle post creation
  const handleCreatePost = async (metaData) => {
    if (!title.trim()) return toast.error("Please enter a title");
    if (!blocks.length) return toast.error("Please add content blocks");
    if (!postType) return toast.error("Please select a post type");
    if (!selectedCategoryId) return toast.error("Please select a category");
    if (!metaData.tags?.length) return toast.error("Please provide at least one tag");
    if (!/^[a-z]{2}$/i.test(metaData.language)) return toast.error("Invalid language code");

    const updatedBlocks = blocks.map((block) => ({
      ...block,
      blocked: false,
    }));

    const postData = {
      postType,
      category: selectedCategoryId,
      title,
      blocks: updatedBlocks,
      ...metaData,
    };

    try {
      const resultAction = await dispatch(createPosts(postData)).unwrap();
      toast.success("Post created successfully!");
      setTitle("");
      setBlocks([]);
      dispatch(resetPostMeta());
      navigate(`/post/${resultAction.post.slug}`);
    } catch (err) {
      console.error("[CreatePost] Post creation failed:", err);
      toast.error(err?.message || "Post creation failed");
    }
  };

  // Handle post deletion
  const handleDeletePost = (id) => {
    dispatch(deletePost(id))
      .unwrap()
      .then(() => toast.success("Post deleted"))
      .catch((err) => {
        console.error("[CreatePost] Delete post failed:", err);
        toast.error(err.message || "Failed to delete post");
      });
  };

  // Update draft
  const handleUpdateDraft = (draft) => {
    setTitle(draft.title || "");
    setBlocks(draft.blocks || []);
  };

  return (
    <div className="flex flex-col md:flex-row bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
     
      <LoadingBar loading={createLoading} />
      {showPostTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
          <PostTypeSelector
            postType={postType}
            setPostType={(value) => dispatch(setPostType(value))}
            onContinue={() => {
              setShowPostTypeModal(false);
              setShowCategoryModal(true);
            }}
            onClose={() => navigate("/")}
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
            onContinue={handleCategoryContinue}
            onClose={() => navigate("/")}
          />
        </div>
      )}
      {!showPostTypeModal && !showCategoryModal && (
        <div className="min-w-full flex container justify-around items-center flex-col flex-wrap md:flex-row">
          <div className="w-full flex justify-start px-4 pt-10 pl-11">
            <button
              onClick={() => navigate("/")}
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
              categoryName={categoryMap[selectedCategoryId] || selectedCategoryId}
            />
          </div>
          <div className="w-full md:w-2/5 md:pl-1">
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
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePost;