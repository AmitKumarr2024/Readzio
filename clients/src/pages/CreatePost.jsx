import React, { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import CategorySelector from "../components/CreatePost/CategorySelector";
import PostTypeSelector from "../components/CreatePost/PostTypeSelector";
import PostEditor from "../components/CreatePost/PostEditor";
import PostPreviewList from "../components/CreatePost/PostPreviewList";
import { useNavigate } from "react-router-dom";

const CreatePost = () => {
  const navigate = useNavigate();
  // Modal states
  const [showPostTypeModal, setShowPostTypeModal] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Post creation states
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [postType, setPostType] = useState("");

  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [allPosts, setAllPosts] = useState([]);

  // Load from localStorage
  useEffect(() => {
    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const savedCategories =
      JSON.parse(localStorage.getItem("categories")) || [];
    setAllPosts(savedPosts);
    setCategories(savedCategories);
  }, []);

  // Save to localStorage when posts or categories change
  useEffect(() => {
    localStorage.setItem("posts", JSON.stringify(allPosts));
  }, [allPosts]);

  useEffect(() => {
    localStorage.setItem("categories", JSON.stringify(categories));
  }, [categories]);

  const filteredPosts = selectedCategory
    ? allPosts.filter((p) => p.category === selectedCategory)
    : allPosts;

  const addCategory = (newCat) => {
    setCategories((prev) => [...prev, newCat]);
    setSelectedCategory(newCat);
  };

  // When post type is selected, open category modal
  const handlePostTypeSelect = (type) => {
    setPostType(type);
    setShowPostTypeModal(false);
    setShowCategoryModal(true);
  };

  // When category selection is done, start editor
  const handleCategoryContinue = () => {
    setShowCategoryModal(false);
  };

  const createPost = () => {
    if (!title.trim()) return toast.error("Please enter a title");
    if (blocks.length === 0) return toast.error("Please add content blocks");
    if (!postType) return toast.error("Please select a post type");
    if (!selectedCategory) return toast.error("Please select a category");

    // Generate unique ID for the post
    const id =
      Date.now().toString() + Math.floor(Math.random() * 1000).toString();

    const newPost = {
      id, // Unique ID
      postType,
      category: selectedCategory,
      title,
      blocks,
    };
    console.log("id", id);

    setAllPosts([...allPosts, newPost]);
    setTitle("");
    setBlocks([]);
    toast.success("Post created successfully! ");
    navigate("/");
  };

  return (
    <div className="flex flex-col md:flex-row h-screen mt-20">
      {/* Post Type Modal (Step 1) */}
      {showPostTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <PostTypeSelector
            onSelect={handlePostTypeSelect}
            onClose={() => setShowPostTypeModal(false)}
          />
        </div>
      )}

      {/* Category Modal (Step 2) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <CategorySelector
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            addCategory={addCategory}
            onBack={() => {
              setShowCategoryModal(false);
              setShowPostTypeModal(true);
            }}
            onContinue={handleCategoryContinue}
            onClose={() => setShowCategoryModal(false)}
          />
        </div>
      )}

      {/* Main Editor */}
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
            allPosts={filteredPosts}
            deletePost={(idToDelete) =>
              setAllPosts(allPosts.filter((post) => post.id !== idToDelete))
            }
            createPost={createPost}
            currentDraftPost={{ title, blocks }}
          />
        </div>
      )}

      {/* Optional Debug Button */}
      <button
        onClick={() => {
          localStorage.clear();
          window.location.reload();
        }}
        className="absolute top-20 right-1 bg-red-600 text-white px-4 py-2 rounded shadow-lg"
      >
        Clear LocalStorage
      </button>
    </div>
  );
};

export default CreatePost;
