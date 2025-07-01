import React, { useState } from "react";
import { useSelector } from "react-redux";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TagsInput from "./TagsInput";
import { toast } from "react-hot-toast"; // Make sure this is installed and imported

const ConfirmPostModal = ({ onConfirm, onCancel }) => {
  const tags = useSelector((state) => state.postMeta.tags);

  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [urlInput, setUrlInput] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedThumbnail(reader.result); // Base64 string
        setUrlInput("");
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please select a valid image file (e.g., JPG, PNG).");
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput && /\.(jpg|jpeg|png|gif|webp)$/i.test(urlInput)) {
      setSelectedThumbnail(urlInput); // Normal URL
      setUrlInput("");
    } else {
      alert("Please enter a valid image URL.");
    }
  };

  const handleConfirm = () => {
    if (!selectedThumbnail) {
      alert("Please select a thumbnail by uploading a file or entering a URL.");
      return;
    }

    if (tags.length < 1 || tags.length > 10) {
      toast.error("Please enter between 1 and 10 tags.");
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
    setUrlInput("");
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl relative">
        <AnimatePresence mode="wait">
          {!isConfirming ? (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={handleCancel}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                aria-label="Close modal"
              >
                <X />
              </button>

              <h2 className="text-xl font-bold mb-4">Confirm Post</h2>

              <div className="mb-4">
                <label className="block mb-2 font-semibold">Tags</label>
                <p className="text-sm text-gray-500 mb-2">
                  Enter tags separated by commas to create #tag pills.
                </p>
                <TagsInput />
              </div>

              <div className="mb-4">
                <label className="block mb-2 font-semibold">Select a Thumbnail</label>
                <p className="text-sm text-gray-500 mb-2">
                  Upload an image file or enter an image URL.
                </p>

                <div className="flex mb-4">
                  <button
                    className={`flex-1 py-2 px-4 text-center ${
                      activeTab === "upload"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    } rounded-l-md`}
                    onClick={() => setActiveTab("upload")}
                  >
                    Upload Image
                  </button>
                  <button
                    className={`flex-1 py-2 px-4 text-center ${
                      activeTab === "url"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    } rounded-r-md`}
                    onClick={() => setActiveTab("url")}
                  >
                    Enter URL
                  </button>
                </div>

                {activeTab === "upload" && (
                  <div className="mb-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                    />
                  </div>
                )}

                {activeTab === "url" && (
                  <div className="mb-4 flex gap-2">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Enter image URL"
                      className="flex-1 p-2 border rounded text-sm"
                    />
                    <button
                      onClick={handleUrlSubmit}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Load
                    </button>
                  </div>
                )}

                <div className="mt-4 text-center">
                  {selectedThumbnail ? (
                    <img
                      src={selectedThumbnail}
                      alt="Selected Thumbnail"
                      className="cursor-pointer rounded border-2 border-blue-500 w-64 mx-auto"
                    />
                  ) : (
                    <p className="text-sm text-gray-500 italic text-center">
                      No thumbnail selected.
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleConfirm}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
              >
                Confirm & Publish
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="final"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <button
                onClick={handleCancel}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                aria-label="Close modal"
              >
                <X />
              </button>
              <h2 className="text-xl font-bold mb-4">Publishing Post</h2>
              <p className="text-lg mb-4">Ready to publish your post?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleFinalConfirm}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Publish Now
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Cancel
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
