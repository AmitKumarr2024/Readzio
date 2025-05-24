import React, { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { BookOpenText, PenLine, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PostTypeSelector = ({ onSelect, onClose }) => {
  const [selected, setSelected] = useState(false);
  const navigate = useNavigate();

  const handleSelect = (type) => {
    setSelected(true);
    onSelect(type);
  };

  const handleClose = () => {
    if (!selected) {
      navigate("/");
    } 
  };

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative bg-white/80 backdrop-blur-xl border border-gray-200 p-6 rounded-2xl shadow-2xl w-full max-w-lg mx-auto"
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-700 hover:text-red-600 transition"
          aria-label="Close"
        >
          <X size={28} />
        </button>

        {/* Title */}
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Select Post Type
        </h2>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => handleSelect("Article")}
            className="flex items-center justify-center gap-3 py-4 px-6 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition font-semibold text-lg"
          >
            <BookOpenText size={24} />
            Article
          </button>

          <button
            onClick={() => handleSelect("Blog")}
            className="flex items-center justify-center gap-3 py-4 px-6 bg-green-600 text-white rounded-xl shadow-md hover:bg-green-700 transition font-semibold text-lg"
          >
            <PenLine size={24} />
            Blog
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default PostTypeSelector;
