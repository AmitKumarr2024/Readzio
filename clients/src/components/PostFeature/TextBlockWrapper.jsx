import React, { forwardRef } from "react";
import { MdDeleteForever } from "react-icons/md";
import { motion } from "framer-motion";
import EditorTextBlock from "./EditorTextBlock";

const blockVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const TextBlockWrapper = forwardRef(({ block, index, updateBlock, removeBlock }, ref) => (
  <motion.div
    ref={ref}
    key={index}
    className="relative bg-white w-full pr-10 p-6 rounded-2xl shadow-md border border-gray-200"
    variants={blockVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    layout
  >
    <button
      onClick={() => removeBlock(index)}
      className="absolute top-1 right-0 text-red-500 hover:text-red-700 transition"
      aria-label="Remove text block"
    >
      <MdDeleteForever size={28} />
    </button>
    <EditorTextBlock
      value={block.value}
      onUpdate={(val) => updateBlock(index, { ...block, value: val })}
    />
  </motion.div>
));

export default TextBlockWrapper;
