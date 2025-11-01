// clients/src/pages/postlistEditPage.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchpostlistById, updatepostlist } from "../../src/store/postlistSlice";
import { toast } from "react-hot-toast";
import { FaSpinner } from "react-icons/fa";

const postlistEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { currentpostlist, currentpostlistStatus, currentpostlistError } =
    useSelector((state) => state.postlist);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchpostlistById(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (currentpostlist) {
      setFormData({
        name: currentpostlist.name || "",
        description: currentpostlist.description || "",
        isPrivate: currentpostlist.isPrivate || false,
      });
    }
  }, [currentpostlist]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || submitLoading) return;

    if (formData.name.trim().length === 0) {
      toast.error("postlist name is required");
      return;
    }

    if (formData.name.length > 100) {
      toast.error("postlist name must be less than 100 characters");
      return;
    }

    try {
      setSubmitLoading(true);
      await dispatch(
        updatepostlist({ postlistId: id, updates: formData })
      ).unwrap();
      toast.success("postlist updated successfully");
      navigate(`/postlist/${id}`);
    } catch (error) {
      toast.error(error || "Failed to update postlist");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (currentpostlistStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-3xl text-blue-500" />
      </div>
    );
  }

  if (currentpostlistStatus === "failed") {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{currentpostlistError}</p>
        <button
          onClick={() => dispatch(fetchpostlistById(id))}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!currentpostlist) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-2">postlist Not Found</h3>
        <button
          onClick={() => navigate("/profile/postlists")}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg"
        >
          Back to postlists
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Edit postlist</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
            maxLength={100}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            name="isPrivate"
            checked={formData.isPrivate}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm font-medium">Private</label>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitLoading ? <FaSpinner className="animate-spin" /> : "Update"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/postlist/${id}`)}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default postlistEditPage;
