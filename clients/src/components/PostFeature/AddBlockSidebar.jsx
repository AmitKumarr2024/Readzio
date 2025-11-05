import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaGripLinesVertical, FaPoll, FaQuoteLeft } from "react-icons/fa";
import { FiLink } from "react-icons/fi";
import { LuListOrdered } from "react-icons/lu";
import { RiListUnordered } from "react-icons/ri";
import { MdTableChart } from "react-icons/md";
import {
  Type,
  Image,
  Code,
  FileText,
  Hash,
  Video,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";

// External CSS for animations - HIGH PERFORMANCE
const styles = `
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
  50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.6); }
}

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

@keyframes selected-pulse {
  0%, 100% { 
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }
  50% { 
    border-color: rgb(37, 99, 235);
    box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.3);
  }
}

@keyframes slide-in-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.float-animation {
  animation: float 3s ease-in-out infinite;
  will-change: transform;
}

.pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
  will-change: box-shadow;
}

.shimmer-bg {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite linear;
  will-change: background-position;
}

.selected-block {
  animation: selected-pulse 1.5s ease-in-out infinite;
  will-change: border-color, box-shadow;
  position: relative;
}

.delete-button-animated {
  animation: slide-in-down 0.3s ease-out;
  will-change: opacity, transform;
}

/* Scrollbar styling */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.7);
}

/* Performance optimizations */
* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.gpu-accelerated {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}
`;

const blockTypes = [
  {
    type: "text",
    label: "Text",
    color: "from-indigo-500 to-indigo-600",
    icon: <Type size={14} />,
    params: { value: "" },
  },
  {
    type: "image",
    label: "Image",
    color: "from-green-500 to-green-600",
    icon: <Image size={14} />,
    params: { src: "", caption: "" },
  },
  {
    type: "code",
    label: "Code",
    color: "from-purple-500 to-purple-600",
    icon: <Code size={14} />,
    params: { code: "", language: "", caption: "" },
  },
  {
    type: "file",
    label: "File",
    color: "from-pink-500 to-pink-600",
    icon: <FileText size={14} />,
    params: { url: "", name: "", size: 0 },
  },
  {
    type: "heading",
    label: "Heading",
    color: "from-blue-500 to-blue-600",
    icon: <Hash size={14} />,
    params: { text: "", level: 2 },
  },
  {
    type: "hr",
    label: "HR Line",
    color: "from-gray-400 to-gray-500",
    icon: <FaGripLinesVertical size={14} />,
    params: { caption: "" },
  },
  {
    type: "link",
    label: "Link",
    color: "from-teal-500 to-teal-600",
    icon: <FiLink size={14} />,
    params: { href: "", text: "" },
  },
  {
    type: "list",
    label: "Ordered",
    color: "from-orange-500 to-orange-600",
    icon: <LuListOrdered size={14} />,
    params: { ordered: true, items: ["Item 1", "Item 2"] },
  },
  {
    type: "list",
    label: "Unordered",
    color: "from-orange-400 to-orange-500",
    icon: <RiListUnordered size={14} />,
    params: { ordered: false, items: ["Item 1", "Item 2"] },
  },
  {
    type: "poll",
    label: "Poll",
    color: "from-pink-600 to-pink-700",
    icon: <FaPoll size={14} />,
    params: {
      question: "",
      options: ["Option 1", "Option 2"],
      votedUserIds: [],
    },
  },
  {
    type: "quote",
    label: "Quote",
    color: "from-gray-600 to-gray-700",
    icon: <FaQuoteLeft size={14} />,
    params: { text: "Your quote...", author: "Author" },
  },
  {
    type: "table",
    label: "Table",
    color: "from-cyan-500 to-cyan-600",
    icon: <MdTableChart size={14} />,
    params: {
      headers: ["Header 1", "Header 2"],
      rows: [
        ["Cell 1", "Cell 2"],
        ["Cell 3", "Cell 4"],
      ],
      caption: "",
    },
  },
  {
    type: "video",
    label: "Video",
    color: "from-red-500 to-red-600",
    icon: <Video size={14} />,
    params: { src: "", caption: "" },
  },
];

const AddBlockSidebar = ({
  addBlock = () => {},
  selectedBlockIndex = null,
  onSelectBlock = () => {},
  onDeleteBlock = () => {},
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddBlock = (type, params) => {
    addBlock(type, params, selectedBlockIndex);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <style>{styles}</style>

      {/* Desktop Top Bar */}
      <div className="block md:block">
        <motion.div
          initial={false}
          animate={{
            height: isOpen ? "320px" : "52px",
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed left-0 top-16 w-full bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-2xl z-50 flex flex-col border-b border-gray-700 gpu-accelerated overflow-hidden"
        >
          {/* Toggle Button */}
          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-4 top-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-300 pulse-glow"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </motion.button>

          {/* Header */}
          <div className="p-2 border-b border-gray-700 flex-shrink-0">
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">
                      Add Block
                    </h3>
                    <p className="text-xs text-gray-400">
                      {selectedBlockIndex !== null
                        ? "After selected"
                        : "At end"}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex justify-end gap-4 w-full"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Blocks Container */}
          <div className="flex-1 overflow-hidden custom-scrollbar">
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 overflow-y-auto h-full"
                >
                  <div className="grid grid-cols-4 gap-3">
                    {blockTypes.map(
                      ({ type, label, color, icon, params }, index) => (
                        <motion.button
                          key={type + label}
                          onClick={() => handleAddBlock(type, params)}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`bg-gradient-to-br ${color} hover:shadow-lg text-white font-medium p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-300 group relative overflow-hidden gpu-accelerated`}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="absolute inset-0 shimmer-bg opacity-0 group-hover:opacity-100" />
                          <div className="relative z-10">{icon}</div>
                          <span className="relative z-10 text-xs leading-tight text-center">
                            {label}
                          </span>
                        </motion.button>
                      )
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-2 overflow-x-auto flex flex-row gap-2 h-full items-center"
                >
                  {blockTypes.map(
                    ({ type, label, color, icon, params }, index) => (
                      <motion.button
                        key={type + label}
                        onClick={() => handleAddBlock(type, params)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`bg-gradient-to-br ${color} hover:shadow-lg text-white p-2 rounded-xl flex flex-col items-center justify-center gap-1 min-w-full h-44 transition-all duration-300 group relative overflow-hidden gpu-accelerated`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={label}
                      >
                        <div className="absolute inset-0 shimmer-bg opacity-0 group-hover:opacity-100" />
                        <div className="relative z-10 flex-shrink-0">
                          {icon}
                        </div>
                        <span className="relative z-10 text-xs leading-tight text-center whitespace-nowrap">
                          {label}
                        </span>
                      </motion.button>
                    )
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Selected Block Info */}
          {selectedBlockIndex !== null && isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-3 border-t border-gray-700 bg-blue-500/10 flex-shrink-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-300">
                    Block {selectedBlockIndex + 1} selected
                  </span>
                </div>
                <button
                  onClick={() => onSelectBlock(null)}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Mobile Top Sheet */}
      <div className="md:hidden">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={() => setIsOpen(true)}
              className="fixed top-4 right-4 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-2xl z-50 float-animation pulse-glow gpu-accelerated"
              whileTap={{ scale: 0.9 }}
            >
              <Plus className="w-7 h-7" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="fixed top-16 left-0 w-full max-h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-b-3xl z-50 flex flex-col shadow-2xl border-b border-gray-700 gpu-accelerated overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        Add Content Block
                      </h3>
                      <p className="text-xs text-gray-400">
                        {selectedBlockIndex !== null
                          ? `After block ${selectedBlockIndex + 1}`
                          : "At the end"}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setIsOpen(false)}
                    className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-white"
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={20} />
                  </motion.button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                  <div className="grid grid-cols-3 gap-3">
                    {blockTypes.map(
                      ({ type, label, color, icon, params }, index) => (
                        <motion.button
                          key={type + label}
                          onClick={() => handleAddBlock(type, params)}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className={`bg-gradient-to-br ${color} text-white font-medium p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden active:scale-95 gpu-accelerated`}
                          whileTap={{ scale: 0.9 }}
                        >
                          <div className="shimmer-bg absolute inset-0 opacity-30" />
                          <div className="relative z-10 w-8 h-8 flex items-center justify-center">
                            {icon}
                          </div>
                          <span className="relative z-10 text-xs leading-tight text-center">
                            {label}
                          </span>
                        </motion.button>
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default AddBlockSidebar;
