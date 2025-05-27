import React, { useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

import PostImageBlock from "../PostFeature/PostImageBlock";
import CodeBlock from "../PostFeature/CodeBlock";
import TextBlockWrapper from "../PostFeature/TextBlockWrapper";
import TitleInput from "../PostFeature/TitleInput";
import AddBlockButtons from "../PostFeature/AddBlockButtons";
import FileBlock from "../PostFeature/FileBlock";
import HeadingBlock from "../PostFeature/HeadingBlock";
import HrBlock from "../PostFeature/HrBlock";
import LinkBlock from "../PostFeature/LinkBlock";
import PollBlock from "../PostFeature/PollBlock";
import QuoteBlock from "../PostFeature/QuoteBlock";
import TableBlock from "../PostFeature/TableBlock";
import VideoBlock from "../PostFeature/VideoBlock";

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
       
        : type === "file"
        ? { id: uuidv4(), type, url: "", name: "", size: 0 }
        : type === "hr"
        ? { id: uuidv4(), type }
        : type === "link"
        ? { id: uuidv4(), type, href: "", text: "Link Text" }
        : type === "list"
        ? { id: uuidv4(), type, items: [""], ordered: options.ordered || false }
        : type === "poll"
        ? { id: uuidv4(), type, question: "", options: ["", ""] }
        : type === "quote"
        ? { id: uuidv4(), type, text: "Your quote here...", author: "" }
        : type === "table"
        ? { id: uuidv4(), type, data: [[""]] }
        : type === "video"
        ? { id: uuidv4(), type, src: "", caption: "" }
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
    updateBlock(index, {
      ...blocks[index],
      url,
      name: file.name,
      size: file.size,
    });
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
                      handleImageUpload={(file) =>
                        handleImageUpload(file, index)
                      }
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

              

              case "file":
                return (
                  <motion.div
                    {...motionDivProps}
                    className="my-4 flex flex-col"
                  >
                    <FileBlock
                      url={block.url}
                      name={block.name}
                      size={block.size}
                    />
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
                          updateBlock(index, {
                            ...block,
                            level: +e.target.value,
                          })
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
                      onChange={(updatedBlock) =>
                        updateBlock(index, updatedBlock)
                      }
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
                      {block.ordered
                        ? "Ordered List Items"
                        : "Unordered List Items"}
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
              case "poll":
                return (
                  <motion.div
                    key={block.id}
                    ref={(el) => (blockRefs.current[index] = el)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    layout
                    className="w-full"
                  >
                    <PollBlock
                      question={block.question}
                      options={block.options}
                      onChangeQuestion={(newQuestion) =>
                        updateBlock(index, { ...block, question: newQuestion })
                      }
                      onChangeOptions={(i, val, remove = false) => {
                        let newOptions = [...block.options];
                        if (remove) {
                          newOptions.splice(i, 1);
                        } else if (i >= newOptions.length) {
                          newOptions.push(val);
                        } else {
                          newOptions[i] = val;
                        }
                        updateBlock(index, { ...block, options: newOptions });
                      }}
                    />
                    <div className="text-right mt-3">
                      <button
                        onClick={() => removeBlock(index)}
                        className="text-lg text-red-600 font-medium"
                        title="Remove Poll"
                      >
                        ❌
                      </button>
                    </div>
                  </motion.div>
                );
              case "quote":
                return (
                  <motion.div {...motionDivProps} className="w-full">
                    <QuoteBlock text={block.text} author={block.author} />
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={block.text}
                        onChange={(e) =>
                          updateBlock(index, { ...block, text: e.target.value })
                        }
                        placeholder="Quote text"
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                      <input
                        type="text"
                        value={block.author}
                        onChange={(e) =>
                          updateBlock(index, {
                            ...block,
                            author: e.target.value,
                          })
                        }
                        placeholder="Author (optional)"
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                      <div className="text-right">
                        <button
                          onClick={() => removeBlock(index)}
                          className="text-lg text-red-600 font-medium"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              case "table":
                return (
                  <motion.div
                    {...motionDivProps}
                    className="w-full my-6 p-4 rounded-2xl bg-white shadow-md border border-gray-200"
                  >
                    <TableBlock
                      headers={block.headers || []}
                      rows={block.data || [[]]}
                      caption={block.caption || ""}
                    />

                    <div className="mt-4 space-y-4">
                      {(block.data || []).map((row, rowIndex) => (
                        <div
                          key={rowIndex}
                          className="flex space-x-2 items-center"
                        >
                          {row.map((cell, cellIndex) => (
                            <input
                              key={cellIndex}
                              type="text"
                              value={cell}
                              onChange={(e) => {
                                const newData = [...block.data];
                                newData[rowIndex][cellIndex] = e.target.value;
                                updateBlock(index, { ...block, data: newData });
                              }}
                              placeholder={`R${rowIndex + 1} C${cellIndex + 1}`}
                              className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          ))}
                        </div>
                      ))}

                      {/* Add/Remove rows and columns */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const newData = [...block.data];
                            newData.push(
                              new Array(block.data[0].length).fill("")
                            );
                            updateBlock(index, { ...block, data: newData });
                          }}
                          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          + Add Row
                        </button>

                        <button
                          onClick={() => {
                            const newData = block.data.map((row) => [
                              ...row,
                              "",
                            ]);
                            updateBlock(index, { ...block, data: newData });
                          }}
                          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          + Add Column
                        </button>
                      </div>

                      <div className="flex space-x-2 mt-4">
                        <button
                          onClick={() => {
                            if (block.data.length > 1) {
                              const newData = block.data.slice(0, -1); // Remove last row
                              updateBlock(index, { ...block, data: newData });
                            }
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          - Remove Row
                        </button>

                        <button
                          onClick={() => {
                            if (block.data[0].length > 1) {
                              const newData = block.data.map((row) =>
                                row.slice(0, -1)
                              );
                              updateBlock(index, { ...block, data: newData });
                            }
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          - Remove Column
                        </button>
                      </div>

                      {/* Delete entire table */}
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={() => removeBlock(index)}
                          className="px-4 py-1 bg-red-700 text-white rounded hover:bg-red-800"
                          title="Delete entire table"
                        >
                          ❌ Delete Table
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              case "video":
                return (
                  <motion.div {...motionDivProps}>
                    <VideoBlock src={block.src} caption={block.caption} />
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Video URL (mp4)
                      </label>
                      <input
                        type="text"
                        value={block.src}
                        onChange={(e) =>
                          updateBlock(index, { ...block, src: e.target.value })
                        }
                        placeholder="https://example.com/video.mp4"
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Caption (optional)
                      </label>
                      <input
                        type="text"
                        value={block.caption}
                        onChange={(e) =>
                          updateBlock(index, {
                            ...block,
                            caption: e.target.value,
                          })
                        }
                        placeholder="Caption text"
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div className="text-right mt-2">
                      <button
                        onClick={() => removeBlock(index)}
                        className="text-lg text-red-600 font-medium"
                        title="Remove Video Block"
                      >
                        ❌
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
