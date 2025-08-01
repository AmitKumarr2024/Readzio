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

  console.log("[SortableBlock] Rendering block:", {
    id: block.id,
    index,
    isDragging,
  });

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-8 sm:w-10 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark transition-all duration-200 rounded-l-lg cursor-move z-10 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        title="Drag to reorder"
        aria-label="Drag to reorder block"
      >
        <FiMove className="text-base sm:text-lg" />
      </button>
      <div className="pl-10 sm:pl-12">{children}</div>
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
    console.log("[PostEditor] Drag end:", {
      activeId: active.id,
      overId: over?.id,
    });
    if (active.id !== over?.id) {
      const oldIndex = blocks.findIndex((block) => block.id === active.id);
      const newIndex = blocks.findIndex((block) => block.id === over?.id);
      const newBlocks = [...blocks];
      const [movedBlock] = newBlocks.splice(oldIndex, 1);
      newBlocks.splice(newIndex, 0, movedBlock);
      setBlocks(newBlocks);
      console.log("[PostEditor] Blocks reordered:", newBlocks);
    }
  };

  const addBlock = (type, options = {}) => {
    console.log("[PostEditor] Adding block:", { type, options });
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
        ? {
            id: uuidv4(),
            type,
            headers: ["Header 1", "Header 2"],
            rows: [
              ["", ""],
              ["", ""],
            ],
            caption: "",
          }
        : type === "video"
        ? { id: uuidv4(), type, src: "", caption: "" }
        : null;

    if (newBlock) {
      if (
        type === "table" &&
        (!newBlock.headers.length || !newBlock.rows.length)
      ) {
        toast.error("Invalid table configuration.");
        return;
      }
      setBlocks([...blocks, newBlock]);
      console.log("[PostEditor] Block added:", newBlock);
      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} block added`
      );
    }
  };

  const updateBlock = (index, newData) => {
    console.log(
      "[PostEditor] Updating block at index:",
      index,
      "with data:",
      newData
    );
    const updated = [...blocks];
    updated[index] = { ...updated[index], ...newData };
    setBlocks(updated);
  };

  const removeBlock = (index) => {
    console.log("[PostEditor] Removing block at index:", index);
    const updated = blocks.filter((_, i) => i !== index);
    setBlocks(updated);
    toast.success("Block removed");
  };

  const handleImageUpload = (file, index) => {
    console.log(
      "[PostEditor] Uploading image for block index:",
      index,
      "file:",
      file?.name
    );
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateBlock(index, {
        src: reader.result,
        caption: blocks[index].caption,
      });
      console.log("[PostEditor] Image uploaded for block index:", index);
      toast.success("Image uploaded");
    };
    reader.onerror = () => toast.error("Failed to upload image");
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e, index) => {
    const file = e.target.files[0];
    console.log(
      "[PostEditor] Uploading file for block index:",
      index,
      "file:",
      file?.name
    );
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }
    const url = URL.createObjectURL(file);
    updateBlock(index, {
      url,
      name: file.name,
      size: file.size,
    });
    console.log("[PostEditor] File uploaded for block index:", index);
    toast.success("File uploaded");
  };

  useEffect(() => {
    console.log("[PostEditor] Blocks updated:", blocks);
    if (blockRefs.current.length > blocks.length) {
      blockRefs.current = blockRefs.current.slice(0, blocks.length);
    }
    if (blocks.length > 0) {
      const lastBlock = blockRefs.current[blocks.length - 1];
      if (lastBlock) {
        lastBlock.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [blocks]);

  const sizeToWidthClass = (size) => {
    const widthMap = {
      25: "w-full sm:w-1/2 md:w-1/4",
      50: "w-full sm:w-3/4 md:w-1/2",
      60: "w-full sm:w-4/5 md:w-3/5",
      75: "w-full sm:w-11/12 md:w-3/4",
      100: "w-full md:w-full",
    };
    return widthMap[size] || "w-full";
  };

  console.log("[PostEditor] Rendering with state:", { title, blocks, size });

  return (
    <div
      className={`min-w-[350px] ${sizeToWidthClass(
        size
      )} max-w-[1200px] min-h-[600px] sm:min-h-[800px] bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-xl flex flex-col p-3 sm:p-4 md:p-6 rounded-2xl mx-auto transition-all duration-300 border border-gray-200 dark:border-gray-800`}
    >
      <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center mb-4 sm:mb-6 tracking-wide">
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
          <div className="flex flex-col mx-auto bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark overflow-y-auto mb-4 px-3 sm:px-4 md:px-6 pb-4 sm:pb-6 w-full space-y-4 sm:space-y-6 min-h-[400px] sm:min-h-[430px] pt-4 sm:pt-6 rounded-lg">
            <AnimatePresence>
              {blocks.map((block, index) => {
                console.log("[PostEditor] Rendering block:", {
                  index,
                  type: block.type,
                  id: block.id,
                });
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
                        <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-md p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                          <FileBlock
                            url={block.url}
                            name={block.name}
                            size={block.size}
                          />
                          <input
                            type="file"
                            onChange={(e) => handleFileUpload(e, index)}
                            className="mt-2 block w-full text-xs sm:text-sm text-text-main-light dark:text-text-main-dark file:mr-3 sm:mr-4 file:py-1.5 sm:py-2 file:px-3 sm:px-4 file:rounded file:border-0 file:bg-blue-100 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-200 dark:hover:file:bg-blue-800"
                            aria-label="Upload file"
                          />
                          <button
                            onClick={() => removeBlock(index)}
                            className="mt-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-red-500 text-white text-xs sm:text-sm rounded hover:bg-red-600 transition focus:ring-2 focus:ring-blue-500"
                            aria-label="Remove file block"
                          >
                            Remove File
                          </button>
                        </div>
                      );
                    case "heading":
                      return (
                        <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-md p-3 sm:p-4 rounded-lg space-y-3 sm:space-y-4 border border-gray-200 dark:border-gray-800">
                          <HeadingBlock level={block.level} text={block.text} />
                          <div>
                            <label className="block text-xs sm:text-sm font-medium mb-1">
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
                              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Edit heading text"
                              aria-label="Heading text"
                            />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-medium mb-1">
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
                              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Heading level"
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
                              className="px-3 sm:px-4 py-1 sm:py-1.5 bg-red-500 text-white text-xs sm:text-sm rounded hover:bg-red-600 transition focus:ring-2 focus:ring-blue-500"
                              aria-label="Remove heading block"
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
                        <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-md p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                          <label className="block text-xs sm:text-sm font-medium mb-1">
                            Link URL
                          </label>
                          <input
                            type="url"
                            value={block.href}
                            onChange={(e) =>
                              updateBlock(index, {
                                ...block,
                                href: e.target.value,
                              })
                            }
                            placeholder="https://example.com"
                            className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Link URL"
                          />
                          <label className="block text-xs sm:text-sm font-medium mb-1 mt-2">
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
                            className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Link text"
                          />
                          <div className="text-right mt-2">
                            <button
                              onClick={() => removeBlock(index)}
                              className="px-3 sm:px-4 py-1 sm:py-1.5 bg-red-500 text-white text-xs sm:text-sm rounded hover:bg-red-600 transition focus:ring-2 focus:ring-blue-500"
                              aria-label="Remove link block"
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      );
                    case "list":
                      return (
                        <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-md p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                          <label className="block text-xs sm:text-sm font-medium mb-1">
                            {block.ordered
                              ? "Ordered List Items"
                              : "Unordered List Items"}
                          </label>
                          {block.items.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 mb-2"
                            >
                              <input
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
                                className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label={`List item ${i + 1}`}
                              />
                              {block.items.length > 1 && (
                                <button
                                  onClick={() => {
                                    const newItems = block.items.filter(
                                      (_, idx) => idx !== i
                                    );
                                    updateBlock(index, {
                                      ...block,
                                      items: newItems,
                                    });
                                  }}
                                  className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
                                  aria-label={`Remove list item ${i + 1}`}
                                >
                                  ❌
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = [...block.items, ""];
                              updateBlock(index, { ...block, items: newItems });
                            }}
                            className="mt-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-600 transition"
                            aria-label="Add list item"
                          >
                            + Add Item
                          </button>
                          <div className="text-right mt-2">
                            <button
                              onClick={() => removeBlock(index)}
                              className="px-3 sm:px-4 py-1 sm:py-1.5 bg-red-500 text-white text-xs sm:text-sm rounded hover:bg-red-600 transition"
                              aria-label="Remove list block"
                            >
                              ❌ Remove List
                            </button>
                          </div>
                        </div>
                      );
                    case "poll":
                      return (
                        <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-md p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-800">
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
                              if (remove && newOptions.length > 2) {
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
                          <div className="text-right mt-2">
                            <button
                              onClick={() => removeBlock(index)}
                              className="px-3 sm:px-4 py-1 sm:py-1.5 bg-red-500 text-white text-xs sm:text-sm rounded hover:bg-red-600 transition"
                              aria-label="Remove poll block"
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      );
                    case "quote":
                      return (
                        <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-md p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-800">
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
                              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Quote text"
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
                              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Quote author"
                            />
                            <div className="text-right">
                              <button
                                onClick={() => removeBlock(index)}
                                className="px-3 sm:px-4 py-1 sm:py-1.5 bg-red-500 text-white text-xs sm:text-sm rounded hover:bg-red-600 transition"
                                aria-label="Remove quote block"
                              >
                                ❌
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    case "table":
                      return (
                        <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-md p-3 sm:p-4 rounded-lg max-w-full border border-gray-200 dark:border-gray-800">
                          <TableBlock
                            headers={block.headers || []}
                            rows={block.rows || [[]]}
                            caption={block.caption || ""}
                          />
                          <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
                            <div>
                              <label className="block text-xs sm:text-sm font-medium mb-1">
                                Headers
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 items-center">
                                {(block.headers || []).map(
                                  (header, headerIndex) => (
                                    <input
                                      key={headerIndex}
                                      type="text"
                                      value={header}
                                      onChange={(e) => {
                                        const newHeaders = [...block.headers];
                                        newHeaders[headerIndex] =
                                          e.target.value;
                                        updateBlock(index, {
                                          ...block,
                                          headers: newHeaders,
                                        });
                                      }}
                                      placeholder={`Header ${headerIndex + 1}`}
                                      className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-800 rounded bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      aria-label={`Table header ${
                                        headerIndex + 1
                                      }`}
                                    />
                                  )
                                )}
                                <button
                                  onClick={() => {
                                    const newHeaders = [
                                      ...(block.headers || []),
                                      "",
                                    ];
                                    const newRows = (block.rows || []).map(
                                      (row) => [...row, ""]
                                    );
                                    updateBlock(index, {
                                      ...block,
                                      headers: newHeaders,
                                      rows: newRows.length ? newRows : [[""]],
                                    });
                                    toast.success("Header added");
                                  }}
                                  className="px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-500 text-white text-xs sm:text-sm rounded hover:bg-blue-600 transition"
                                  aria-label="Add table header"
                                >
                                  + Add Header
                                </button>
                              </div>
                            </div>

                            {(block.rows || []).map((row, rowIndex) => (
                              <div
                                key={rowIndex}
                                className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 items-center"
                              >
                                {row.map((cell, cellIndex) => (
                                  <input
                                    key={cellIndex}
                                    type="text"
                                    value={cell}
                                    onChange={(e) => {
                                      const newRows = [...block.rows];
                                      newRows[rowIndex][cellIndex] =
                                        e.target.value;
                                      updateBlock(index, {
                                        ...block,
                                        rows: newRows,
                                      });
                                    }}
                                    placeholder={`R${rowIndex + 1} C${
                                      cellIndex + 1
                                    }`}
                                    className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-800 rounded bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    aria-label={`Table cell row ${
                                      rowIndex + 1
                                    } column ${cellIndex + 1}`}
                                  />
                                ))}
                              </div>
                            ))}

                            <div>
                              <label className="block text-xs sm:text-sm font-medium mb-1">
                                Caption (optional)
                              </label>
                              <input
                                type="text"
                                value={block.caption || ""}
                                onChange={(e) =>
                                  updateBlock(index, {
                                    ...block,
                                    caption: e.target.value,
                                  })
                                }
                                placeholder="Table caption"
                                className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-800 rounded bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Table caption"
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => {
                                  const newRows = [...(block.rows || [])];
                                  newRows.push(
                                    Array(block.headers?.length || 1).fill("")
                                  );
                                  updateBlock(index, {
                                    ...block,
                                    rows: newRows,
                                  });
                                  toast.success("Row added");
                                }}
                                className="px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-500 text-white text-xs sm:text-sm rounded hover:bg-blue-600 transition"
                                aria-label="Add table row"
                              >
                                + Add Row
                              </button>
                              <button
                                onClick={() => {
                                  const newHeaders = [
                                    ...(block.headers || []),
                                    "",
                                  ];
                                  const newRows = (block.rows || []).map(
                                    (row) => [...row, ""]
                                  );
                                  updateBlock(index, {
                                    ...block,
                                    headers: newHeaders,
                                    rows: newRows.length ? newRows : [[""]],
                                  });
                                  toast.success("Column added");
                                }}
                                className="px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-500 text-white text-xs sm:text-sm rounded hover:bg-blue-600 transition"
                                aria-label="Add table column"
                              >
                                + Add Column
                              </button>
                              <button
                                onClick={() => {
                                  if (block.rows?.length > 1) {
                                    const newRows = block.rows.slice(0, -1);
                                    updateBlock(index, {
                                      ...block,
                                      rows: newRows,
                                    });
                                    toast.success("Row removed");
                                  } else {
                                    toast.error("At least one row is required");
                                  }
                                }}
                                className="px-3 sm:px-4 py-1 sm:py-1.5 bg-red-500 text-white text-xs sm:text-sm rounded hover:bg-red-600 transition"
                                aria-label="Remove table row"
                              >
                                - Remove Row
                              </button>
                              <button
                                onClick={() => {
                                  if (block.headers?.length > 1) {
                                    const newHeaders = block.headers.slice(
                                      0,
                                      -1
                                    );
                                    const newRows = block.rows.map((row) =>
                                      row.slice(0, -1)
                                    );
                                    updateBlock(index, {
                                      ...block,
                                      headers: newHeaders,
                                      rows: newRows,
                                    });
                                    toast.success("Column removed");
                                  } else {
                                    toast.error(
                                      "At least one column is required"
                                    );
                                  }
                                }}
                                className="px-3 sm:px-4 py-1 sm:py-1.5 bg-red-500 text-white text-xs sm:text-sm rounded hover:bg-red-600 transition"
                                aria-label="Remove table column"
                              >
                                - Remove Column
                              </button>
                            </div>

                            <div className="flex justify-end mt-3 sm:mt-4">
                              <button
                                onClick={() => removeBlock(index)}
                                className="px-3 sm:px-4 py-1 sm:py-1.5 bg-red-600 text-white text-xs sm:text-sm rounded hover:bg-red-700 transition"
                                aria-label="Delete table block"
                              >
                                ❌ Delete Table
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    case "video":
                      return (
                        <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-md p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                          <VideoBlock src={block.src} caption={block.caption} />
                          <div className="mt-2">
                            <label className="block text-xs sm:text-sm font-medium mb-1">
                              Video URL (mp4)
                            </label>
                            <input
                              type="url"
                              value={block.src}
                              onChange={(e) =>
                                updateBlock(index, {
                                  ...block,
                                  src: e.target.value,
                                })
                              }
                              placeholder="https://example.com/video.mp4"
                              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Video URL"
                            />
                          </div>
                          <div className="mt-2">
                            <label className="block text-xs sm:text-sm font-medium mb-1">
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
                              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Video caption"
                            />
                          </div>
                          <div className="text-right mt-2">
                            <button
                              onClick={() => removeBlock(index)}
                              className="px-3 sm:px-4 py-1 sm:py-1.5 bg-red-500 text-white text-xs sm:text-sm rounded hover:bg-red-600 transition"
                              aria-label="Remove video block"
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
                    <motion.div
                      key={block.id}
                      {...motionDivProps}
                      ref={(el) => (blockRefs.current[index] = el)}
                    >
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
