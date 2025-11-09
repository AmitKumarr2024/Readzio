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
import {
  Sparkles,
  Settings,
  Globe,
  Star,
  Pin,
  Zap,
  Loader2,
} from "lucide-react";
import { debounce } from "lodash";
import { createPortal } from "react-dom";
import DOMPurify from "dompurify";
import FileBlock from "../PostFeature/FileBlock";
import VideoBlock from "../PostFeature/VideoBlock";
import TableBlock from "../PostFeature/TableBlock";
import PostView from "./PostView";
import { getSinglePost, deletePost } from "../../store/postSlice";
import ConfirmPostModal from "./ConfirmPostModal";
import {
  setIsFeatured,
  setIsPinned,
  setIsPublished,
  setLanguage,
} from "../../store/Post/postMetaSlice";
import LoadingBar from "../../Utils/LoadingBar";
import TableBlocksOutput from "../actualPostDisplay/TableBlocksOutput";

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
      if (!language.match(/^[a-z]{2}(-[A-Z]{2})?$/i))
        return toast.error("Invalid language code (e.g., 'en' or 'en-US')");

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

    dispatch(setIsFeatured(isFeatured));
    dispatch(setIsPinned(isPinned));
    dispatch(setIsPublished(isPublished));
    dispatch(setLanguage(language));
  };

  const sanitizeBlocks = useCallback((blocks) => {
    let lastLoggedData = null;
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
        } else {
          const tableDataString = JSON.stringify(tableData);
          if (tableDataString !== lastLoggedData) {
            lastLoggedData = tableDataString;
          }
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
    await new Promise((resolve) => setTimeout(resolve, 100));
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

  const handleDeletePost = (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      dispatch(deletePost(postId))
        .unwrap()
        .then(() => {
          toast.success("Post deleted successfully");
        })
        .catch((err) => {
          console.error("[PostPreviewList] Post deletion failed:", err);
          toast.error(`Failed to delete post: ${err.message || err}`);
        });
    }
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
        console.warn(
          `[PostPreviewList] Invalid block at index ${i}:`,
          JSON.stringify(block, null, 2)
        );
        toast.error("Invalid block detected");
        return (
          <div key={i} className="my-4 text-red-500 italic">
            Invalid block
          </div>
        );
      }

      const blockProps = {
        block,
        index: i,
        zoomLevel,
        copiedIndex,
        handleCopyCode,
        className: "relative my-4",
      };

      const supportedLanguages = [
        "javascript",
        "typescript",
        "python",
        "java",
        "c",
        "cpp",
        "ruby",
        "go",
        "html",
        "css",
        "bash",
      ];
      const language = supportedLanguages.includes(block.language)
        ? block.language
        : "text";
      const codeToShow = block.code || "";
      switch (block.type) {
        case "code":
          return (
            <div
              key={i}
              className="relative my-4 bg-gray-800 dark:bg-gray-900 text-text-main-light dark:text-text-main-dark rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800"
            >
              <SyntaxHighlighter
                language={language}
                style={tomorrow}
                showLineNumbers
                wrapLines
              >
                {codeToShow}
              </SyntaxHighlighter>

              <button
                onClick={() => handleCopyCode(codeToShow, i)}
                className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-600 transition z-10"
              >
                {copiedIndex === i ? "Copied!" : "Copy"}
              </button>
            </div>
          );
        case "file":
          return (
            <div
              key={i}
              className="relative my-6 group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
            >
              <FileBlock {...blockProps} />
            </div>
          );
        case "list":
          if (!block.items || !Array.isArray(block.items)) {
            console.warn("[PostPreviewList] Invalid list items:", block.items);
            return (
              <div key={i} className="my-4 text-red-500 italic">
                Invalid list data: {JSON.stringify(block.items)}
              </div>
            );
          }
          return (
            <div
              key={i}
              className="relative my-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
            >
              {block.ordered ? (
                <ol className="list-decimal list-inside space-y-1">
                  {block.items.map((item, j) => (
                    <li key={j}>{item || "Empty item"}</li>
                  ))}
                </ol>
              ) : (
                <ul className="list-disc list-inside space-y-1">
                  {block.items.map((item, j) => (
                    <li key={j}>{item || "Empty item"}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        case "video":
          return (
            <div
              key={i}
              className="relative my-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
            >
              <VideoBlock
                src={block.src || ""}
                caption={block.caption || ""}
                autoPlay={false}
                muted={false}
                loop={false}
              />
            </div>
          );
        case "image":
          return (
            <div
              key={i}
              className="relative my-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
            >
              {block.src ? (
                <img
                  src={block.src}
                  alt={block.caption || "Image"}
                  className="w-full h-auto max-h-96 object-contain rounded-lg"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-48 flex items-center justify-center italic opacity-80">
                  No image source provided
                </div>
              )}
              {block.caption && (
                <p className="mt-2 text-sm italic">{block.caption}</p>
              )}
            </div>
          );
        case "heading":
          return (
            <div key={i} className="relative my-4">
              <h2
                className={`font-semibold ${
                  block.level === 1
                    ? "text-2xl"
                    : block.level === 3
                    ? "text-lg"
                    : "text-xl"
                }`}
              >
                {block.text || "Empty heading"}
              </h2>
            </div>
          );
        case "hr":
          return (
            <div key={i} className="relative my-4">
              <hr className="border-gray-200 dark:border-gray-800" />
              {block.caption && (
                <p className="mt-2 text-sm italic">{block.caption}</p>
              )}
            </div>
          );
        case "link":
          return (
            <div key={i} className="relative my-4">
              <a
                href={block.href || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {block.text || block.href || "Empty link"}
              </a>
            </div>
          );
        case "poll":
          return (
            <div
              key={i}
              className="relative my-4 p-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-sm border border-gray-200 dark:border-gray-800"
            >
              <h3 className="text-lg font-medium">
                {block.question || "Poll"}
              </h3>
              <ul className="mt-2 space-y-2 list-disc list-inside">
                {(block.options || []).map((opt, j) => (
                  <li key={j}>
                    {typeof opt === "string" ? opt : opt.option || "Option"}
                  </li>
                ))}
              </ul>
            </div>
          );
        case "quote":
          return (
            <div
              key={i}
              className="relative my-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
            >
              <blockquote className="border-l-4 border-blue-500 dark:border-blue-600 pl-4 italic">
                <p>{block.text || "Empty quote"}</p>
                {block.author && (
                  <footer className="mt-2 text-sm">— {block.author}</footer>
                )}
              </blockquote>
            </div>
          );
        case "table":
          return (
            <div
              key={i}
              className="relative my-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
            >
              <TableBlocksOutput
                data={block.data}
                caption={block.caption || ""}
              />
            </div>
          );
        case "text":
          return (
            <div
              key={i}
              className="relative my-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
            >
              <div
                className="rich-content text-base leading-relaxed my-4"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(block.value || "Empty text"),
                }}
              />
            </div>
          );
        default:
          console.warn(
            `[PostPreviewList] Unsupported block type at index ${i}:`,
            block.type
          );
          return (
            <div key={i} className="relative my-4 text-red-500 italic">
              Unsupported block type: {block.type}
            </div>
          );
      }
    },
    [zoomLevel, copiedIndex, currentDraftPost, onUpdateDraft]
  );

  return (
    <>
      {/* Portaled Publishing Loading Overlay */}
      {createPortal(
        <AnimatePresence>
          {showPublishLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl">
                <LoadingBar loading={showPublishLoading} text="Publishing..." />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Portaled Publishing Countdown */}
      {createPortal(
        <AnimatePresence>
          {isPostConfirmed && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 sm:top-36 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                  <div className="flex-1 text-center sm:text-left">
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      Publishing in {countdown}s...
                    </p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleConfirmPublish}
                      className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      Publish Now
                    </button>
                    <button
                      onClick={handleCancelPublish}
                      className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-950/30 dark:to-purple-950/30">
        {/* Main Content Container */}
        <div className="w-full max-w-full mx-auto px-1 sm:px-2 lg:px-3 py-6 sm:py-4 lg:py-6">
          {currentDraftPost && (
            <>
              {/* Header Section */}
              <div className="text-center mb-8 sm:mb-12 space-y-3 sm:space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-1 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-2"
                >
                  <Sparkles size={16} />
                  <span>Draft Preview</span>
                </motion.div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent leading-tight">
                  Review Your Content
                </h2>

                <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
                  Take a final look before publishing to the world ✨
                </p>
              </div>

              {/* Post Title & Category Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 dark:border-gray-700 mb-6 sm:mb-8 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 capitalize text-gray-900 dark:text-white leading-tight">
                      {currentDraftPost.title || "Untitled Draft"}
                    </h1>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full text-purple-700 dark:text-purple-300 text-sm font-medium">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                        {categoryName || "Uncategorized"}
                      </span>

                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        {sanitizedBlocks.length} block
                        {sanitizedBlocks.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Content Blocks Preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl border border-gray-100 dark:border-gray-700 mb-6 sm:mb-8 min-h-[400px]"
              >
                {sanitizedBlocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4 sm:mb-6">
                      <Sparkles
                        className="text-blue-600 dark:text-blue-400"
                        size={32}
                      />
                    </div>
                    <p className="text-lg sm:text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">
                      No content blocks yet
                    </p>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-500">
                      Start adding content to see the preview
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {sanitizedBlocks.map((block, i) => renderBlock(block, i))}
                  </div>
                )}
              </motion.div>

              {/* Post Settings Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-800 dark:to-blue-950/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 dark:border-gray-700 mb-6 sm:mb-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Settings
                      className="text-blue-600 dark:text-blue-400"
                      size={24}
                    />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Post Settings
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Feature Toggle */}
                  <label className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all group">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={() => setIsFeaturedLocal(!isFeatured)}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Star className="text-yellow-500" size={18} />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Feature Post
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Highlight on homepage
                      </p>
                    </div>
                  </label>

                  {/* Pin Toggle */}
                  <label className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all group">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={() => setIsPinnedLocal(!isPinned)}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Pin className="text-red-500" size={18} />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Pin Post
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Keep at top
                      </p>
                    </div>
                  </label>

                  {/* Publish Toggle */}
                  <label className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all group">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={() => setIsPublishedLocal(!isPublished)}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Zap className="text-green-500" size={18} />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Publish Post
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Make it live
                      </p>
                    </div>
                  </label>

                  {/* Language Input */}
                  <div className="p-4 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="text-blue-500" size={18} />
                      <label className="font-semibold text-gray-900 dark:text-white text-sm">
                        Language
                      </label>
                    </div>
                    <input
                      type="text"
                      value={language}
                      onChange={(e) => setLanguageLocal(e.target.value)}
                      placeholder="e.g., en or en-US"
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Use ISO language code
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Publish Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={createPost}
                disabled={isSubmitting || createLoading}
                className={`w-full flex items-center justify-center gap-3 text-lg sm:text-xl font-bold py-5 sm:py-6 rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
                  isSubmitting || createLoading
                    ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white shadow-blue-500/50 dark:shadow-blue-900/50"
                }`}
              >
                {isSubmitting || createLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    <span className="hidden sm:inline">
                      Creating Amazing Content...
                    </span>
                    <span className="sm:hidden">Creating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={24} />
                    <span>Create Post</span>
                    <Sparkles size={24} />
                  </>
                )}
              </motion.button>

              {createError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 sm:mt-4 text-red-500 dark:text-red-400 text-sm sm:text-base text-center font-medium bg-red-50 dark:bg-red-900/20 py-3 rounded-lg"
                >
                  {createError}
                </motion.p>
              )}
            </>
          )}

          {/* All Posts Grid */}
          {allPosts.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-12 sm:mt-16"
            >
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8 text-center">
                Your Posts
              </h3>

              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {allPosts.map((post) => {
                  const firstBlock = post.blocks.find((b) =>
                    ["image", "text", "file", "heading"].includes(b.type)
                  );
                  return (
                    <motion.div
                      key={post._id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ y: -5 }}
                      className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer"
                      onClick={() => dispatch(getSinglePost(post.slug))}
                    >
                      {/* Preview Content */}
                      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                        {firstBlock?.type === "image" ? (
                          <img
                            src={firstBlock.src}
                            alt={firstBlock.caption || "Post Image"}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                            loading="lazy"
                          />
                        ) : firstBlock?.type === "text" ? (
                          <div
                            className="p-4 sm:p-6 line-clamp-4 text-sm text-gray-700 dark:text-gray-300"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(firstBlock.value),
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500 dark:text-gray-400 italic text-sm">
                              No preview available
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 sm:p-6">
                        <div className="text-white">
                          <p className="font-semibold text-base sm:text-lg line-clamp-2">
                            {post.title}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* Confirm Modal */}
        <AnimatePresence>
          {showConfirmModal && (
            <ConfirmPostModal
              onConfirm={handleModalConfirm}
              onCancel={handleCancelPublish}
            />
          )}
        </AnimatePresence>

        {/* Single Post Modal */}
        <AnimatePresence>
          {isModalOpen && singlePost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              >
                <PostView post={singlePost} />
                <button
                  onClick={closeModal}
                  className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg"
                >
                  Close Preview
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default PostPreviewList;
