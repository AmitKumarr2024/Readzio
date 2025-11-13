import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import TextBlock from "../actualPostDisplay/TextBlock";
import CodeBlockOutput from "../actualPostDisplay/CodeBlockOutput";
import ImageBlockOutput from "../actualPostDisplay/ImageBlockOutput";
import FileDownloadOutput from "../actualPostDisplay/FileDownloadOutput";
import HrOutput from "../actualPostDisplay/HrOutput";
import HeadingOutput from "../actualPostDisplay/HeadingOutput";
import LinkBlockOutput from "../actualPostDisplay/LinkBlockOutput";
import ListBlockOutput from "../actualPostDisplay/ListBlockOutput";
import PollBlockOutput from "../actualPostDisplay/PollBlockOutput";
import QuoteBlockOutput from "../actualPostDisplay/QuoteBlockOutput";
import TableBlocksOutput from "../actualPostDisplay/TableBlocksOutput";
import VideoBlockOutput from "../actualPostDisplay/VideoBlockOutput";
import { getSubscriptionStatusByAuthor } from "../../store/subscriptionSlice";
import PostTags from "../Post/DisplayPost/PostTags";
import Skeleton from "@/components/Ui/Skeleton";
import InArticleAd from "../../Ads/InArticleAd";

const BlockRenderer = ({
  blocks,
  postId,
  slug,
  loginUser,
  getUserById,
  isPostRestricted,
  canViewPost,
  authorId,
  isPublished,
  tags,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { subscriptions = [], loading: subscriptionLoading } = useSelector(
    (state) => state.subscription
  );
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [showFullContent, setShowFullContent] = useState(
    !isPostRestricted || canViewPost
  );

  const getValidLanguage = (lang, code) => {
    const supportedLanguages = [
      "javascript",
      "python",
      "java",
      "c",
      "cpp",
      "go",
      "typescript",
      "bash",
      "html",
      "css",
      "json",
      "markdown",
    ];

    if (!lang || lang === "plaintext") {
      if (code?.trim().startsWith("<")) return "html";
      return "code";
    }

    return supportedLanguages.includes(lang) ? lang : "code";
  };

  useEffect(() => {
    if (!isAuthenticated || !authorId || !user?._id || authorId === user?._id) {
      setSubscriptionStatus(null);
      return;
    }
    dispatch(getSubscriptionStatusByAuthor({ userId: user._id, authorId }))
      .unwrap()
      .then((status) => setSubscriptionStatus(status))
      .catch((err) => {
        console.error("Failed to fetch subscription status:", err);
        setSubscriptionStatus(null);
      });
  }, [dispatch, isAuthenticated, user?._id, authorId]);

  const getAdBlocks = (blocks) => {
    if (!Array.isArray(blocks)) return blocks;

    const adBlocks = [...blocks];
    const validTypes = [
      "text",
      "image",
      "video",
      "code",
      "list",
      "quote",
      "poll",
      "link",
      "table",
    ];

    const validIndices = [];
    for (let i = 0; i < blocks.length; i++) {
      if (validTypes.includes(blocks[i]?.type)) {
        validIndices.push(i);
      }
    }

    const adInsertions = [];
    const interval = 3;
    let current = validIndices.length > 0 ? 0 : -1;

    while (current >= 0 && current < validIndices.length) {
      const adAfterIndex = validIndices[current];
      adInsertions.push(adAfterIndex);
      current += interval;
    }

    adInsertions.reverse().forEach((insertAt, index) => {
      adBlocks.splice(insertAt + 1, 0, {
        type: "ad",
        adIndex: index,
        adContent: "Sponsored",
      });
    });

    return adBlocks;
  };

  const renderBlock = (block, i) => {
    if (!block || !block.type) {
      console.warn(`[DEBUG] Invalid block at index ${i}:`, block);
      return (
        <div
          key={i}
          className="p-6 text-center rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800"
        >
          <p className="text-red-600 dark:text-red-400 font-medium">
            ⚠️ Invalid content block
          </p>
        </div>
      );
    }

    if (block.type === "table") {
      const headers = Array.isArray(block.headers) ? block.headers : [];
      const rows = Array.isArray(block.rows)
        ? block.rows.filter((row) => Array.isArray(row) && row.length > 0)
        : [];
      const data =
        block.data ||
        (headers.length || rows.length
          ? [headers, ...rows]
          : [
              ["Header 1", "Header 2"],
              ["Cell 1", "Cell 2"],
            ]);
      block = {
        ...block,
        data,
        caption: block.caption || "",
        headers: undefined,
        rows: undefined,
      };
    }

    switch (block.type) {
      case "text":
        return (
          <TextBlock
            key={i}
            value={block.value || "Empty text"}
            className="my-8"
          />
        );
      case "image":
        return (
          <ImageBlockOutput
            key={i}
            src={block.src}
            caption={block.caption}
            className="my-8 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl"
          />
        );
      case "code":
        return (
          <CodeBlockOutput
            key={i}
            code={block.code}
            language={getValidLanguage(block.language, block.code)}
            caption={block.caption}
          />
        );

      case "video":
        return (
          <VideoBlockOutput
            key={i}
            src={block.src}
            caption={block.caption}
            className="my-8 rounded-2xl shadow-xl overflow-hidden"
          />
        );
      case "quote":
        return (
          <QuoteBlockOutput
            key={i}
            text={block.text}
            author={block.author}
            className="my-8 border-l-4 border-blue-500 dark:border-blue-400 pl-6 sm:pl-8 py-4 bg-blue-50 dark:bg-blue-900/20 rounded-r-xl italic"
          />
        );
      case "list":
        return (
          <ListBlockOutput
            key={i}
            items={block.items || []}
            ordered={block.ordered}
            className="my-8"
          />
        );
      case "heading":
        return (
          <HeadingOutput
            key={i}
            level={block.level || 2}
            text={block.text || "Empty heading"}
            className={`
              ${block.level === 1 ? "text-4xl sm:text-5xl lg:text-6xl" : ""}
              ${block.level === 2 ? "text-3xl sm:text-4xl lg:text-5xl" : ""}
              ${block.level === 3 ? "text-2xl sm:text-3xl lg:text-4xl" : ""}
              ${block.level === 4 ? "text-xl sm:text-2xl lg:text-3xl" : ""}
              ${block.level === 5 ? "text-lg sm:text-xl lg:text-2xl" : ""}
              ${block.level === 6 ? "text-base sm:text-lg lg:text-xl" : ""}
              font-bold text-gray-900 dark:text-gray-100 my-8 leading-tight
            `}
          />
        );
      case "table":
        return (
          <TableBlocksOutput
            key={i}
            data={block.data}
            caption={block.caption}
            className="my-8 overflow-x-auto rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
          />
        );
      case "link":
        return (
          <LinkBlockOutput
            key={i}
            href={block.href}
            text={block.text}
            caption={block.caption}
            className="my-8 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline decoration-2 transition-colors duration-200"
          />
        );
      case "hr":
        return (
          <HrOutput
            key={i}
            caption={block.caption}
            className="my-8 border-2 border-gray-200 dark:border-gray-700 rounded-full"
          />
        );
      case "file":
        return (
          <FileDownloadOutput
            key={i}
            url={block.url}
            name={block.name}
            className="my-8"
          />
        );
      case "poll":
        return (
          <PollBlockOutput
            key={i}
            slug={slug}
            blockId={block.id}
            question={block.question}
            options={block.options || []}
            caption={block.caption}
            className="my-8 p-6 sm:p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700"
          />
        );
      case "ad":
        return (
          <div key={i} className="my-8 w-full">
            <InArticleAd postId={postId} adIndex={block.adIndex} />
          </div>
        );
      default:
        console.warn(
          `[DEBUG] Unsupported block type at index ${i}:`,
          block.type
        );
        return (
          <div
            key={i}
            className="p-6 text-center rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800"
          >
            <p className="text-yellow-700 dark:text-yellow-400 font-medium">
              ⚠️ Unsupported content: {block.type}
            </p>
          </div>
        );
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <Skeleton className="w-full h-40 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-8 w-3/4 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-6 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-6 w-4/5 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
        <Skeleton className="w-full h-32 rounded-2xl bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (!Array.isArray(blocks)) {
    console.warn("BlockRenderer: 'blocks' prop is not an array", blocks);
    return null;
  }

  const isAuthor = user?._id === authorId;
  const previewBlockLimit = 3;
  const blocksWithAds =
    isPostRestricted && !canViewPost && isAuthenticated
      ? blocks
      : getAdBlocks(blocks);
  const previewBlocks = blocks
    .slice(0, previewBlockLimit)
    .filter((block) =>
      ["text", "image", "heading", "table"].includes(block.type)
    );
  const displayedBlocks = showFullContent ? blocksWithAds : previewBlocks;

  const handleSeeMore = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/post/${slug}`);
      return;
    }
    if (isAuthor) {
      setShowFullContent(true);
      return;
    }
    navigate(`/plans/${authorId}`);
  };

  return (
    <div className="relative flex flex-col space-y-0">
      {/* Content Blocks */}
      {displayedBlocks.map((block, i) => (
        <div key={i} className="w-full">
          {renderBlock(block, i)}
        </div>
      ))}

      {/* Premium Content Paywall */}
      {isPostRestricted && !showFullContent && (
        <div className="my-10 p-8 sm:p-10 lg:p-12 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 rounded-3xl text-center shadow-2xl transform transition-all duration-300 hover:shadow-3xl hover:scale-[1.02] relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full -ml-20 -mb-20 blur-3xl"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
              Premium Content Ahead
            </h3>

            <p className="text-white/90 text-base sm:text-lg lg:text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
              Unlock the full story and get exclusive access to premium content,
              in-depth analysis, and more.
            </p>

            <button
              onClick={handleSeeMore}
              disabled={subscriptionLoading}
              className={`
                group relative inline-flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 
                rounded-full bg-white text-blue-600 
                font-bold text-base sm:text-lg
                shadow-xl hover:shadow-2xl
                transform transition-all duration-300
                hover:scale-105 hover:bg-blue-50
                ${subscriptionLoading ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {subscriptionLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  {isAuthenticated && subscriptionStatus?.isSubscribed ? (
                    <>
                      <span>View Full Story</span>
                      <svg
                        className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </>
                  ) : isAuthenticated ? (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                      </svg>
                      <span>Subscribe Now</span>
                      <svg
                        className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Log in to Continue</span>
                      <svg
                        className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Post Tags */}
      {showFullContent && tags?.length > 0 && (
        <div className="mt-12">
          <PostTags tags={tags} />
        </div>
      )}
    </div>
  );
};

export default BlockRenderer;
