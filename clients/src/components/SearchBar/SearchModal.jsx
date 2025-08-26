import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import SearchInput from "./SearchInput";

const backdrop = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

const modal = {
  hidden: {
    opacity: 0,
    y: -50,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

const SearchModal = ({ isOpen, onClose }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    // Auto-focus the modal for accessibility
    const focusTimeout = setTimeout(() => {
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }, 100);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      clearTimeout(focusTimeout);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-start justify-center pt-16 sm:pt-20 px-4 backdrop-blur-sm"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={backdrop}
          aria-modal="true"
          role="dialog"
          aria-labelledby="search-modal-title"
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            className="relative w-full max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700"
            variants={modal}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-full p-2.5 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900"
              aria-label="Close search modal"
              type="button"
            >
              <FiX className="text-lg" />
            </button>

            {/* Modal Header */}
            <div className="mb-4">
              <h2
                id="search-modal-title"
                className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2"
              >
                Search Articles & Users
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Find posts, articles, and users across the platform
              </p>
            </div>

            {/* Search Input */}
            <SearchInput autoFocus onClose={onClose} className="mb-4" />

            {/* Search Tips */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Tips:</span> Use keywords to
                search posts and usernames. Press{" "}
                <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                  Enter
                </kbd>{" "}
                to view all results.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;
