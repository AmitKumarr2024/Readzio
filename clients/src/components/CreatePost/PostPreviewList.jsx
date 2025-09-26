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
      // console.log("Countdown running:", countdown);
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    } else if (isPostConfirmed && countdown === 0 && !createLoading) {
      // console.log("Countdown reached 0, calling handleConfirmPublish");
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
      // console.log(
      //   "createPost called, isSubmitting:",
      //   isSubmitting,
      //   "createLoading:",
      //   createLoading
      // );
      if (isSubmitting || createLoading) {
        // console.log("[PostPreviewList] Submission already in progress");
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
    // console.log("handleModalConfirm called, triggering handleConfirmPublish");
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
    // Wait for state to update and ensure re-render
    await new Promise((resolve) => setTimeout(resolve, 100)); // Increase delay slightly
    // console.log(
    //   "LoadingBar triggered, showPublishLoading:",
    //   showPublishLoading
    // );
    try {
      // console.log("[CreatePost] Sending postData:", {
      //   ...postData,
      //   draft: cleanedDraft,
      // });
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

      switch (block.type) {
        case "code":
          console.log("Preview block:", block); // Add this debug
          return (
            <div
              key={i}
              className="relative my-4 bg-gray-800 dark:bg-gray-900 text-text-main-light dark:text-text-main-dark rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800"
            >
              <SyntaxHighlighter
                language={block?.language}
                style={tomorrow}
                showLineNumbers
                wrapLines
              >
                {block.code || block.value || ""}
              </SyntaxHighlighter>
              <button
                onClick={() =>
                  handleCopyCode(block.code || block.value || "", i)
                }
                className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-600 transition z-10"
              >
                {copiedIndex === i ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => deleteBlock(i)}
                className="absolute top-2 right-16 bg-red-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-red-600 transition z-10"
                aria-label="Delete code block"
              >
                🗑
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
              <button
                onClick={() => deleteBlock(i)}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-red-600 transition z-10"
                aria-label="Delete file block"
              >
                🗑
              </button>
            </div>
          );
        case "list":
          if (!block.items || !Array.isArray(block.items)) {
            console.warn("[PostPreviewList] Invalid list items:", block.items);
            return (
              <div key={i} className="my-4 text-red-500 italic">
                Invalid list data: {JSON.stringify(block.items)}
                <button
                  onClick={() => deleteBlock(i)}
                  className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-red-600 transition z-10"
                  aria-label="Delete list block"
                >
                  🗑
                </button>
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
              <button
                onClick={() => deleteBlock(i)}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-red-600 transition z-10"
                aria-label="Delete list block"
              >
                🗑
              </button>
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
              <button
                onClick={() => deleteBlock(i)}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-red-600 transition z-10"
                aria-label="Delete video block"
              >
                🗑
              </button>
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
              <button
                onClick={() => deleteBlock(i)}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-red-600 transition z-10"
                aria-label="Delete image block"
              >
                🗑
              </button>
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
              <button
                onClick={() => deleteBlock(i)}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-red-600 transition z-10"
                aria-label="Delete heading block"
              >
                🗑
              </button>
            </div>
          );
        case "hr":
          return (
            <div key={i} className="relative my-4">
              <hr className="border-gray-200 dark:border-gray-800" />
              {block.caption && (
                <p className="mt-2 text-sm italic">{block.caption}</p>
              )}
              <button
                onClick={() => deleteBlock(i)}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-red-600 transition z-10"
                aria-label="Delete HR block"
              >
                🗑
              </button>
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
              <button
                onClick={() => deleteBlock(i)}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-red-600 transition z-10"
                aria-label="Delete link block"
              >
                🗑
              </button>
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
              <button
                onClick={() => deleteBlock(i)}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-red-600 transition z-10"
                aria-label="Delete poll block"
              >
                🗑
              </button>
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
              <button
                onClick={() => deleteBlock(i)}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-red-600 transition z-10"
                aria-label="Delete quote block"
              >
                🗑
              </button>
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
              <button
                onClick={() => deleteBlock(i)}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-red-600 transition z-10"
                aria-label="Delete table block"
              >
                🗑
              </button>
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
              <button
                onClick={() => deleteBlock(i)}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-red-600 transition z-10"
                aria-label="Delete text block"
              >
                🗑
              </button>
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
              <button
                onClick={() => deleteBlock(i)}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-red-600 transition z-10"
                aria-label="Delete unsupported block"
              >
                🗑
              </button>
            </div>
          );
      }
    },
    [zoomLevel, copiedIndex, currentDraftPost, onUpdateDraft]
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <AnimatePresence>
        {showPublishLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
          >
            <LoadingBar loading={showPublishLoading} text="Publishing..." />
          </motion.div>
        )}
      </AnimatePresence>
      {currentDraftPost && (
        <>
          <div className="text-center space-y-4 mb-8">
            <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Draft Preview
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Review your content before publishing to the world
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold mb-4 capitalize">
              {currentDraftPost.title || "Untitled Draft"}
            </h1>
            <p className="mb-4 opacity-80">
              Category: {categoryName || "Uncategorized"}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 min-h-96 mb-8">
            {sanitizedBlocks.length === 0 ? (
              <p className="italic text-center opacity-80">
                No content blocks added yet.
              </p>
            ) : (
              sanitizedBlocks.map((block, i) => renderBlock(block, i))
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 mb-8">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={() => setIsFeaturedLocal(!isFeatured)}
                className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              Feature Post
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={() => setIsPinnedLocal(!isPinned)}
                className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              Pin Post
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={() => setIsPublishedLocal(!isPublished)}
                className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              Publish Post
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium">Language</span>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguageLocal(e.target.value)}
                placeholder="e.g., en"
                className="px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </label>
          </div>

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
            <p className="mt-2 text-red-500 text-sm text-center">
              {createError}
            </p>
          )}
        </>
      )}
      {allPosts.length === 0 ? (
        <p className="text-center mt-8 opacity-80">No posts available yet.</p>
      ) : (
        <div className="grid gap-6 mt-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {allPosts.map((post) => {
            const firstBlock = post.blocks.find((b) =>
              ["image", "text", "file", "heading"].includes(b.type)
            );
            return (
              <motion.div
                key={post._id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-xl shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div
                  onClick={() => dispatch(getSinglePost(post.slug))}
                  className="cursor-pointer"
                >
                  {firstBlock?.type === "image" ? (
                    <img
                      src={firstBlock.src}
                      alt={firstBlock.caption || "Post Image"}
                      className="w-full h-40 object-cover rounded-t-xl hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        console.error(
                          "[PostPreviewList] Image load error for post:",
                          post._id
                        );
                        e.target.style.display = "none";
                      }}
                      loading="lazy"
                    />
                  ) : firstBlock?.type === "text" ? (
                    <div
                      className="p-4 line-clamp-3 text-sm list-inside"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(firstBlock.value),
                      }}
                    />
                  ) : (
                    <div className="p-4 italic text-sm">
                      No preview available
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      <AnimatePresence>
        {showConfirmModal && (
          <ConfirmPostModal
            onConfirm={handleModalConfirm}
            onCancel={handleCancelPublish}
          />
        )}
      </AnimatePresence>
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
