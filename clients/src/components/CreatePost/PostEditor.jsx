import React, { useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FiMove } from "react-icons/fi";

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

const SortableBlock = ({ block, index, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-10 bg-gray-100 hover:bg-blue-500 hover:text-white transition-all duration-200 rounded-l-lg cursor-move z-10"
        title="Drag to reorder"
      >
        <FiMove className="text-lg" />
      </button>
      <div className="pl-12">{children}</div>
    </div>
  );
};

const PostEditor = ({ title, setTitle, blocks, setBlocks, size }) => {
  const blockRefs = useRef([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = blocks.findIndex((block) => block.id === active.id);
      const newIndex = blocks.findIndex((block) => block.id === over?.id);
      const newBlocks = [...blocks];
      const [movedBlock] = newBlocks.splice(oldIndex, 1);
      newBlocks.splice(newIndex, 0, movedBlock);
      setBlocks(newBlocks);
    }
  };

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
      60: "md:w-3/5",
      75: "md:w-3/4",
      100: "md:w-full",
    };
    return widthMap[size] || "md:w-full";
  };

  return (
    <div
      className={`w-full ${sizeToWidthClass(
        size
      )} h-[950px] bg-white shadow-lg flex flex-col p-6 rounded-2xl`}
    >
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-6 tracking-wide">
        Create Content
      </h1>

      <TitleInput title={title} setTitle={setTitle} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((block) => block.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col mx-auto bg-gray-100 overflow-y-auto mb-4 px-6 pb-6 w-full space-y-6 h-[950px] pt-6 rounded-lg">
            <AnimatePresence>
              {blocks.map((block, index) => {
                const motionDivProps = {
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 },
                  exit: { opacity: 0, y: -20 },
                  transition: { duration: 0.3 },
                  layout: true,
                };

                const blockContent = (() => {
                  switch (block.type) {
                    case "text":
                      return (
                        <TextBlockWrapper
                          block={block}
                          index={index}
                          updateBlock={updateBlock}
                          removeBlock={removeBlock}
                        />
                      );
                    case "image":
                      return (
                        <PostImageBlock
                          block={block}
                          index={index}
                          updateBlock={updateBlock}
                          removeBlock={removeBlock}
                          handleImageUpload={(file) =>
                            handleImageUpload(file, index)
                          }
                        />
                      );
                    case "code":
                      return (
                        <CodeBlock
                          block={block}
                          index={index}
                          updateBlock={updateBlock}
                          removeBlock={removeBlock}
                        />
                      );
                    case "file":
                      return (
                        <div className="bg-white shadow-md p-4 rounded-lg">
                          <FileBlock
                            url={block.url}
                            name={block.name}
                            size={block.size}
                          />
                          <input
                            type="file"
                            onChange={(e) => handleFileUpload(e, index)}
                            className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          <button
                            onClick={() => removeBlock(index)}
                            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Remove File
                          </button>
                        </div>
                      );
                    case "heading":
                      return (
                        <div className="bg-white shadow-md p-4 rounded-lg space-y-4">
                          <HeadingBlock level={block.level} text={block.text} />
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Heading Text
                            </label>
                            <input
                              type="text"
                              value={block.text}
                              onChange={(e) =>
                                updateBlock(index, {
                                  ...block,
                                  text: e.target.value,
                                })
                              }
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      );
                    case "hr":
                      return (
                        <HrBlock
                          block={block}
                          onChange={(updatedBlock) =>
                            updateBlock(index, updatedBlock)
                          }
                          onDelete={() => removeBlock(index)}
                        />
                      );
                    case "link":
                      return (
                        <div className="bg-white shadow-md p-4 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Link URL
                          </label>
                          <input
                            type="text"
                            value={block.href}
                            onChange={(e) =>
                              updateBlock(index, {
                                ...block,
                                href: e.target.value,
                              })
                            }
                            placeholder="https://example.com"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 mb-3"
                          />
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Link Text
                          </label>
                          <input
                            type="text"
                            value={block.text}
                            onChange={(e) =>
                              updateBlock(index, {
                                ...block,
                                text: e.target.value,
                              })
                            }
                            placeholder="Link text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          />
                          <div className="text-right mt-3">
                            <button
                              onClick={() => removeBlock(index)}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      );
                    case "list":
                      return (
                        <div className="bg-white shadow-md p-4 rounded-lg">
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
                                updateBlock(index, {
                                  ...block,
                                  items: newItems,
                                });
                              }}
                              placeholder={`Item ${i + 1}`}
                              className="w-full px-4 py-2 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            />
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = [...block.items, ""];
                              updateBlock(index, { ...block, items: newItems });
                            }}
                            className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg shadow hover:bg-blue-700"
                          >
                            + Add Item
                          </button>
                          <div className="text-right mt-3">
                            <button
                              onClick={() => removeBlock(index)}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            >
                              ❌ Remove List
                            </button>
                          </div>
                        </div>
                      );
                    case "poll":
                      return (
                        <div className="bg-white shadow-md p-4 rounded-lg">
                          <PollBlock
                            question={block.question}
                            options={block.options}
                            onChangeQuestion={(newQuestion) =>
                              updateBlock(index, {
                                ...block,
                                question: newQuestion,
                              })
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
                              updateBlock(index, {
                                ...block,
                                options: newOptions,
                              });
                            }}
                          />
                          <div className="text-right mt-3">
                            <button
                              onClick={() => removeBlock(index)}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                              title="Remove Poll"
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      );
                    case "quote":
                      return (
                        <div className="bg-white shadow-md p-4 rounded-lg">
                          <QuoteBlock text={block.text} author={block.author} />
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={block.text}
                              onChange={(e) =>
                                updateBlock(index, {
                                  ...block,
                                  text: e.target.value,
                                })
                              }
                              placeholder="Quote text"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            />
                            <div className="text-right">
                              <button
                                onClick={() => removeBlock(index)}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                              >
                                ❌
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    case "table":
                      return (
                        <div className="bg-white shadow-md p-4 rounded-lg">
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
                                      newData[rowIndex][cellIndex] =
                                        e.target.value;
                                      updateBlock(index, {
                                        ...block,
                                        data: newData,
                                      });
                                    }}
                                    placeholder={`R${rowIndex + 1} C${
                                      cellIndex + 1
                                    }`}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                ))}
                              </div>
                            ))}
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  const newData = [...block.data];
                                  newData.push(
                                    new Array(block.data[0].length).fill("")
                                  );
                                  updateBlock(index, {
                                    ...block,
                                    data: newData,
                                  });
                                }}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                              >
                                + Add Row
                              </button>
                              <button
                                onClick={() => {
                                  const newData = block.data.map((row) => [
                                    ...row,
                                    "",
                                  ]);
                                  updateBlock(index, {
                                    ...block,
                                    data: newData,
                                  });
                                }}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                              >
                                + Add Column
                              </button>
                            </div>
                            <div className="flex space-x-2 mt-4">
                              <button
                                onClick={() => {
                                  if (block.data.length > 1) {
                                    const newData = block.data.slice(0, -1);
                                    updateBlock(index, {
                                      ...block,
                                      data: newData,
                                    });
                                  }
                                }}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                              >
                                - Remove Row
                              </button>
                              <button
                                onClick={() => {
                                  if (block.data[0].length > 1) {
                                    const newData = block.data.map((row) =>
                                      row.slice(0, -1)
                                    );
                                    updateBlock(index, {
                                      ...block,
                                      data: newData,
                                    });
                                  }
                                }}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                              >
                                - Remove Column
                              </button>
                            </div>
                            <div className="flex justify-end mt-4">
                              <button
                                onClick={() => removeBlock(index)}
                                className="px-4 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                title="Delete entire table"
                              >
                                ❌ Delete Table
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    case "video":
                      return (
                        <div className="bg-white shadow-md p-4 rounded-lg">
                          <VideoBlock src={block.src} caption={block.caption} />
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Video URL (mp4)
                            </label>
                            <input
                              type="text"
                              value={block.src}
                              onChange={(e) =>
                                updateBlock(index, {
                                  ...block,
                                  src: e.target.value,
                                })
                              }
                              placeholder="https://example.com/video.mp4"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            />
                          </div>
                          <div className="text-right mt-2">
                            <button
                              onClick={() => removeBlock(index)}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                              title="Remove Video Block"
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      );
                    default:
                      return null;
                  }
                })();

                return (
                  <SortableBlock key={block.id} block={block} index={index}>
                    <motion.div key={block.id} {...motionDivProps}>
                      {blockContent}
                    </motion.div>
                  </SortableBlock>
                );
              })}
            </AnimatePresence>
          </div>
        </SortableContext>
      </DndContext>

      <AddBlockButtons addBlock={addBlock} />
    </div>
  );
};

export default PostEditor;
