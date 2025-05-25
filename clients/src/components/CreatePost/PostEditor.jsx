import React, { useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

import PostImageBlock from "../PostFeature/PostImageBlock";
import CodeBlock from "../PostFeature/CodeBlock";
import TextBlockWrapper from "../PostFeature/TextBlockWrapper";
import TitleInput from "../PostFeature/TitleInput";
import AddBlockButtons from "../PostFeature/AddBlockButtons";
import EmojiBlock from "../PostFeature/EmojiBlock";
import FileBlock from "../PostFeature/FileBlock";
import HeadingBlock from "../PostFeature/HeadingBlock";
import HrBlock from "../PostFeature/HrBlock";
import LinkBlock from "../PostFeature/LinkBlock";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const PostEditor = ({ title, setTitle, blocks, setBlocks, size }) => {
  const blockRefs = useRef([]);

  // Add block with optional options (for list type)
  const addBlock = (type, options = {}) => {
    const newBlock =
      type === "text"
        ? { id: uuidv4(), type, value: "<p></p>" }
        : type === "heading"
        ? { id: uuidv4(), type, level: 2, text: "Heading Text" }
        : type === "code"
        ? { id: uuidv4(), type, code: "", caption: "" }
        : type === "image"
        ? { id: uuidv4(), type, src: "", caption: "" }
        : type === "emoji"
        ? { id: uuidv4(), type, emoji: "😀" }
        : type === "file"
        ? { id: uuidv4(), type, url: "", name: "", size: 0 }
        : type === "hr"
        ? { id: uuidv4(), type }
        : type === "link"
        ? { id: uuidv4(), type, href: "", text: "Link Text" }
        : type === "list"
        ? { id: uuidv4(), type, items: [""], ordered: options.ordered || false }
        : null;

    if (newBlock) setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (index, newData) => {
    const updated = [...blocks];
    updated[index] = newData;
    setBlocks(updated);
  };

  const removeBlock = (index) => {
    const updated = blocks.filter((_, i) => i !== index);
    setBlocks(updated);
  };

  // Dummy placeholder handlers — implement these properly
  const handleImageUpload = (file, index) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateBlock(index, { ...blocks[index], src: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }
    // Simulate file URL (in real use, upload file to server or storage)
    const url = URL.createObjectURL(file);
    updateBlock(index, { ...blocks[index], url, name: file.name, size: file.size });
  };

  useEffect(() => {
    if (blockRefs.current.length > 0) {
      const lastBlock = blockRefs.current[blockRefs.current.length - 1];
      if (lastBlock) {
        lastBlock.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [blocks]);

  const sizeToWidthClass = (size) => {
    const widthMap = {
      25: "md:w-1/4",
      50: "md:w-1/2",
      60: "md:w-[60%]",
      75: "md:w-3/4",
      100: "md:w-full",
    };
    return widthMap[size] || "md:w-full";
  };

  return (
    <div
      className={`w-full ${sizeToWidthClass(
        size
      )} h-screen bg-gray-50 flex flex-col p-6 rounded-2xl shadow-lg`}
    >
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-6 tracking-wide">
        Create Content
      </h1>

      <TitleInput title={title} setTitle={setTitle} />

      <div className="flex flex-col overflow-y-auto mb-6 w-full space-y-6 pr-3">
        <AnimatePresence>
          {blocks.map((block, index) => {
            const motionDivProps = {
              key: block.id,
              ref: (el) => (blockRefs.current[index] = el),
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -10 },
              layout: true,
            };

            switch (block.type) {
              case "text":
                return (
                  <motion.div {...motionDivProps}>
                    <TextBlockWrapper
                      block={block}
                      index={index}
                      updateBlock={updateBlock}
                      removeBlock={removeBlock}
                    />
                  </motion.div>
                );

              case "image":
                return (
                  <motion.div {...motionDivProps}>
                    <PostImageBlock
                      block={block}
                      index={index}
                      updateBlock={updateBlock}
                      removeBlock={removeBlock}
                      handleImageUpload={(file) => handleImageUpload(file, index)}
                    />
                  </motion.div>
                );

              case "code":
                return (
                  <motion.div {...motionDivProps}>
                    <CodeBlock
                      block={block}
                      index={index}
                      updateBlock={updateBlock}
                      removeBlock={removeBlock}
                    />
                  </motion.div>
                );

              case "emoji":
                return (
                  <motion.div {...motionDivProps}>
                    <EmojiBlock
                      block={block}
                      index={index}
                      updateBlock={updateBlock}
                      removeBlock={removeBlock}
                    />
                  </motion.div>
                );

              case "file":
                return (
                  <motion.div {...motionDivProps} className="my-4 flex flex-col">
                    <FileBlock url={block.url} name={block.name} size={block.size} />
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, index)}
                      className="mt-2"
                    />
                    <button
                      onClick={() => removeBlock(index)}
                      className="mt-2 text-red-600 hover:underline"
                    >
                      Remove File
                    </button>
                  </motion.div>
                );

              case "heading":
                return (
                  <motion.div
                    {...motionDivProps}
                    className="w-full my-6 p-4 rounded-2xl bg-white shadow-md border border-gray-200 space-y-4"
                  >
                    <HeadingBlock level={block.level} text={block.text} />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Heading Text
                      </label>
                      <input
                        type="text"
                        value={block.text}
                        onChange={(e) =>
                          updateBlock(index, { ...block, text: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Edit heading text"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Heading Level
                      </label>
                      <select
                        value={block.level}
                        onChange={(e) =>
                          updateBlock(index, { ...block, level: +e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        {[1, 2, 3].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            H{lvl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-right">
                      <button
                        onClick={() => removeBlock(index)}
                        className="text-lg text-red-600 font-medium"
                      >
                        ❌
                      </button>
                    </div>
                  </motion.div>
                );

              case "hr":
                return (
                  <motion.div {...motionDivProps}>
                    <HrBlock
                      block={block}
                      onChange={(updatedBlock) => updateBlock(index, updatedBlock)}
                      onDelete={() => removeBlock(index)}
                    />
                  </motion.div>
                );

              case "link":
                return (
                  <motion.div
                    {...motionDivProps}
                    className="w-full my-6 p-4 rounded-2xl bg-white shadow-md border border-gray-200"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link URL
                    </label>
                    <input
                      type="text"
                      value={block.href}
                      onChange={(e) =>
                        updateBlock(index, { ...block, href: e.target.value })
                      }
                      placeholder="https://example.com"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 mb-3"
                    />

                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link Text
                    </label>
                    <input
                      type="text"
                      value={block.text}
                      onChange={(e) =>
                        updateBlock(index, { ...block, text: e.target.value })
                      }
                      placeholder="Link text"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900"
                    />
                    <div className="text-right mt-3">
                      <button
                        onClick={() => removeBlock(index)}
                        className="text-lg text-red-600 font-medium"
                      >
                        ❌
                      </button>
                    </div>
                  </motion.div>
                );

              case "list":
                return (
                  <motion.div
                    {...motionDivProps}
                    className="w-full my-6 p-4 rounded-2xl bg-white shadow-md border border-gray-200"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {block.ordered ? "Ordered List Items" : "Unordered List Items"}
                    </label>

                    {block.items.map((item, i) => (
                      <input
                        key={i}
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const newItems = [...block.items];
                          newItems[i] = e.target.value;
                          updateBlock(index, { ...block, items: newItems });
                        }}
                        placeholder={`Item ${i + 1}`}
                        className="w-full px-4 py-2 mb-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      />
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        const newItems = [...block.items, ""];
                        updateBlock(index, { ...block, items: newItems });
                      }}
                      className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700"
                    >
                      + Add Item
                    </button>

                    <div className="text-right mt-3">
                      <button
                        onClick={() => removeBlock(index)}
                        className="text-lg text-red-600 font-medium"
                      >
                        ❌ Remove List
                      </button>
                    </div>
                  </motion.div>
                );

              default:
                return null;
            }
          })}
        </AnimatePresence>
      </div>

      <AddBlockButtons addBlock={addBlock} />
    </div>
  );
};

export default PostEditor;
