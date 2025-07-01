import React from "react";
import { motion } from "framer-motion";
import { FaGripLinesVertical, FaPoll, FaQuoteLeft } from "react-icons/fa";
import { FiLink } from "react-icons/fi";
import { LuListOrdered} from "react-icons/lu";
import { RiListUnordered } from "react-icons/ri";
import { MdTableChart } from "react-icons/md";

const buttonHover = {
  scale: 1.05,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
};

const AddBlockButtons = ({ addBlock }) => (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-4 bg-background-light/50 dark:bg-background-dark/50 rounded-xl shadow-sm border border-gray-100">
    {[
      { type: "text", label: "Text", color: "from-indigo-500 to-indigo-600", icon: null, params: { value: "" } },
      { type: "image", label: "Image", color: "from-green-500 to-green-600", icon: null, params: { src: "", caption: "" } },
      { type: "code", label: "Code", color: "from-purple-500 to-purple-600", icon: null, params: { code: "", language: "javascript", caption: "" } },
      { type: "file", label: "File", color: "from-pink-500 to-pink-600", icon: null, params: { url: "", name: "", size: 0 } },
      { type: "heading", label: "Heading", color: "from-blue-500 to-blue-600", icon: null, params: { text: "", level: 2 } },
      { type: "hr", label: "HR Line", color: "from-gray-200 to-gray-300", icon: <FaGripLinesVertical />, hover: "hover:from-gray-300 hover:to-gray-400", params: { caption: "" } },
      { type: "link", label: "Link", color: "from-teal-500 to-teal-600", icon: <FiLink />, params: { href: "", text: "" } },
      { type: "list", label: "Ordered List", color: "from-orange-500 to-orange-600", icon: <LuListOrdered size={18} />, params: { ordered: true, items: ["Item 1", "Item 2"] } },
      { type: "list", label: "Unordered List", color: "from-orange-400 to-orange-500", icon: <RiListUnordered size={18} />, params: { ordered: false, items: ["Item 1", "Item 2"] } },
      { type: "poll", label: "Poll", color: "from-pink-600 to-pink-700", icon: <FaPoll size={18} />, params: { question: "", options: ["Option 1", "Option 2"], votedUserIds: [] } },
      { type: "quote", label: "Quote", color: "from-gray-600 to-gray-700", icon: <FaQuoteLeft size={18} />, params: { text: "Your quote...", author: "Author" } },
      { type: "table", label: "Table", color: "from-cyan-500 to-cyan-600", icon: <MdTableChart size={18} />, params: { headers: ["Header 1", "Header 2"], rows: [["Cell 1", "Cell 2"], ["Cell 3", "Cell 4"]], caption: "" } },
      { type: "video", label: "Video", color: "from-red-500 to-red-600", icon: null, params: { src: "", caption: "" } },
    ].map(({ type, label, color, icon, params, hover }) => (
      <motion.button
        key={type + (params ? JSON.stringify(params) : "")}
        onClick={() => addBlock(type, params)}
        className={`bg-gradient-to-r ${color} ${hover || ""} text-white font-medium px-3 py-2 rounded-lg shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm transition-all duration-300`}
        whileHover={buttonHover}
        transition={{ type: "spring", stiffness: 300 }}
        aria-label={`Add ${label} block`}
      >
        {icon && <span className="text-lg">{icon}</span>}
        {label}
      </motion.button>
    ))}
  </div>
);

export default AddBlockButtons;