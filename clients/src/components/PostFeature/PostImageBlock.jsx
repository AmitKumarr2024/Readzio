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

  // Extract clean Instagram reel URL and generate embed URL
  const getEmbedUrl = (input) => {
    const instagramRegex =
      /https:\/\/www\.instagram\.com\/reel\/([A-Za-z0-9_-]+)/;
    const match = input.match(instagramRegex);
    if (match && match[1]) {
      const embedUrl = `https://www.instagram.com/reel/${match[1]}/embed`;
      console.log("[PostImageBlock] Generated embed URL:", embedUrl);
      return embedUrl;
    }
    return null;
  };

  const handleUrlSubmit = async () => {
    if (!urlInput) {
      toast.error("Please enter an image or reel URL.", {
        position: "top-right",
      });
      return;
    }

    const isInstagramReel = urlInput.includes("instagram.com/reel/");
    if (isInstagramReel) {
      const embedUrl = getEmbedUrl(urlInput);
      if (embedUrl) {
        updateBlock(index, { ...block, src: embedUrl, size: 0, isEmbed: true });
        setFileSizeText("");
        setUrlInput("");
        toast.success("Instagram reel URL added.", { position: "top-right" });
      } else {
        toast.error("Invalid Instagram reel URL.", { position: "top-right" });
      }
    } else if (/\.(jpe?g|png|webp)$/i.test(urlInput)) {
      try {
        const response = await fetch(urlInput, { method: "GET" });
        if (!response.ok) {
          throw new Error("Failed to fetch image.");
        }
        const blob = await response.blob();
        if (!ALLOWED_FORMATS.includes(blob.type)) {
          toast.error("Fetched image must be JPEG, PNG, or WebP.", {
            position: "top-right",
          });
          return;
        }
        if (blob.size > MAX_FILE_SIZE) {
          toast.error("Fetched image exceeds 5MB limit.", {
            position: "top-right",
          });
          return;
        }
        setFileSizeText(formatFileSize(blob.size));
        handleImageUpload(blob, index);
        setUrlInput("");
        toast.success("Image URL added.", { position: "top-right" });
      } catch (err) {
        toast.error(err.message || "Failed to fetch image.", {
          position: "top-right",
        });
      }
    } else {
      toast.error(
        "Please enter a valid image URL (JPEG, PNG, or WebP) or Instagram reel URL.",
        { position: "top-right" }
      );
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && validateImage(file)) {
      setFileSizeText(formatFileSize(file.size));
      handleImageUpload(file, index);
      toast.success("Image uploaded.", { position: "top-right" });
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
      {fileSizeText && block.src && !block.isEmbed && (
        <div className="absolute top-0 left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full shadow-sm">
          {fileSizeText}
        </div>
      )}
      <button
        onClick={() => {
          removeBlock(index);
          setFileSizeText("");
          setUrlInput("");
          toast.success("Block removed.", { position: "top-right" });
        }}
        className="absolute top-4 right-4 text-red-500 hover:text-red-700 transition"
        aria-label="Remove image"
      >
        <MdDeleteForever size={24} />
      </button>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Image URL or Instagram reel URL"
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
        value={block.caption || ""}
        onChange={(e) =>
          updateBlock(index, { ...block, caption: e.target.value })
        }
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {block.src &&
        (block.isEmbed ? (
          <div className="relative w-full aspect-video">
            <iframe
              src={block.src}
              className="w-full h-full rounded-lg border border-gray-200"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="Instagram Reel"
              onError={(e) =>
                console.error(
                  "[PostImageBlock] Iframe failed to load:",
                  block.src,
                  e.message
                )
              }
            />
          </div>
        ) : (
          <img
            src={block.src}
            alt={block.caption || "Uploaded"}
            className="w-full max-h-[550px] object-contain rounded-lg border border-gray-200"
            loading="lazy"
            onError={(e) =>
              console.error(
                "[PostImageBlock] Image failed to load:",
                block.src,
                e.message
              )
            }
          />
        ))}
    </motion.div>
  );
};

export default PostImageBlock;
