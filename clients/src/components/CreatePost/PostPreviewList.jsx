import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { PacmanLoader } from "react-spinners";
import { debounce } from "lodash";
import DOMPurify from "dompurify";
import {
  Eye,
  Trash2,
  Copy,
  Check,
  Settings,
  Globe,
  Pin,
  Star,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";

// Modern Loading Component
const ModernLoadingBar = ({ loading, text = "Loading..." }) => {
  if (!loading) return null;

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className="relative">
        {/* Outer ring */}
        <div className="w-20 h-20 rounded-full border-4 border-blue-200/30 dark:border-blue-800/30"></div>
        {/* Spinning ring */}
        <div className="absolute top-0 left-0 w-20 h-20 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
        {/* Inner pulsing circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-gray-900 dark:text-white">
          {text}
        </p>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      </div>
    </div>
  );
};

const PostPreviewList = ({
  currentDraftPost,
  onUpdateDraft,
  postType,
  category,
  categoryName,
  allPosts,
  createLoading,
  createError,
  onCreatePost,
  isSubmitting,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isPostConfirmed, setIsPostConfirmed] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [postData, setPostData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFeatured, setIsFeaturedLocal] = useState(true);
  const [isPinned, setIsPinnedLocal] = useState(true);
  const [isPublished, setIsPublishedLocal] = useState(true);
  const [language, setLanguageLocal] = useState("en");
  const [showPublishLoading, setShowPublishLoading] = useState(false);

  const modalRef = useRef();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { singlePost, singlePostStatus } = useSelector((state) => state.post);

  useEffect(() => {
    if (singlePost) setIsModalOpen(true);
  }, [singlePost]);

  useEffect(() => {
    if (modalRef.current && isModalOpen) {
      requestAnimationFrame(() => {
        modalRef.current.scrollTop = modalRef.current.scrollHeight;
      });
    }
    setZoomLevel(1);
  }, [isModalOpen]);

  useEffect(() => {
    let timer;
    if (isPostConfirmed && countdown > 0 && !createLoading) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    } else if (isPostConfirmed && countdown === 0 && !createLoading) {
      handleConfirmPublish();
    }
    return () => clearTimeout(timer);
  }, [isPostConfirmed, countdown, createLoading]);

  const closeModal = () => {
    setIsModalOpen(false);
    setZoomLevel(1);
    dispatch({ type: "post/clearSinglePost" });
  };

  const handleCopyCode = (code, i) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("Code copied!");
  };

  const createPost = useCallback(
    debounce(() => {
      if (isSubmitting || createLoading) {
        console.log("[PostPreviewList] Submission already in progress");
        return;
      }
      if (
        currentDraftPost.blocks.some(
          (b) => b.type === "table" && (!b.data || !b.data.length)
        )
      ) {
        toast.error("Please fill in all table blocks before publishing.");
        return;
      }
      if (!currentDraftPost?.title) return toast.error("Please enter a title");
      if (!currentDraftPost?.blocks?.length)
        return toast.error("Please add content blocks");
      if (!postType) return toast.error("Please select a post type");
      if (!category) return toast.error("Please select a category");
      if (!language.match(/^[a-z]{2}$/i))
        return toast.error("Invalid language code (e.g., 'en')");

      if (!isFeatured && !isPinned && !isPublished && language === "en") {
        toast.error(
          "Set at least one metadata field (feature, pin, publish, or language)"
        );
        return;
      }

      setShowConfirmModal(true);
    }, 1000),
    [
      isSubmitting,
      createLoading,
      currentDraftPost,
      postType,
      category,
      language,
      isFeatured,
      isPinned,
      isPublished,
    ]
  );

  const handleModalConfirm = async ({ tags, thumbnail }) => {
    const newPostData = {
      tags,
      thumbnail,
      isFeatured,
      isPinned,
      isPublished,
      language,
    };
    setShowConfirmModal(false);
    setPostData(newPostData);
    setIsPostConfirmed(true);
    setCountdown(5);
  };

  const sanitizeBlocks = useCallback((blocks) => {
    return blocks.map((block) => {
      if (block.type === "table") {
        let tableData = block.data;
        if (!tableData && (block.headers || block.rows)) {
          const headers =
            Array.isArray(block.headers) && block.headers.length
              ? block.headers
              : ["Header 1", "Header 2"];
          const rows =
            Array.isArray(block.rows) &&
            block.rows.some((row) => Array.isArray(row) && row.length)
              ? block.rows
              : [
                  ["Cell 1", "Cell 2"],
                  ["Cell 3", "Cell 4"],
                ];
          tableData = [headers, ...rows];
        }
        const isValidTableData =
          Array.isArray(tableData) &&
          tableData.length > 0 &&
          tableData.some(
            (row) =>
              Array.isArray(row) &&
              row.some((cell) => cell != null && cell !== "")
          );
        if (!isValidTableData) {
          tableData = [
            ["Header 1", "Header 2"],
            ["Cell 1", "Cell 2"],
            ["Cell 3", "Cell 4"],
          ];
          toast.error("Table block is empty. Using default data.");
        }
        return {
          ...block,
          data: tableData,
          caption: block.caption || "",
        };
      }
      return block;
    });
  }, []);

  const sanitizedBlocks = useMemo(
    () => sanitizeBlocks(currentDraftPost?.blocks || []),
    [currentDraftPost?.blocks, sanitizeBlocks]
  );

  const handleConfirmPublish = async () => {
    const cleanedDraft = {
      ...currentDraftPost,
      blocks: sanitizedBlocks,
    };
    setIsPostConfirmed(false);
    setShowPublishLoading(true);
    try {
      await onCreatePost({ ...postData, draft: cleanedDraft });
    } catch (err) {
      console.error("[PostPreviewList] Post creation failed:", err);
      if (
        err?.message?.includes("A post with this title was recently created")
      ) {
        toast.error(
          "Please wait before creating another post with the same title."
        );
      } else {
        toast.error(err?.message || "Failed to create post");
      }
    } finally {
      setShowPublishLoading(false);
      setPostData(null);
      setCountdown(5);
    }
  };

  const handleCancelPublish = () => {
    setShowConfirmModal(false);
    setIsPostConfirmed(false);
    setPostData(null);
    setCountdown(5);
    toast("Post publishing cancelled.");
  };

  const deleteBlock = (index) => {
    if (!onUpdateDraft) {
      console.error("[PostPreviewList] No update function provided");
      toast.error("No update function provided");
      return;
    }
    const updatedBlocks = currentDraftPost.blocks.filter((_, i) => i !== index);
    onUpdateDraft({ ...currentDraftPost, blocks: updatedBlocks });
    toast.success("Block deleted");
  };

  const renderBlock = useCallback(
    (block, i) => {
      if (!block || !block.type) {
        return (
          <div
            key={i}
            className="my-6 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl"
          >
            <p className="text-red-600 dark:text-red-400 font-medium">
              Invalid block detected
            </p>
          </div>
        );
      }

      const deleteButton = (
        <button
          onClick={() => deleteBlock(i)}
          className="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 opacity-80 hover:opacity-100"
          aria-label={`Delete ${block.type} block`}
        >
          <Trash2 size={14} />
        </button>
      );

      switch (block.type) {
        case "code":
          return (
            <div
              key={i}
              className="relative my-6 bg-gray-900 dark:bg-black rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-800 group"
            >
              <div className="absolute top-4 right-4 flex gap-2 z-10">
                <button
                  onClick={() =>
                    handleCopyCode(block.code || block.value || "", i)
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  {copiedIndex === i ? <Check size={16} /> : <Copy size={16} />}
                  {copiedIndex === i ? "Copied!" : "Copy"}
                </button>
                {deleteButton}
              </div>
              <SyntaxHighlighter
                language={block.language || "javascript"}
                style={tomorrow}
                showLineNumbers
                wrapLines
                customStyle={{
                  margin: 0,
                  padding: "1.5rem",
                  paddingTop: "4rem",
                  background: "transparent",
                }}
              >
                {block.code || block.value || ""}
              </SyntaxHighlighter>
            </div>
          );

        case "text":
          return (
            <div key={i} className="relative my-6 group">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
                <div
                  className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(block.value || "Empty text"),
                  }}
                />
                {deleteButton}
              </div>
            </div>
          );

        case "image":
          return (
            <div key={i} className="relative my-6 group">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
                {block.src ? (
                  <div className="relative overflow-hidden rounded-xl">
                    <img
                      src={block.src}
                      alt={block.caption || "Image"}
                      className="w-full h-auto max-h-96 object-contain rounded-xl transform hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      No image source provided
                    </p>
                  </div>
                )}
                {block.caption && (
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 italic text-center">
                    {block.caption}
                  </p>
                )}
                {deleteButton}
              </div>
            </div>
          );

        case "heading":
          return (
            <div key={i} className="relative my-6 group">
              <h2
                className={`font-bold text-gray-900 dark:text-white ${
                  block.level === 1
                    ? "text-4xl"
                    : block.level === 3
                    ? "text-xl"
                    : "text-2xl"
                } hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200`}
              >
                {block.text || "Empty heading"}
              </h2>
              {deleteButton}
            </div>
          );

        case "list":
          if (!block.items || !Array.isArray(block.items)) {
            return (
              <div
                key={i}
                className="my-6 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl"
              >
                <p className="text-red-600 dark:text-red-400">
                  Invalid list data
                </p>
                {deleteButton}
              </div>
            );
          }
          return (
            <div key={i} className="relative my-6 group">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
                {block.ordered ? (
                  <ol className="list-decimal list-inside space-y-2 text-gray-800 dark:text-gray-200">
                    {block.items.map((item, j) => (
                      <li key={j} className="leading-relaxed">
                        {item || "Empty item"}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ul className="list-disc list-inside space-y-2 text-gray-800 dark:text-gray-200">
                    {block.items.map((item, j) => (
                      <li key={j} className="leading-relaxed">
                        {item || "Empty item"}
                      </li>
                    ))}
                  </ul>
                )}
                {deleteButton}
              </div>
            </div>
          );

        case "quote":
          return (
            <div key={i} className="relative my-6 group">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-all duration-300">
                <blockquote className="text-gray-800 dark:text-gray-200">
                  <p className="text-lg italic leading-relaxed font-medium">
                    "{block.text || "Empty quote"}"
                  </p>
                  {block.author && (
                    <footer className="mt-4 text-sm text-gray-600 dark:text-gray-400 font-semibold">
                      — {block.author}
                    </footer>
                  )}
                </blockquote>
                {deleteButton}
              </div>
            </div>
          );

        default:
          return (
            <div key={i} className="relative my-6 group">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                  Unsupported block type: {block.type}
                </p>
                {deleteButton}
              </div>
            </div>
          );
      }
    },
    [zoomLevel, copiedIndex, currentDraftPost, onUpdateDraft]
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Modern Loading Overlay */}
      <AnimatePresence>
        {showPublishLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700">
              <ModernLoadingBar
                loading={showPublishLoading}
                text="Publishing your amazing post..."
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {currentDraftPost && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Sparkles className="text-blue-500" size={32} />
              <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Draft Preview
              </h2>
              <Sparkles className="text-purple-500" size={32} />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Review your content before publishing to the world
            </p>
          </div>

          {/* Post Header */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
              {currentDraftPost.title || "Untitled Draft"}
            </h1>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Globe size={18} />
              <span className="font-medium">
                Category: {categoryName || "Uncategorized"}
              </span>
            </div>
          </div>

          {/* Content Blocks */}
          <div className="bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 min-h-96">
            {sanitizedBlocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Settings
                    className="text-gray-400 dark:text-gray-500"
                    size={40}
                  />
                </div>
                <p className="text-xl font-medium text-gray-500 dark:text-gray-400">
                  No content blocks added yet
                </p>
                <p className="text-gray-400 dark:text-gray-500">
                  Start creating your amazing content!
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {sanitizedBlocks.map((block, i) => renderBlock(block, i))}
              </div>
            )}
          </div>

          {/* Post Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <Settings className="text-blue-500" size={24} />
              Post Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={() => setIsFeaturedLocal(!isFeatured)}
                    className="sr-only"
                  />
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      isFeatured
                        ? "bg-blue-500"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                        isFeatured ? "translate-x-6" : "translate-x-0.5"
                      } mt-0.5`}
                    ></div>
                  </div>
                </div>
                <Star
                  className={`${
                    isFeatured ? "text-blue-500" : "text-gray-400"
                  }`}
                  size={20}
                />
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  Feature Post
                </span>
              </label>

              <label className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={() => setIsPinnedLocal(!isPinned)}
                    className="sr-only"
                  />
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      isPinned ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                        isPinned ? "translate-x-6" : "translate-x-0.5"
                      } mt-0.5`}
                    ></div>
                  </div>
                </div>
                <Pin
                  className={`${isPinned ? "text-green-500" : "text-gray-400"}`}
                  size={20}
                />
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  Pin Post
                </span>
              </label>

              <label className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={() => setIsPublishedLocal(!isPublished)}
                    className="sr-only"
                  />
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      isPublished
                        ? "bg-purple-500"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                        isPublished ? "translate-x-6" : "translate-x-0.5"
                      } mt-0.5`}
                    ></div>
                  </div>
                </div>
                <Zap
                  className={`${
                    isPublished ? "text-purple-500" : "text-gray-400"
                  }`}
                  size={20}
                />
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  Publish Post
                </span>
              </label>

              <div className="space-y-2">
                <label className="flex items-center gap-3 font-medium text-gray-800 dark:text-gray-200">
                  <Globe className="text-blue-500" size={20} />
                  Language
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguageLocal(e.target.value)}
                  placeholder="e.g., en"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Publish Button */}
          <button
            onClick={createPost}
            disabled={isSubmitting || createLoading}
            className={`w-full flex items-center justify-center text-xl font-bold py-6 rounded-3xl shadow-xl transition-all duration-300 transform hover:scale-[1.02] ${
              isSubmitting || createLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white shadow-2xl"
            }`}
          >
            {isSubmitting || createLoading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin" size={24} />
                Creating Amazing Content...
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Sparkles size={24} />
                Create Post
                <Sparkles size={24} />
              </div>
            )}
          </button>

          {createError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4"
            >
              <p className="text-red-600 dark:text-red-400 text-center font-medium">
                {createError}
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
      <AnimatePresence>
        {isPostConfirmed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-xl shadow-lg p-4 flex items-center gap-4 z-50 border border-gray-200 dark:border-gray-800"
          >
            <p>Publishing in {countdown}s...</p>
            <button
              onClick={handleConfirmPublish}
              className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 text-sm"
            >
              Publish Now
            </button>
            <button
              onClick={handleCancelPublish}
              className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 text-sm"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isModalOpen && singlePost && (
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={closeModal}
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-lg border border-gray-200 dark:border-gray-800"
            >
              <PostView post={singlePost} />
              <button
                onClick={closeModal}
                className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition text-sm"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PostPreviewList;
