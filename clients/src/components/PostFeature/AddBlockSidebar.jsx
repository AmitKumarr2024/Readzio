import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
// Consolidated all icons into lucide-react (Standard library)
import {
  Type,
  Image,
  Code,
  FileText,
  Hash,
  Video,
  Plus,
  X,
  Trash2,
  Minimize2, // Used for the toggle button in the 'open' state
  Maximize2, // Used for the toggle button in the 'closed' state
  Minus, // Replaces FaGripLinesVertical (Divider)
  BarChart2, // Replaces FaPoll (Poll)
  Quote, // Replaces FaQuoteLeft (Quote)
  Link, // Replaces FiLink (Link)
  ListOrdered, // Replaces LuListOrdered
  List, // Replaces RiListUnordered
  Table, // Replaces MdTableChart
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

.float-animation {
  animation: float 3s ease-in-out infinite;
  will-change: transform;
}

.pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
  will-change: box-shadow;
}

/* Custom Scrollbar only needed for vertical grid and mobile sheet */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px; 
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
.gpu-accelerated {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}
`;

// --- DATA STRUCTURES (Updated with Lucide Icons) ---
const blockTypes = [
  {
    type: "text",
    label: "Text",
    color: "from-indigo-500 to-indigo-600",
    icon: <Type size={14} />,
    params: { value: "New Text Block" },
  },
  {
    type: "heading",
    label: "Heading",
    color: "from-blue-500 to-blue-600",
    icon: <Hash size={14} />,
    params: { text: "New Heading", level: 2 },
  },
  {
    type: "list-ordered",
    label: "Ordered List",
    color: "from-orange-500 to-orange-600",
    icon: <ListOrdered size={14} />,
    params: { ordered: true, items: ["Item 1", "Item 2"] },
  },
  {
    type: "list-unordered",
    label: "Unordered List",
    color: "from-orange-400 to-orange-500",
    icon: <List size={14} />,
    params: { ordered: false, items: ["Item 1", "Item 2"] },
  },
  {
    type: "quote",
    label: "Quote",
    color: "from-gray-600 to-gray-700",
    icon: <Quote size={14} />,
    params: { text: "Your quote...", author: "Author" },
  },
  {
    type: "hr",
    label: "Divider",
    color: "from-gray-400 to-gray-500",
    icon: <Minus size={14} />,
    params: { caption: "" },
  },
  {
    type: "image",
    label: "Image",
    color: "from-green-500 to-green-600",
    icon: <Image size={14} />,
    params: {
      src: "https://placehold.co/150x100/3b82f6/ffffff?text=Image",
      caption: "",
    },
  },
  {
    type: "video",
    label: "Video",
    color: "from-red-500 to-red-600",
    icon: <Video size={14} />,
    params: {
      src: "https://placehold.co/150x100/ef4444/ffffff?text=Video",
      caption: "",
    },
  },
  {
    type: "link",
    label: "Link",
    color: "from-teal-500 to-teal-600",
    icon: <Link size={14} />,
    params: { href: "#", text: "New Link" },
  },
  {
    type: "code",
    label: "Code",
    color: "from-purple-500 to-purple-600",
    icon: <Code size={14} />,
    params: { code: "// your code here", language: "javascript", caption: "" },
  },
  {
    type: "table",
    label: "Table",
    color: "from-cyan-500 to-cyan-600",
    icon: <Table size={14} />,
    params: { headers: ["H1", "H2"], rows: [["C1", "C2"]] },
  },
  {
    type: "poll",
    label: "Poll",
    color: "from-pink-600 to-pink-700",
    icon: <BarChart2 size={14} />,
    params: { question: "New Poll?", options: ["Yes", "No"], votedUserIds: [] },
  },
  {
    type: "file",
    label: "File",
    color: "from-pink-500 to-pink-600",
    icon: <FileText size={14} />,
    params: { url: "#", name: "File.pdf", size: "1.2 MB" },
  },
];

// --- MAIN TOOLBAR COMPONENT (REPLACING AddBlockSidebar) ---

const ContentBlockToolbar = ({
  addBlock = () => {},
  selectedBlockIndex = null,
}) => {
  // Mobile: isOpen controls the full-screen sheet
  // Desktop: isOpen controls the height expansion
  const [isOpen, setIsOpen] = useState(false);

  const handleAddBlock = (type, params) => {
    addBlock(type, params, selectedBlockIndex);
    // On small screens, close the sheet after adding a block
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const selectedInfo = useMemo(() => {
    if (selectedBlockIndex === null || selectedBlockIndex < 0)
      return "At the end";
    return `After Block ${selectedBlockIndex + 1}`;
  }, [selectedBlockIndex]);

  // Constants for desktop animation
  // Increased height to accommodate wrapped buttons (flex-wrap)
  const DESKTOP_CLOSED_HEIGHT = 120;
  const DESKTOP_OPEN_HEIGHT = 300;

  // --- DESKTOP VIEW (Top Bar / Slider Navbar) ---
  const DesktopToolbar = () => (
    <motion.div
      initial={false}
      // Animate height based on open/closed state
      animate={{
        height: isOpen
          ? `${DESKTOP_OPEN_HEIGHT}px`
          : `${DESKTOP_CLOSED_HEIGHT}px`,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-16 w-full bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-2xl z-50  flex-col border-b border-blue-700/50 overflow-hidden hidden md:flex"
    >
      {/* 1. Header/Toggle Bar (Always visible) */}
      <div className="p-2 flex items-center justify-between flex-shrink-0 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark border-b border-blue-700/30">
        {/* Left Status Area */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Plus className="w-3 h-3 text-white" />
          </div>
          <p className="text-sm font-medium text-text-main-light dark:text-text-main-dark">
            Insert Block <span className="text-blue-400">({selectedInfo})</span>
          </p>
        </div>

        {/* Right Toggle Button (Minimize/Maximize Icon with Label) */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-full flex items-center gap-2 text-sm font-medium  hover:bg-blue-600 transition-all duration-300 shadow-md"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Minimize Block Menu" : "Maximize Block Menu"}
        >
          {isOpen ? (
            <>
              <Minimize2 size={14} className="flex-shrink-0" />
              <span className="hidden sm:inline">Minimize</span>
            </>
          ) : (
            <>
              <Maximize2 size={14} className="flex-shrink-0" />
              <span className="hidden sm:inline">Maximize</span>
            </>
          )}
        </motion.button>
      </div>

      {/* 2. Blocks Container (Animated Content) */}
      <div className="flex-1 overflow-hidden custom-scrollbar">
        <AnimatePresence mode="wait">
          {/* STATE A: OPEN (GRID LAYOUT) */}
          {isOpen && (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-3 overflow-y-auto h-full"
            >
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10 gap-3">
                {blockTypes.map(
                  ({ type, label, color, icon, params }, index) => (
                    <motion.button
                      key={type + label}
                      onClick={() => handleAddBlock(type, params)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className={`bg-gradient-to-br ${color} hover:shadow-xl text-white font-medium px-3 py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-300 group relative overflow-hidden`}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      title={`Add ${label}`}
                    >
                      <div className="relative z-10 w-6 h-6">{icon}</div>
                      <span className="relative z-10 text-lg leading-tight text-center truncate">
                        {label}
                      </span>
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  )
                )}
              </div>
            </motion.div>
          )}

          {/* STATE B: CLOSED (HORIZONTAL BUTTON ROW, now using flex-wrap)
            Removed overflow-x-auto and kept flex-wrap.
          */}
          {!isOpen && (
            <motion.div
              key="horizontal-wrap"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              // --- FIX APPLIED HERE: Replaced 'overflow-x-auto' with 'flex-wrap' ---
              className="p-1 flex flex-wrap gap-2 h-full items-center justify-center overflow-y-auto custom-scrollbar"
              // Added items-start and overflow-y-auto to manage the wrapped content within the fixed height
            >
              {blockTypes.map(({ type, label, color, icon, params }, index) => (
                <motion.button
                  key={type + label}
                  onClick={() => handleAddBlock(type, params)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-gradient-to-br ${color} hover:shadow-lg text-white px-3 py-1 rounded-xl flex items-center gap-2 min-w-[100px] transition-all duration-300 group relative overflow-hidden whitespace-nowrap`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={`Add ${label}`}
                >
                  <div className="relative z-10 w-3 h-3 flex-shrink-0">
                    {icon}
                  </div>
                  <span className="relative z-10 text-lg leading-tight truncate font-medium">
                    {label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  // --- MOBILE VIEW (Floating Button & Top Sheet) ---
  const MobileToolbar = () => (
    <>
      {/* Floating Plus Button (When closed, positioned under the fixed header) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            // Positioned at the top right, below the main fixed navigation
            className="fixed top-[4.5rem] right-4 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-2xl z-50 float-animation pulse-glow gpu-accelerated md:hidden"
            whileTap={{ scale: 0.9 }}
            aria-label="Open Block Menu"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Full-Screen Sheet (When open) - Modified to slide down from the top */}
      <AnimatePresence>
        {isOpen && (
          <div className="md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              // Slides down from the top, below the main header (top-16)
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed top-16 left-0 w-full max-h-[80vh] bg-gray-900 rounded-b-xl z-[60] flex flex-col shadow-2xl border-b border-blue-700/50 gpu-accelerated overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      Add Content Block
                    </h3>
                    <p className="text-xs text-gray-400">{selectedInfo}</p>
                  </div>
                </div>
                <motion.button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-white"
                  whileTap={{ scale: 0.9 }}
                  aria-label="Close Menu"
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
                        className={`bg-gradient-to-br ${color} text-white font-medium px-3 py-1.5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden active:scale-95 gpu-accelerated`}
                        whileTap={{ scale: 0.9 }}
                      >
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
          </div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      <style>{styles}</style>
      <DesktopToolbar />
      <MobileToolbar />
    </>
  );
};

export default ContentBlockToolbar;
