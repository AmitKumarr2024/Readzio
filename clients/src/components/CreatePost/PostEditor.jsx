import React, { useCallback, useState } from "react";
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
import AddBlockButtons from "../PostFeature/AddBlockSidebar";
import FileBlock from "../PostFeature/FileBlock";
import HeadingBlock from "../PostFeature/HeadingBlock";
import HrBlock from "../PostFeature/HrBlock";
import LinkBlock from "../PostFeature/LinkBlock";
import PollBlock from "../PostFeature/PollBlock";
import QuoteBlock from "../PostFeature/QuoteBlock";
import TableBlock from "../PostFeature/TableBlock";
import VideoBlock from "../PostFeature/VideoBlock";
import { FiEdit3 } from "react-icons/fi";
import { Trash2 } from "lucide-react";
import AddBlockSidebar from "../PostFeature/AddBlockSidebar";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGE_COUNT = 40; // 40 images
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image
const MAX_PAYLOAD_SIZE = 40 * 1024 * 1024; // 40 MB
const MAX_TEXT_BLOCK_SIZE = 100 * 1024; // 100KB
const MAX_TABLE_BLOCK_SIZE = 200 * 1024; // 200KB

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
        className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-all duration-200 rounded-l-xl cursor-move z-10 opacity-0 group-hover:opacity-100"
      >
        <div className="flex flex-col space-y-0.5">
          <div className="w-1 h-1 bg-current rounded-full"></div>
          <div className="w-1 h-1 bg-current rounded-full"></div>
          <div className="w-1 h-1 bg-current rounded-full"></div>
        </div>
      </button>
      <div className="pl-10 sm:pl-12">{children}</div>
    </div>
  );
};

