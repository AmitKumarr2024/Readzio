import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PostEditor from "../CreatePost/PostEditor";

const EditPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);

  // Editable fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [postType, setPostType] = useState("");
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    const storedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const foundPost = storedPosts.find((p) => p.id === id);
    if (foundPost) {
      setPost(foundPost);
      setTitle(foundPost.title);
      setCategory(foundPost.category);
      setPostType(foundPost.postType);
      setBlocks(foundPost.blocks);
    } else {
      setPost(null);
    }
  }, [id]);

  if (!post) {
    return <div className="p-6 text-center text-red-500">Post not found.</div>;
  }

  const handleSave = () => {
    if (!title.trim()) {
      alert("Title cannot be empty");
      return;
    }
    if (blocks.length === 0) {
      alert("Add some content blocks");
      return;
    }

    const storedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const updatedPosts = storedPosts.map((p) =>
      p.id === id ? { ...p, title, category, postType, blocks } : p
    );
    localStorage.setItem("posts", JSON.stringify(updatedPosts));

    alert("Post updated!");
    navigate(`/post/${id}`);
  };

  return (
    <div className="max-w-7xl mx-auto mt-32 p-6 bg-white rounded shadow">
      <h1 className="text-3xl text-center font-bold mb-6">Edit Post</h1>

      <label className="block mb-2 font-semibold">Title</label>
      <input
        type="text"
        className="w-full mb-4 p-2 border rounded"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label className="block mb-2 font-semibold">Category</label>
      <input
        type="text"
        className="w-full mb-4 p-2 border rounded"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />

      <label className="block mb-2 font-semibold">Post Type</label>
      <input
        type="text"
        className="w-full mb-4 p-2 border rounded"
        value={postType}
        onChange={(e) => setPostType(e.target.value)}
      />
      <div className="w-full">
        <label className="block mb-2 font-semibold">Content Blocks</label>
        <PostEditor
          size={100}
          blocks={blocks}
          setBlocks={setBlocks}
          postType={postType}
          category={category}
          title={title}
          setTitle={setTitle}
        />

        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-4"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default EditPost;
