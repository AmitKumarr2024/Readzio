import React, { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import CategorySelector from "../components/CreatePost/CategorySelector";
import PostTypeSelector from "../components/CreatePost/PostTypeSelector";
import PostEditor from "../components/CreatePost/PostEditor";
import PostPreviewList from "../components/CreatePost/PostPreviewList";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createPosts, deletePost, getSinglePost } from "../store/postSlice";
import LoadingBar from "../Utils/LoadingBar";
import { setCategory } from "../store/Post/postMetaSlice";

const CreatePost = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showPostTypeModal, setShowPostTypeModal] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [slug, setSlug] = useState("");

  const { post, loading, error, createLoading, createError } = useSelector(
    (state) => state.post
  );

  const { postType, category: selectedCategory } = useSelector(
    (state) => state.postMeta
  );

  useEffect(() => {
    const savedCategories = JSON.parse(localStorage.getItem("categories")) || [];
    setCategories(savedCategories);
  }, []);

  useEffect(() => {
    if (slug) {
      dispatch(getSinglePost(slug));
    }
  }, [dispatch, slug]);

  const posts = post ? [post] : [];
  const filteredPosts = selectedCategory
    ? posts.filter((p) => p.category === selectedCategory)
    : posts;

  const addCategory = (newCat) => {
    const updatedCategories = [...categories, newCat];
    setCategories(updatedCategories);
    dispatch(setCategory(newCat));
    localStorage.setItem("categories", JSON.stringify(updatedCategories));
  };

  const handleCategoryContinue = () => {
    if (!selectedCategory) {
      toast.error("Please select or create a category");
      return;
    }
    setShowCategoryModal(false);
  };

  const handleCreatePost = async () => {
    if (!title.trim()) return toast.error("Please enter a title");
    if (blocks.length === 0) return toast.error("Please add content blocks");
    if (!postType) return toast.error("Please select a post type");
    if (!selectedCategory) return toast.error("Please select a category");

    const postData = {
      postType,
      category: selectedCategory,
      title,
      blocks,
    };

    try {
      const resultAction = await dispatch(createPosts(postData));
      if (createPosts.fulfilled.match(resultAction)) {
        toast.success("Post created successfully!");
        setTitle("");
        setBlocks([]);
        dispatch(resetPostMeta());
        navigate("/");
      } else {
        toast.error("Failed to create post");
      }
    } catch (err) {
      toast.error("An error occurred during post creation");
    }
  };

  const handleDeletePost = (idToDelete) => {
    dispatch(deletePost(idToDelete));
  };

  return (
    <div className="flex flex-col md:flex-row">
      <Toaster />
      <LoadingBar loading={createLoading} />

      {showPostTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <PostTypeSelector
            postType={postType}
            setPostType={(value) => dispatch(setPostType(value))}
            onContinue={() => {
              setShowPostTypeModal(false);
              setShowCategoryModal(true);
            }}
            onClose={() => {
              setShowPostTypeModal(false);
              navigate("/");
            }}
          />
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <CategorySelector
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={(value) => dispatch(setCategory(value))}
            addCategory={addCategory}
            onBack={() => {
              setShowCategoryModal(false);
              setShowPostTypeModal(true);
            }}
            onContinue={handleCategoryContinue}
            onClose={() => {
              setShowCategoryModal(false);
              navigate("/");
            }}
          />
        </div>
      )}

      {!showPostTypeModal && !showCategoryModal && (
        <div className="min-w-full flex container justify-around items-center flex-col flex-wrap md:flex-row">
          <PostEditor
            size={60}
            title={title}
            setTitle={setTitle}
            blocks={blocks}
            setBlocks={setBlocks}
            postType={postType}
            category={selectedCategory}
          />
          <PostPreviewList
            currentDraftPost={{ title, blocks }}
            postType={postType}
            category={selectedCategory}
            allPosts={filteredPosts}
            deletePost={handleDeletePost}
            createPost={handleCreatePost}
            loading={loading}
            error={error}
            createLoading={createLoading}
            createError={createError}
          />
        </div>
      )}
    </div>
  );
};

export default CreatePost;
