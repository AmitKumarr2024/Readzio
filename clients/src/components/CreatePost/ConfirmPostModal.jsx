import React, { useState } from "react";
import { useSelector } from "react-redux";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TagsInput from "./TagsInput";
import { toast } from "react-hot-toast";

const ConfirmPostModal = ({ onConfirm, onCancel }) => {
  const tags = useSelector((state) => state.postMeta.tags);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [fileSizeText, setFileSizeText] = useState(""); // State for file size text
  const [activeTab, setActiveTab] = useState("upload");
  const [urlInput, setUrlInput] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];

  const formatFileSize = (sizeInBytes) => {
    if (sizeInBytes >= 1024 * 1024) {
      return `Size: ${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `Size: ${(sizeInBytes / 1024).toFixed(0)} KB`;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      toast.error("No file selected.", { position: "top-right" });
      return;
    }
    if (!ALLOWED_FORMATS.includes(file.type)) {
      toast.error("Invalid image format. Please use JPEG, PNG, or WebP.", {
        position: "top-right",
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        "Image size exceeds 2MB limit. Please use an image smaller than 2MB.",
        {
          position: "top-right",
        }
      );
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedThumbnail(reader.result);
      setFileSizeText(formatFileSize(file.size)); // Set file size text
      setUrlInput("");
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = () => {
    if (!urlInput) {
      toast.error("Please enter an image URL.", { position: "top-right" });
      return;
    }
    if (!/\.(jpe?g|png|webp)$/i.test(urlInput)) {
      toast.error("Please enter a valid image URL (JPEG, PNG, or WebP).", {
        position: "top-right",
      });
      return;
    }
    setSelectedThumbnail(urlInput);
    setFileSizeText(""); // Clear file size for URLs
    setUrlInput("");
  };

  const handleConfirm = () => {
    if (!selectedThumbnail) {
      toast.error(
        "Please select a thumbnail by uploading a file or entering a URL.",
        {
          position: "top-right",
        }
      );
      return;
    }
    if (tags.length < 1 || tags.length > 10) {
      toast.error("Please enter between 1 and 10 tags.", {
        position: "top-right",
      });
      return;
    }
    setIsConfirming(true);
  };

  const handleFinalConfirm = () => {
    setIsConfirming(false);
    onConfirm({ tags, thumbnail: selectedThumbnail });
  };

  const handleCancel = () => {
    setIsConfirming(false);
    setSelectedThumbnail(null);
    setFileSizeText(""); // Clear file size on cancel
    setUrlInput("");
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
      <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-xl p-6 w-full max-w-md sm:max-w-3xl relative border border-gray-200 dark:border-gray-800">
        <AnimatePresence mode="wait">
          {!isConfirming ? (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <button
                onClick={handleCancel}
                className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                Confirm Post Details
              </h2>
              <div className="mb-4">
                <TagsInput />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {tags.length}/10 tags
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Thumbnail
                </label>
                <div className="flex gap-4 mb-2">
                  <button
                    onClick={() => setActiveTab("upload")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg ${
                      activeTab === "upload"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    Upload Image
                  </button>
                  <button
                    onClick={() => setActiveTab("url")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg ${
                      activeTab === "url"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    Image URL
                  </button>
                </div>
                {activeTab === "upload" ? (
                  <div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-100 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-200 dark:hover:file:bg-blue-800"
                      aria-label="Upload thumbnail image"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Supported formats: JPEG, PNG, WebP (max 2MB)
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="Enter image URL (JPEG, PNG, or WebP)"
                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Thumbnail image URL"
                      />
                      <button
                        onClick={handleUrlSubmit}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                      >
                        Submit
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Supported formats: JPEG, PNG, WebP
                    </p>
                  </div>
                )}
                {selectedThumbnail && (
                  <div className="mt-4 relative">
                    <p className="text-sm font-medium mb-2">
                      Selected Thumbnail:
                    </p>
                    {fileSizeText && (
                      <div className="absolute top-0 left-0 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                        {fileSizeText}
                      </div>
                    )}
                    <img
                      src={selectedThumbnail}
                      alt="Selected thumbnail"
                      className="w-full h-40 object-cover rounded-lg"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                Are you sure you want to publish this post?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                This action will make the post publicly visible if published is
                selected.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalConfirm}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  Publish
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ConfirmPostModal;
