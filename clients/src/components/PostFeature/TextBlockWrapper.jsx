import React, { forwardRef } from "react";
import { MdDeleteForever } from "react-icons/md";
import { motion } from "framer-motion";
import EditorTextBlock from "./EditorTextBlock";

const blockVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const TextBlockWrapper = forwardRef(
  ({ block, index, updateBlock, removeBlock }, ref) => (
    <motion.div
      ref={ref}
      className="relative bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-3 sm:p-4 rounded-xl shadow-md    transition-shadow hover:shadow-lg"
      variants={blockVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      <EditorTextBlock
        value={block.value}
        onUpdate={(val) => updateBlock(index, { ...block, value: val })}
        onRemove={() => removeBlock(index)}
      />
    </motion.div>
  )
);

export default TextBlockWrapper;
