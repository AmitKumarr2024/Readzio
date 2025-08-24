import React from "react";
import { motion } from "framer-motion";
import { FaGripLinesVertical, FaPoll, FaQuoteLeft } from "react-icons/fa";
import { FiLink } from "react-icons/fi";
import { LuListOrdered } from "react-icons/lu";
import { RiListUnordered } from "react-icons/ri";
import { MdTableChart } from "react-icons/md";
import { Type, Image, Code, FileText, Hash, Video, Plus } from "lucide-react";

const buttonHover = {
  scale: 1.02,
  y: -1,
  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.15)",
};

const AddBlockButtons = ({ addBlock = () => {} }) => (
  <div className="mb-4">
    {/* Section Header */}
    <div className="flex items-center gap-2 mb-4 px-2">
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
        <Plus className="w-4 h-4 text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">
          Add Content Block
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Choose a block type to add to your post
        </p>
      </div>
    </div>

    {/* Buttons Grid */}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
      {[
        {
          type: "text",
          label: "Text",
          color: "from-indigo-500 to-indigo-600",
          icon: <Type size={18} />,
          params: { value: "" },
        },
        {
          type: "image",
          label: "Image",
          color: "from-green-500 to-green-600",
          icon: <Image size={18} />,
          params: { src: "", caption: "" },
        },
        {
          type: "code",
          label: "Code",
          color: "from-purple-500 to-purple-600",
          icon: <Code size={18} />,
          params: { code: "", language: "javascript", caption: "" },
        },
        {
          type: "file",
          label: "File",
          color: "from-pink-500 to-pink-600",
          icon: <FileText size={18} />,
          params: { url: "", name: "", size: 0 },
        },
        {
          type: "heading",
          label: "Heading",
          color: "from-blue-500 to-blue-600",
          icon: <Hash size={18} />,
          params: { text: "", level: 2 },
        },
        {
          type: "hr",
          label: "HR Line",
          color: "from-gray-400 to-gray-500",
          icon: <FaGripLinesVertical size={18} />,
          params: { caption: "" },
        },
        {
          type: "link",
          label: "Link",
          color: "from-teal-500 to-teal-600",
          icon: <FiLink size={18} />,
          params: { href: "", text: "" },
        },
        {
          type: "list",
          label: "Ordered List",
          color: "from-orange-500 to-orange-600",
          icon: <LuListOrdered size={18} />,
          params: { ordered: true, items: ["Item 1", "Item 2"] },
        },
        {
          type: "list",
          label: "Unordered List",
          color: "from-orange-400 to-orange-500",
          icon: <RiListUnordered size={18} />,
          params: { ordered: false, items: ["Item 1", "Item 2"] },
        },
        {
          type: "poll",
          label: "Poll",
          color: "from-pink-600 to-pink-700",
          icon: <FaPoll size={18} />,
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
          icon: <FaQuoteLeft size={18} />,
          params: { text: "Your quote...", author: "Author" },
        },
        {
          type: "table",
          label: "Table",
          color: "from-cyan-500 to-cyan-600",
          icon: <MdTableChart size={18} />,
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
          icon: <Video size={18} />,
          params: { src: "", caption: "" },
        },
      ].map(({ type, label, color, icon, params }) => (
        <motion.button
          key={type + (params ? JSON.stringify(params) : "")}
          onClick={() => addBlock(type, params)}
          className={`bg-gradient-to-r ${color} hover:shadow-lg text-white font-medium px-3 py-3 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 text-xs sm:text-sm transition-all duration-300 group relative overflow-hidden`}
          whileHover={buttonHover}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300 }}
          aria-label={`Add ${label} block`}
        >
          {/* Background glow effect */}
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl" />

          {/* Icon */}
          <div className="flex items-center justify-center w-6 h-6 relative z-10">
            {icon}
          </div>

          {/* Label */}
          <span className="relative z-10 leading-tight text-center">
            {label}
          </span>
        </motion.button>
      ))}
    </div>
  </div>
);

export default AddBlockButtons;
