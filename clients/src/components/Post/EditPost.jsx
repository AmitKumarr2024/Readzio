import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PostEditor from "../CreatePost/PostEditor";
import { updatePost, getSinglePost } from "../../store/postSlice";
import LoadingBar from "../../Utils/LoadingBar";
import { toast } from "react-hot-toast";
import TagsInput from "../CreatePost/TagsInput";
import {
  resetPostMeta,
  setCategory,
  setPostType,
  setTags,
} from "../../store/Post/postMetaSlice";

const EditPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    currentPost,
    loading,
    error,
    updateLoading,
    updateError,
    updateSuccess,
  } = useSelector((state) => state.post);

  const { postType, category, tags } = useSelector((state) => state.postMeta);

  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([]);

  // Fetch post on mount
  useEffect(() => {
    dispatch(getSinglePost(id));
  }, [dispatch, id]);

  // Set local state when post loads
  useEffect(() => {
    if (currentPost && currentPost._id === id) {
      setTitle(currentPost.title || "");
      dispatch(setCategory(currentPost.category || ""));
      // Make sure postType is an array
      dispatch(
        setPostType(
          Array.isArray(currentPost.postType) ? currentPost.postType : []
        )
      );
      dispatch(setTags(currentPost.tags || []));
      setBlocks(currentPost.blocks || []);
    }

    return () => {
      dispatch(resetPostMeta());
    };
  }, [currentPost, id, dispatch]);

  // On successful update, redirect and toast
  useEffect(() => {
    if (updateSuccess && currentPost?.slug) {
      toast.success("Post updated successfully!");
      navigate(`/post/${currentPost.slug}`);
    }
  }, [updateSuccess, currentPost, navigate]);

  // On error during update
  useEffect(() => {
    if (updateError) {
      const msg =
        typeof updateError === "string"
          ? updateError
          : updateError.message || "Update failed";
      toast.error(msg);
    }
  }, [updateError]);

  // Save handler
  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    if (blocks.length === 0) {
      toast.error("Add some content blocks");
      return;
    }

    const updateData = {
      title,
      category,
      postType,
      tags,
      blocks,
    };

    dispatch(updatePost({ postId: id, updateData }));
    toast.success("Post updated successfully!");
    navigate(`/post/${currentPost.slug}`);
  };

  if (loading && !currentPost) {
    return <div className="p-6 text-center">Loading post...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        Error:{" "}
        {typeof error === "string" ? error : error.message || "Unknown error"}
      </div>
    );
  }

  if (!currentPost) {
    return <div className="p-6 text-center text-red-500">Post not found.</div>;
  }

  return (
    <>
      <LoadingBar loading={updateLoading} />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 md:p-8">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center text-white bg-red-500 hover:bg-red-600 rounded-full text-2xl transition-all duration-200"
            aria-label="Close"
          >
            &times;
          </button>

          <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
            Edit Post
          </h1>

          {/* Title */}
          <div className="mb-5">
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Title
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="mb-5">
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Category
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={category}
              onChange={(e) => dispatch(setCategory(e.target.value))}
            />
          </div>

          {/* Post Type - Multi Select */}
          <div className="mb-5">
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Post Type
            </label>
            <select
              className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={postType}
              onChange={(e) => dispatch(setPostType(e.target.value))}
            >
              <option value="">Select post type</option>
              <option value="Article">Article</option>
              <option value="Blog">Blog</option>
            </select>
          </div>

          {/* Tags Input */}
          <TagsInput />

          {/* Editor */}
          <div className="mb-6">
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Content Blocks
            </label>
            <PostEditor
              size={100}
              blocks={blocks}
              setBlocks={setBlocks}
              postType={postType}
              category={category}
              title={title}
              setTitle={setTitle}
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={updateLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-50"
          >
            {updateLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
};

export default EditPost;
