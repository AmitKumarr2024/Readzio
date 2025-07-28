import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import SearchInput from "./SearchInput";

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modal = {
  hidden: { opacity: 0, y: -50, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const SearchModal = ({ isOpen, onClose }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    if (modalRef.current) modalRef.current.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence
      onExitComplete={() => {
        // console.log("Modal exit complete");
        document.body.style.overflow = "";
      }}
    >
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/40 dark:bg-black/50 z-50 flex items-start pt-16 sm:pt-20 px-4 backdrop-blur-md"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdrop}
          aria-modal="true"
          role="dialog"
          aria-labelledby="search-modal-title"
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            className="relative w-full max-w-2xl mx-auto bg-background-light dark:bg-background-dark rounded-3xl shadow-2xl p-6"
            variants={modal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                // console.log("Close button clicked");
                onClose();
              }}
              className="absolute -top-4 -right-4 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 dark:hover:bg-red-500 transition duration-300 shadow-md"
              aria-label="Close search modal"
              type="button"
            >
              <FiX className="text-xl" />
            </button>
            <SearchInput autoFocus onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;