const PostEditor = ({ title, setTitle, blocks, setBlocks, size }) => {
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const preventScroll = useCallback(() => {
    const scrollPosition = window.scrollY;
    return () => {
      window.scrollTo(0, scrollPosition);
    };
  }, []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const restoreScroll = preventScroll();
      const oldIndex = blocks.findIndex((block) => block.id === active.id);
      const newIndex = blocks.findIndex((block) => block.id === over?.id);
      const newBlocks = [...blocks];
      const [movedBlock] = newBlocks.splice(oldIndex, 1);
      newBlocks.splice(newIndex, 0, movedBlock);
      setBlocks(newBlocks);
      restoreScroll();
    }
  };

  const addBlock = (type, options = {}, afterIndex = null) => {
    const restoreScroll = preventScroll();
    const imageCount = blocks.filter((b) => b.type === "image").length;
    const postSize = new TextEncoder().encode(
      JSON.stringify({ title, blocks })
    ).length;

    if (type === "image" && imageCount >= MAX_IMAGE_COUNT) {
      toast.error(`Maximum ${MAX_IMAGE_COUNT} images reached.`);
      return;
    }
    if (postSize >= MAX_PAYLOAD_SIZE) {
      toast.error("Post size limit of 40MB reached.");
      return;
    }

    const newBlock =
      type === "text"
        ? { id: uuidv4(), type, value: "<p></p>" }
        : type === "heading"
        ? { id: uuidv4(), type, level: 2, text: "Heading Text" }
        : type === "code"
        ? {
            id: uuidv4(),
            type,
            code: options.code || "",
            caption: options.caption || "",
            language: options.language || "",
          }
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
            data: [
              ["", ""],
              ["", ""],
            ],
            caption: "",
          }
        : type === "video"
        ? { id: uuidv4(), type, src: "", caption: "" }
        : null;

    if (newBlock) {
      if (type === "table" && !newBlock.data?.length) {
        toast.error("Invalid table configuration.");
        return;
      }
      setBlocks([...blocks, newBlock]);
      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} block added`
      );
      restoreScroll();
    }
  };

  const updateBlock = (index, newData) => {
    // console.log("Updating block:", { index, newData }); // Debug log
    const restoreScroll = preventScroll();
    const updated = [...blocks];
    updated[index] = { ...updated[index], ...newData }; // This should preserve language
    // console.log("Updated block result:", updated[index]); // Debug log
    setBlocks(updated);
    restoreScroll();
  };

  // Add block selection handler
  const handleBlockClick = (index, e) => {
    // Don't select if clicking inside input/button/textarea
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "BUTTON" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.closest("button")
    ) {
      return;
    }
    setSelectedBlockIndex(index === selectedBlockIndex ? null : index);
  };

  // Update removeBlock to clear selection
  const removeBlock = (index) => {
    const restoreScroll = preventScroll();
    const updated = blocks.filter((_, i) => i !== index);
    setBlocks(updated);
    setSelectedBlockIndex(null); // Clear selection
    toast.success("Block removed");
    restoreScroll();
  };

  const handleImageUpload = (file, index) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image size exceeds 5MB limit.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    const imageCount = blocks.filter((b) => b.type === "image").length;
    if (imageCount >= MAX_IMAGE_COUNT) {
      toast.error(`Maximum ${MAX_IMAGE_COUNT} images reached.`);
      return;
    }
    const restoreScroll = preventScroll();
    const reader = new FileReader();
    reader.onload = () => {
      updateBlock(index, {
        src: reader.result,
        caption: blocks[index]?.caption || "",
      });
      toast.success("Image uploaded");
      restoreScroll();
    };
    reader.onerror = () => {
      toast.error("Failed to upload image");
      restoreScroll();
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }
    const postSize =
      new TextEncoder().encode(JSON.stringify({ title, blocks })).length +
      file.size;
    if (postSize > MAX_PAYLOAD_SIZE) {
      toast.error("Adding this file exceeds 40MB post size limit.");
      return;
    }
    const restoreScroll = preventScroll();
    const url = URL.createObjectURL(file);
    updateBlock(index, {
      url,
      name: file.name,
      size: file.size,
    });
    toast.success("File uploaded");
    restoreScroll();
  };

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

  const imageCount = blocks.filter((b) => b.type === "image").length;
  const postSize = new TextEncoder().encode(
    JSON.stringify({ title, blocks })
  ).length;

  const isImageLimitReached = imageCount >= MAX_IMAGE_COUNT;
  const isSizeLimitReached = postSize >= MAX_PAYLOAD_SIZE;

  return (
    <div
      className={`min-w-[350px] ml-20 ${sizeToWidthClass(
        size
      )} max-w-[1200px] min-h-[600px] sm:min-h-[800px] bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-xl flex flex-col p-3 sm:p-4 md:p-6 rounded-2xl mx-auto transition-all duration-300 border border-gray-200 dark:border-gray-800 ${
        isImageLimitReached || isSizeLimitReached
          ? "animate-pulse border-red-500 dark:border-red-400"
          : ""
      }`}
    >
      <div className="flex items-center gap-6 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <FiEdit3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Content
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Build your post with blocks
          </p>
        </div>
        <div className="grow ml-10 mb-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Images Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Images
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {imageCount}/{MAX_IMAGE_COUNT}
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ease-out ${
                    isImageLimitReached
                      ? "bg-red-500 animate-pulse"
                      : imageCount / MAX_IMAGE_COUNT > 0.8
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      (imageCount / MAX_IMAGE_COUNT) * 100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {imageCount} of {MAX_IMAGE_COUNT} images
                </p>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    isImageLimitReached
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 animate-pulse"
                      : imageCount > MAX_IMAGE_COUNT * 0.8
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  }`}
                >
                  {isImageLimitReached ? "Limit Reached" : "Available"}
                </span>
              </div>
            </div>

            {/* File Size Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Post Size
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {((postSize / MAX_PAYLOAD_SIZE) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ease-out ${
                    isSizeLimitReached
                      ? "bg-red-500 animate-pulse"
                      : postSize / MAX_PAYLOAD_SIZE > 0.8
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      (postSize / MAX_PAYLOAD_SIZE) * 100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(postSize / 1024).toFixed(2)} KB / 40 MB
                </p>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    isSizeLimitReached
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 animate-pulse"
                      : postSize > MAX_PAYLOAD_SIZE * 0.8
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  }`}
                >
                  {isSizeLimitReached ? "Limit Reached" : "Available"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TitleInput title={title || ""} setTitle={setTitle} />
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
                const isSelected = selectedBlockIndex === index;
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
                            url={block.url || ""}
                            name={block.name || ""}
                            size={block.size || 0}
                          />
                          <input
                            type="file"
                            onChange={(e) => handleFileUpload(e, index)}
                            className="mt-2 block w-full text-xs sm:text-sm text-text-main-light dark:text-text-main-dark file:mr-3 sm:mr-4 file:py-1.5 sm:py-2 file:px-3 sm:px-4 file:rounded file:border-0 file:bg-blue-100 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-200 dark:hover:file:bg-blue-800"
                            aria-label="Upload file"
                            disabled={isSizeLimitReached}
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
                          <HeadingBlock
                            level={block.level || 2}
                            text={block.text || ""}
                          />
                          <div>
                            <label className="block text-xs sm:text-sm font-medium mb-1">
                              Heading Text
                            </label>
                            <input
                              type="text"
                              value={block.text || ""}
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
                              value={block.level || 2}
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
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                            >
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
                            value={block.href || ""}
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
                            value={block.text || ""}
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
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                            >
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
                          {(block.items || []).map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 mb-2"
                            >
                              <input
                                type="text"
                                value={item || ""}
                                onChange={(e) => {
                                  const newItems = [...(block.items || [])];
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
                              {(block.items || []).length > 1 && (
                                <button
                                  onClick={() => {
                                    const newItems = (block.items || []).filter(
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
                              const newItems = [...(block.items || []), ""];
                              updateBlock(index, { ...block, items: newItems });
                            }}
                            className="mt-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-600 transition"
                            aria-label="Add list item"
                            disabled={isSizeLimitReached}
                          >
                            + Add Item
                          </button>
                          <div className="text-right mt-2">
                            <button
                              onClick={() => removeBlock(index)}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                            >
                            </button>
                          </div>
                        </div>
                      );
                    case "poll":
                      return (
                        <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-md p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                          <PollBlock
                            question={block.question || ""}
                            options={
                              Array.isArray(block.options) &&
                              block.options.length >= 2
                                ? block.options
                                : ["", ""]
                            }
                            onChangeQuestion={(newQuestion) =>
                              updateBlock(index, {
                                ...block,
                                question: newQuestion,
                              })
                            }
                            onChangeOptions={(i, val, remove = false) => {
                              let newOptions = [...(block.options || ["", ""])];
                              if (remove) {
                                if (newOptions.length > 2) {
                                  newOptions.splice(i, 1);
                                }
                              } else if (i >= newOptions.length) {
                                newOptions.push(val);
                              } else {
                                newOptions[i] = val;
                              }
                              if (
                                newOptions.filter((opt) => opt?.trim() !== "")
                                  .length < 2
                              ) {
                                while (newOptions.length < 2) {
                                  newOptions.push("");
                                }
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
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                            >
                             
                            </button>
                          </div>
                        </div>
                      );
                    case "quote":
                      return (
                        <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-md p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                          <QuoteBlock
                            text={block.text || ""}
                            author={block.author || ""}
                          />
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={block.text || ""}
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
                              value={block.author || ""}
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
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                              >
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    case "table":
                      return (
                        <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-md p-3 sm:p-4 rounded-lg max-w-full border border-gray-200 dark:border-gray-800">
                          <TableBlock
                            data={
                              block.data &&
                              Array.isArray(block.data) &&
                              block.data.length > 0
                                ? block.data
                                : [
                                    ["", ""],
                                    ["", ""],
                                  ]
                            }
                            caption={block.caption || ""}
                          />
                          <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
                            <div>
                              <label className="block text-xs sm:text-sm font-medium mb-1">
                                Headers
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 items-center">
                                {(block.data?.[0] || []).map(
                                  (header, headerIndex) => (
                                    <input
                                      key={headerIndex}
                                      type="text"
                                      value={header || ""}
                                      onChange={(e) => {
                                        const restoreScroll = preventScroll();
                                        const newData = [
                                          ...(block.data || [[]]),
                                        ];
                                        newData[0] = [...(newData[0] || [])];
                                        newData[0][headerIndex] =
                                          e.target.value;
                                        updateBlock(index, {
                                          ...block,
                                          data: newData,
                                        });
                                        restoreScroll();
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
                                    const restoreScroll = preventScroll();
                                    const newData = (block.data || [[]]).map(
                                      (row) => [...row, ""]
                                    );
                                    updateBlock(index, {
                                      ...block,
                                      data: newData,
                                    });
                                    toast.success("Column added");
                                    restoreScroll();
                                  }}
                                  className="px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-500 text-white text-xs sm:text-sm rounded hover:bg-blue-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                  aria-label="Add table column"
                                  disabled={isSizeLimitReached}
                                >
                                  + Add Column
                                </button>
                              </div>
                            </div>
                            {(block.data?.slice(1) || []).map(
                              (row, rowIndex) => (
                                <div
                                  key={rowIndex}
                                  className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 items-center"
                                >
                                  {(row || []).map((cell, cellIndex) => (
                                    <input
                                      key={cellIndex}
                                      type="text"
                                      value={cell || ""}
                                      onChange={(e) => {
                                        const restoreScroll = preventScroll();
                                        const newData = [
                                          ...(block.data || [[]]),
                                        ];
                                        newData[rowIndex + 1] = [
                                          ...(newData[rowIndex + 1] || []),
                                        ];
                                        newData[rowIndex + 1][cellIndex] =
                                          e.target.value;
                                        updateBlock(index, {
                                          ...block,
                                          data: newData,
                                        });
                                        restoreScroll();
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
                              )
                            )}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium mb-1">
                                Caption (optional)
                              </label>
                              <input
                                type="text"
                                value={block.caption || ""}
                                onChange={(e) => {
                                  const restoreScroll = preventScroll();
                                  updateBlock(index, {
                                    ...block,
                                    caption: e.target.value,
                                  });
                                  restoreScroll();
                                }}
                                placeholder="Table caption"
                                className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-800 rounded bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Table caption"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => {
                                  const restoreScroll = preventScroll();
                                  const newData = [
                                    ...(block.data || [[]]),
                                    Array(block.data?.[0]?.length || 1).fill(
                                      ""
                                    ),
                                  ];
                                  updateBlock(index, {
                                    ...block,
                                    data: newData,
                                  });
                                  toast.success("Row added");
                                  restoreScroll();
                                }}
                                className="px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-500 text-white text-xs sm:text-sm rounded hover:bg-blue-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                aria-label="Add table row"
                                disabled={isSizeLimitReached}
                              >
                                + Add Row
                              </button>
                              <button
                                onClick={() => {
                                  const restoreScroll = preventScroll();
                                  const newData = (block.data || [[]]).map(
                                    (row) => [...row, ""]
                                  );
                                  updateBlock(index, {
                                    ...block,
                                    data: newData,
                                  });
                                  toast.success("Column added");
                                  restoreScroll();
                                }}
                                className="px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-500 text-white text-xs sm:text-sm rounded hover:bg-blue-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                aria-label="Add table column"
                                disabled={isSizeLimitReached}
                              >
                                + Add Column
                              </button>
                              <button
                                onClick={() => {
                                  const restoreScroll = preventScroll();
                                  if ((block.data || []).length > 1) {
                                    const newData = (block.data || []).slice(
                                      0,
                                      -1
                                    );
                                    updateBlock(index, {
                                      ...block,
                                      data: newData,
                                    });
                                    toast.success("Row removed");
                                  } else {
                                    toast.error("At least one row is required");
                                  }
                                  restoreScroll();
                                }}
                                className="px-3 sm:px-4 py-1 sm:py-1.5 bg-red-500 text-white text-xs sm:text-sm rounded hover:bg-red-600 transition"
                                aria-label="Remove table row"
                              >
                                - Remove Row
                              </button>
                              <button
                                onClick={() => {
                                  const restoreScroll = preventScroll();
                                  if (block.data?.[0]?.length > 1) {
                                    const newData = (block.data || [[]]).map(
                                      (row) => row.slice(0, -1)
                                    );
                                    updateBlock(index, {
                                      ...block,
                                      data: newData,
                                    });
                                    toast.success("Column removed");
                                  } else {
                                    toast.error(
                                      "At least one column is required"
                                    );
                                  }
                                  restoreScroll();
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
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                              >
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    case "video":
                      return (
                        <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-md p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                          <VideoBlock
                            src={block.src || ""}
                            caption={block.caption || ""}
                          />
                          <div className="mt-2">
                            <label className="block text-xs sm:text-sm font-medium mb-1">
                              Video URL (mp4)
                            </label>
                            <input
                              type="url"
                              value={block.src || ""}
                              onChange={(e) => {
                                const restoreScroll = preventScroll();
                                updateBlock(index, {
                                  ...block,
                                  src: e.target.value,
                                });
                                restoreScroll();
                              }}
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
                              value={block.caption || ""}
                              onChange={(e) => {
                                const restoreScroll = preventScroll();
                                updateBlock(index, {
                                  ...block,
                                  caption: e.target.value,
                                });
                                restoreScroll();
                              }}
                              placeholder="Caption text"
                              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Video caption"
                            />
                          </div>
                          <div className="text-right mt-2">
                            <button
                              onClick={() => removeBlock(index)}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                            >
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
                      onClick={(e) => handleBlockClick(index, e)}
                      className={`relative cursor-pointer transition-all duration-300 rounded-xl ${
                        isSelected
                          ? "selected-block border-4 border-blue-500"
                          : "border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      layout
                    >
                      {/* Delete button for selected block */}
                      {isSelected && (
                        <motion.button
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="absolute -top-3 -right-3 z-20 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg delete-button-animated"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBlock(index);
                          }}
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      )}

                      {blockContent}
                    </motion.div>
                  </SortableBlock>
                );
              })}
            </AnimatePresence>
          </div>
        </SortableContext>
      </DndContext>
      <AddBlockSidebar
        addBlock={addBlock}
        selectedBlockIndex={selectedBlockIndex}
        onSelectBlock={setSelectedBlockIndex}
        onDeleteBlock={removeBlock}
        isDisabled={isImageLimitReached || isSizeLimitReached}
      />
    </div>
  );
};

export default PostEditor;
