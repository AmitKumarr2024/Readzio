import React from "react";
import { motion } from "framer-motion";
import { FaGripLinesVertical } from "react-icons/fa";
import { FiLink } from "react-icons/fi";
import { AiOutlineOrderedList, AiOutlineUnorderedList } from "react-icons/ai";
import { LuListOrdered } from "react-icons/lu";
import { RiListUnordered } from "react-icons/ri";
import { FaPoll } from "react-icons/fa";
import { FaQuoteLeft } from "react-icons/fa";
import { MdTableChart } from "react-icons/md";

const buttonHover = {
  scale: 1.05,
  boxShadow: "0 0 8px rgba(0,0,0,0.2)",
};

const AddBlockButtons = ({ addBlock }) => (
  <div className="flex gap-9 justify-center flex-wrap">
    {/* Existing buttons */}
    <motion.button
      onClick={() => addBlock("text")}
      className="bg-indigo-600 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg"
      whileHover={buttonHover}
      transition={{ type: "spring", stiffness: 300 }}
    >
      + Text
    </motion.button>

    <motion.button
      onClick={() => addBlock("image")}
      className="bg-green-600 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg"
      whileHover={buttonHover}
      transition={{ type: "spring", stiffness: 300 }}
    >
      + Image
    </motion.button>

    <motion.button
      onClick={() => addBlock("code")}
      className="bg-purple-600 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg"
      whileHover={buttonHover}
      transition={{ type: "spring", stiffness: 300 }}
    >
      + Code
    </motion.button>

    <motion.button
      onClick={() => addBlock("emoji")}
      className="bg-yellow-400 text-black font-semibold px-8 py-3 rounded-2xl shadow-lg"
      whileHover={buttonHover}
      transition={{ type: "spring", stiffness: 300 }}
    >
      + Emoji
    </motion.button>

    <motion.button
      onClick={() => addBlock("file")}
      className="bg-pink-500 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg"
      whileHover={buttonHover}
      transition={{ type: "spring", stiffness: 300 }}
    >
      + File
    </motion.button>

    <motion.button
      onClick={() => addBlock("heading")}
      className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg"
      whileHover={buttonHover}
      transition={{ type: "spring", stiffness: 300 }}
    >
      + Heading
    </motion.button>

    <motion.button
      onClick={() => addBlock("hr")}
      className="text-lg px-8 py-3 rounded-2xl shadow-lg bg-gray-200 hover:bg-gray-300"
      whileHover={buttonHover}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <FaGripLinesVertical className="inline-block mr-1" />
      HR-Line
    </motion.button>

    <motion.button
      onClick={() => addBlock("link")}
      className="bg-teal-600 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2"
      whileHover={buttonHover}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <FiLink />+ Link
    </motion.button>

    {/* New buttons for Lists */}
    <motion.button
      onClick={() => addBlock("list", { ordered: true })}
      className="bg-orange-600 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2"
      whileHover={buttonHover}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <LuListOrdered size={34} className="text-xl" /> Ordered List
    </motion.button>

    <motion.button
      onClick={() => addBlock("list", { ordered: false })}
      className="bg-orange-400 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2"
      whileHover={buttonHover}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <RiListUnordered size={34} className="text-xl" /> Unordered List
    </motion.button>
    <motion.button
      onClick={() => addBlock("poll")}
      className="bg-pink-700 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2"
      whileHover={buttonHover}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <FaPoll size={20} /> + Poll
    </motion.button>
    <motion.button
      onClick={() =>
        addBlock("quote", {
          text: "Your inspirational quote here...",
          author: "Author Name",
        })
      }
      className="bg-gray-700 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2"
      whileHover={buttonHover}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <FaQuoteLeft size={20} /> + Quote
    </motion.button>
    <motion.button
      onClick={() =>
        addBlock("table", {
          data: [
            ["Cell 1", "Cell 2"],
            ["Cell 3", "Cell 4"],
          ],
        })
      }
      className="bg-cyan-600 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2"
      whileHover={buttonHover}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <MdTableChart size={24} /> + Table
    </motion.button>

    <motion.button
      onClick={() => addBlock("video")}
      className="bg-red-600 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg"
      whileHover={buttonHover}
      transition={{ type: "spring", stiffness: 300 }}
    >
      + Video
    </motion.button>
  </div>
);

export default AddBlockButtons;
