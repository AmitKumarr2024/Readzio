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
      className={`min-w-[350px] ${sizeToWidthClass(
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
