import React, { useState } from "react";
import { X, Tag, Image, Upload, Link, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Mock TagsInput component since we don't have the actual one
const TagsInput = () => {
  const [tags, setTags] = useState(["react", "javascript"]);
  const [inputValue, setInputValue] = useState("");

  const addTag = (tag) => {
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
    }
    setInputValue("");
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-3">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium transition-colors"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded-full p-0.5 transition-colors"
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          tags.length === 0
            ? "Add tags (press Enter or comma to add)"
            : "Add another tag..."
        }
        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        maxLength={30}
      />
      <div className="flex justify-between items-center mt-2 text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          Press Enter or comma to add tags
        </span>
        <span
          className={`font-medium ${
            tags.length >= 10
              ? "text-red-500"
              : tags.length >= 7
              ? "text-yellow-500"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {tags.length}/10 tags
        </span>
      </div>
    </div>
  );
};

const ConfirmPostModal = ({ onConfirm = () => {}, onCancel = () => {} }) => {
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [fileSizeText, setFileSizeText] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [activeTab, setActiveTab] = useState("upload");
  const [urlInput, setUrlInput] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEmbed, setIsEmbed] = useState(false);
  const [errors, setErrors] = useState({});

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];

  const formatFileSize = (sizeInBytes) => {
    if (sizeInBytes >= 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(sizeInBytes / 1024).toFixed(0)} KB`;
  };

  const showError = (field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
    setTimeout(() => {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }, 4000);
  };

  // Extract clean Instagram reel URL and generate embed URL
  const getEmbedUrl = (input) => {
    const instagramRegex =
      /https:\/\/www\.instagram\.com\/reel\/([A-Za-z0-9_-]+)/;
    const match = input.match(instagramRegex);
    if (match && match[1]) {
      return `https://www.instagram.com/reel/${match[1]}/embed`;
    }
    return null;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      showError("thumbnail", "No file selected.");
      return;
    }
    if (!ALLOWED_FORMATS.includes(file.type)) {
      showError(
        "thumbnail",
        "Invalid image format. Please use JPEG, PNG, or WebP."
      );
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showError(
        "thumbnail",
        "Image size exceeds 5MB limit. Please use a smaller image."
      );
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedThumbnail(reader.result);
      setFileSize(file.size);
      setFileSizeText(formatFileSize(file.size));
      setUrlInput("");
      setIsEmbed(false);
      setErrors((prev) => ({ ...prev, thumbnail: null }));
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = async () => {
    if (!urlInput) {
      showError("thumbnail", "Please enter an image or reel URL.");
      return;
    }

    const isInstagramReel = urlInput.includes("instagram.com/reel/");
    if (isInstagramReel) {
      const embedUrl = getEmbedUrl(urlInput);
      if (embedUrl) {
        setSelectedThumbnail(embedUrl);
        setFileSize(0);
        setFileSizeText("");
        setUrlInput("");
        setIsEmbed(true);
        setErrors((prev) => ({ ...prev, thumbnail: null }));
      } else {
        showError("thumbnail", "Invalid Instagram reel URL.");
      }
    } else if (/\.(jpe?g|png|webp)$/i.test(urlInput)) {
      try {
        const response = await fetch(urlInput, { method: "GET" });
        if (!response.ok) {
          throw new Error("Failed to fetch image.");
        }
        const blob = await response.blob();
        if (!ALLOWED_FORMATS.includes(blob.type)) {
          showError("thumbnail", "Fetched image must be JPEG, PNG, or WebP.");
          return;
        }
        if (blob.size > MAX_FILE_SIZE) {
          showError("thumbnail", "Fetched image exceeds 5MB limit.");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedThumbnail(reader.result);
          setFileSize(blob.size);
          setFileSizeText(formatFileSize(blob.size));
          setUrlInput("");
          setIsEmbed(false);
          setErrors((prev) => ({ ...prev, thumbnail: null }));
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        showError("thumbnail", err.message || "Failed to fetch image.");
      }
    } else {
      showError(
        "thumbnail",
        "Please enter a valid image URL (JPEG, PNG, WebP) or Instagram reel URL."
      );
    }
  };

  const handleConfirm = () => {
    if (!selectedThumbnail) {
      showError(
        "thumbnail",
        "Please select a thumbnail by uploading a file or entering a URL."
      );
      return;
    }
    setIsConfirming(true);
  };

  const handleFinalConfirm = () => {
    setIsConfirming(false);
    onConfirm({
      thumbnail: selectedThumbnail,
      thumbnailSize: fileSize,
      isEmbed,
    });
  };

  const handleCancel = () => {
    setIsConfirming(false);
    setSelectedThumbnail(null);
    setFileSize(0);
    setFileSizeText("");
    setUrlInput("");
    setIsEmbed(false);
    setErrors({});
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl relative border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
      >
        <AnimatePresence mode="wait">
          {!isConfirming ? (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Finalize Your Post
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Add tags and select a thumbnail before publishing
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Tags Section */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Post Tags
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Help people discover your content with relevant tags
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <TagsInput />
                </div>
              </div>

              {/* Thumbnail Section */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Image className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Thumbnail Image
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Choose an eye-catching thumbnail for your post
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Tab Navigation */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setActiveTab("upload")}
                      className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                        activeTab === "upload"
                          ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      <Upload size={16} />
                      Upload Image
                    </button>
                    <button
                      onClick={() => setActiveTab("url")}
                      className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                        activeTab === "url"
                          ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      <Link size={16} />
                      Image/Reel URL
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="p-4">
                    {activeTab === "upload" ? (
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="file-upload"
                          />
                          <label
                            htmlFor="file-upload"
                            className="cursor-pointer flex flex-col items-center gap-3"
                          >
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-gray-700 dark:text-gray-300 font-medium">
                                Click to upload an image
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                JPEG, PNG, WebP up to 5MB
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="Paste image URL or Instagram reel link here..."
                            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleUrlSubmit()
                            }
                          />
                          <button
                            onClick={handleUrlSubmit}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                          >
                            Add
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Supports direct image links (JPEG, PNG, WebP) and
                          Instagram reel URLs
                        </p>
                      </div>
                    )}

                    {/* Error Display */}
                    {errors.thumbnail && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg"
                      >
                        <AlertCircle size={16} />
                        {errors.thumbnail}
                      </motion.div>
                    )}

                    {/* Preview */}
                    {selectedThumbnail && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Selected Thumbnail
                          </span>
                          {fileSizeText && !isEmbed && (
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                              {fileSizeText}
                            </span>
                          )}
                        </div>
                        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                          {isEmbed ? (
                            <iframe
                              src={selectedThumbnail}
                              className="w-full h-64"
                              frameBorder="0"
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                              title="Instagram Reel Thumbnail"
                            />
                          ) : (
                            <img
                              src={selectedThumbnail}
                              alt="Selected thumbnail"
                              className="w-full h-64 object-cover"
                              loading="lazy"
                            />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  Continue to Publish
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="p-8 text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Ready to Publish?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Your post is ready to go live. This will make it publicly
                visible to all users.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleFinalConfirm}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  Publish Now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ConfirmPostModal;
