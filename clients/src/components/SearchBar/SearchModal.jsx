import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import SearchInput from "./SearchInput";

const backdrop = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
};

const modal = {
  hidden: { opacity: 0, y: -30 },
  visible: { opacity: 1, y: 0 },
};

const SearchModal = ({ isOpen, onClose }) => {
  const modalRef = useRef(null);

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Lock background scroll
    document.body.style.overflow = "hidden";

    // Focus modal container
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-50 flex items-start pt-20 px-4"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdrop}
          onClick={onClose}
          aria-modal="true"
          role="dialog"
          aria-labelledby="search-modal-title"
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            className="relative w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-4"
            variants={modal}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X button */}
            <button
              onClick={onClose}
              className="absolute -top-5 -right-8 text-gray-500 hover:text-gray-800"
              aria-label="Close search modal"
              type="button"
            >
              <FiX className="text-3xl text-red-500 font-bold" />
            </button>

            {/* Search input with Redux logic */}
            <SearchInput autoFocus onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;
