import React, { useState } from "react";
import { FiUpload } from "react-icons/fi";
import { MdDeleteForever } from "react-icons/md";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

const blockVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const PostImageBlock = ({
  block,
  index,
  updateBlock,
  removeBlock,
  handleImageUpload,
  refProp,
}) => {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];
  const [fileSizeText, setFileSizeText] = useState("");
  const [urlInput, setUrlInput] = useState("");

  const validateImage = (file) => {
    if (!file) {
      toast.error("No file selected.", { position: "top-right" });
      return false;
    }
    if (!ALLOWED_FORMATS.includes(file.type)) {
      toast.error("Invalid image format. Please use JPEG, PNG, or WebP.", {
        position: "top-right",
      });
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        "Image size exceeds 5MB limit. Please use an image smaller than 5MB.",
        { position: "top-right" }
      );
      return false;
    }
    return true;
  };

  const formatFileSize = (sizeInBytes) => {
    if (sizeInBytes >= 1024 * 1024) {
      return `Size: ${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `Size: ${(sizeInBytes / 1024).toFixed(0)} KB`;
  };

  const fetchSocialMediaImage = async (url) => {
    try {
      // Mock API for X/Instagram (replace with actual API in production)
      let imageUrl = url;
      if (url.includes("instagram.com/reel/")) {
        // For Instagram reels, try to fetch thumbnail from og:image meta tag
        const response = await fetch(
          `/api/fetch-meta?url=${encodeURIComponent(url)}`
        ); // Proxy endpoint
        if (!response.ok) throw new Error("Failed to fetch reel metadata");
        const { ogImage } = await response.json();
        if (!ogImage || !/\.(jpe?g|png|webp)$/i.test(ogImage)) {
          throw new Error(
            "Reels/videos are not supported. Please use a post with a JPEG, PNG, or WebP image."
          );
        }
        imageUrl = ogImage;
      } else if (url.includes("x.com")) {
        // For X posts, extract image from media (mocked)
        const response = await fetch(
          `/api/fetch-x-image?url=${encodeURIComponent(url)}`
        );
        if (!response.ok) throw new Error("Failed to fetch X post image");
        const { image } = await response.json();
        if (!image || !/\.(jpe?g|png|webp)$/i.test(image)) {
          throw new Error(
            "X post has no supported image (JPEG, PNG, or WebP)."
          );
        }
        imageUrl = image;
      }

      const response = await fetch(imageUrl, { method: "GET" });
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();
      if (!ALLOWED_FORMATS.includes(blob.type)) {
        toast.error("Fetched image must be JPEG, PNG, or WebP.", {
          position: "top-right",
        });
        return null;
      }
      if (blob.size > MAX_FILE_SIZE) {
        toast.error("Fetched image exceeds 5MB limit.", {
          position: "top-right",
        });
        return null;
      }
      return blob;
    } catch (err) {
      toast.error(err.message || "Failed to fetch image.", {
        position: "top-right",
      });
      return null;
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput) {
      toast.error("Please enter an image URL.", { position: "top-right" });
      return;
    }
    const isSocialMediaUrl =
      urlInput.includes("x.com") || urlInput.includes("instagram.com");
    if (isSocialMediaUrl) {
      const file = await fetchSocialMediaImage(urlInput);
      if (file) {
        setFileSizeText(formatFileSize(file.size));
        handleImageUpload(file, index);
        setUrlInput("");
      }
    } else if (/\.(jpe?g|png|webp)$/i.test(urlInput)) {
      updateBlock(index, { ...block, src: urlInput, size: 0 });
      setFileSizeText("");
      setUrlInput("");
    } else {
      toast.error("Please enter a valid image URL (JPEG, PNG, or WebP).", {
        position: "top-right",
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && validateImage(file)) {
      setFileSizeText(formatFileSize(file.size));
      handleImageUpload(file, index);
    } else {
      setFileSizeText("");
    }
  };

  return (
    <motion.div
      ref={refProp}
      className="relative bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-6 rounded-xl shadow-md border border-gray-200"
      variants={blockVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      {fileSizeText && block.src && (
        <div className="absolute top-0 left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full shadow-sm">
          {fileSizeText}
        </div>
      )}
      <button
        onClick={() => {
          removeBlock(index);
          setFileSizeText("");
          setUrlInput("");
        }}
        className="absolute top-4 right-4 text-red-500 hover:text-red-700 transition"
        aria-label="Remove image"
      >
        <MdDeleteForever size={24} />
      </button>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Image URL (or X/Instagram post URL)"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleUrlSubmit}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
        >
          Submit
        </button>
      </div>
      <label className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition mb-4">
        <FiUpload className="w-5 h-5 mr-2" />
        Choose Image
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
      <input
        placeholder="Caption (optional)"
        value={block.caption}
        onChange={(e) =>
          updateBlock(index, { ...block, caption: e.target.value })
        }
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {block.src && (
        <img
          src={block.src}
          alt={block.caption || "Uploaded"}
          className="w-full max-h-96 object-contain rounded-lg border border-gray-200"
          loading="lazy"
        />
      )}
    </motion.div>
  );
};

export default PostImageBlock;
