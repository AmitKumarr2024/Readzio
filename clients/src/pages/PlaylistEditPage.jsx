// clients/src/pages/PlaylistEditPage.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPlaylistById,
  updatePlaylist,
} from "../../src/store/playlistSlice";
import { toast } from "react-hot-toast";
import { FaSpinner } from "react-icons/fa";

const PlaylistEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { currentPlaylist, currentPlaylistStatus, currentPlaylistError } =
    useSelector((state) => state.playlist);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchPlaylistById(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (currentPlaylist) {
      setFormData({
        name: currentPlaylist.name || "",
        description: currentPlaylist.description || "",
        isPrivate: currentPlaylist.isPrivate || false,
      });
    }
  }, [currentPlaylist]);

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
      toast.error("Playlist name is required");
      return;
    }

    if (formData.name.length > 100) {
      toast.error("Playlist name must be less than 100 characters");
      return;
    }

    try {
      setSubmitLoading(true);
      await dispatch(
        updatePlaylist({ playlistId: id, updates: formData })
      ).unwrap();
      toast.success("Playlist updated successfully");
      navigate(`/playlist/${id}`);
    } catch (error) {
      toast.error(error || "Failed to update playlist");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (currentPlaylistStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-3xl text-blue-500" />
      </div>
    );
  }

  if (currentPlaylistStatus === "failed") {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{currentPlaylistError}</p>
        <button
          onClick={() => dispatch(fetchPlaylistById(id))}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!currentPlaylist) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-2">Playlist Not Found</h3>
        <button
          onClick={() => navigate("/profile/playlists")}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg"
        >
          Back to Playlists
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Edit Playlist</h1>
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
            type="button"
            onClick={() => navigate("/profile/playlists")}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => navigate(`/playlist/${id}`)}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitLoading ? <FaSpinner className="animate-spin" /> : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PlaylistEditPage;
