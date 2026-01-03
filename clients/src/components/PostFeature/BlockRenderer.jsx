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
import HorizontalBannerAd from "../../Ads/HorizontalBannerAd";
import AdGuard from "../../Ads/adsGaurd/AdGuard";

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
  const [isContentExpanded, setIsContentExpanded] = useState(false); // Single state for mobile expansion
  const [isMobile, setIsMobile] = useState(false);

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

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px = md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleExpandFullContent = () => {
    setIsContentExpanded(true);
  };

  const getAdBlocks = (blocks) => {
    if (!Array.isArray(blocks) || blocks.length === 0) return blocks;

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

    // Find indices of valid content blocks
    const validIndices = [];
    for (let i = 0; i < blocks.length; i++) {
      if (validTypes.includes(blocks[i]?.type)) {
        validIndices.push(i);
      }
    }

    // No valid blocks to insert ads after
    if (validIndices.length === 0) return adBlocks;

    // Insert ads after every 3rd valid content block, alternating between InArticleAd and HorizontalBannerAd
    // Pattern: block 3 → InArticleAd, block 6 → HorizontalBannerAd, block 9 → InArticleAd...
    const adInsertions = [];
    const interval = 3; // Insert every 3 blocks

    // Start from block 3, then every 3 blocks
    for (let i = interval - 1; i < validIndices.length; i += interval) {
      adInsertions.push(validIndices[i]);
    }

    // Insert ads in reverse order to maintain correct indices
    // Alternate between 'inArticle' and 'horizontal' ad types
    let adIndex = 0;
    adInsertions.reverse().forEach((insertAt, reverseIndex) => {
      // Calculate original index to determine ad type
      const originalIndex = adInsertions.length - 1 - reverseIndex;
      const isInArticleAd = originalIndex % 2 === 0; // Even positions: InArticleAd, Odd: HorizontalBannerAd

      adBlocks.splice(insertAt + 1, 0, {
        type: "ad",
        adType: isInArticleAd ? "inArticle" : "horizontal",
        adIndex: adIndex++,
        id: `ad-${isInArticleAd ? "in" : "horiz"}-${insertAt}-${Date.now()}`,
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
          className="p-4 sm:p-6 text-center rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800"
        >
          <p className="text-sm sm:text-base text-red-600 dark:text-red-400 font-medium">
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
            className="my-6 sm:my-8"
          />
        );
      case "image":
        return (
          <ImageBlockOutput
            key={i}
            src={block.src}
            caption={block.caption}
            className="my-6 sm:my-8 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl"
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
            className="my-6 sm:my-8 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl overflow-hidden"
          />
        );
      case "quote":
        return (
          <QuoteBlockOutput
            key={i}
            text={block.text}
            author={block.author}
            className="my-6 sm:my-8 border-l-4 border-blue-500 dark:border-blue-400 pl-4 sm:pl-6 md:pl-8 py-3 sm:py-4 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg sm:rounded-r-xl italic"
          />
        );
      case "list":
        return (
          <ListBlockOutput
            key={i}
            items={block.items || []}
            ordered={block.ordered}
            className="my-6 sm:my-8"
          />
        );
      case "heading":
        return (
          <HeadingOutput
            key={i}
            level={block.level || 2}
            text={block.text || "Empty heading"}
            className={`
              ${
                block.level === 1
                  ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
                  : ""
              }
              ${
                block.level === 2
                  ? "text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
                  : ""
              }
              ${
                block.level === 3
                  ? "text-xl sm:text-2xl md:text-3xl lg:text-4xl"
                  : ""
              }
              ${
                block.level === 4
                  ? "text-lg sm:text-xl md:text-2xl lg:text-3xl"
                  : ""
              }
              ${
                block.level === 5
                  ? "text-base sm:text-lg md:text-xl lg:text-2xl"
                  : ""
              }
              ${
                block.level === 6
                  ? "text-sm sm:text-base md:text-lg lg:text-xl"
                  : ""
              }
              font-bold text-gray-900 dark:text-gray-100 my-6 sm:my-8 leading-tight
            `}
          />
        );
      case "table":
        return (
          <TableBlocksOutput
            key={i}
            data={block.data}
            caption={block.caption}
            className="my-6 sm:my-8 overflow-x-auto rounded-lg sm:rounded-xl shadow-md sm:shadow-lg border border-gray-200 dark:border-gray-700"
          />
        );
      case "link":
        return (
          <LinkBlockOutput
            key={i}
            href={block.href}
            text={block.text}
            caption={block.caption}
            className="my-6 sm:my-8 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline decoration-2 transition-colors duration-200"
          />
        );
      case "hr":
        return (
          <HrOutput
            key={i}
            caption={block.caption}
            className="my-6 sm:my-8 border-2 border-gray-200 dark:border-gray-700 rounded-full"
          />
        );
      case "file":
        return (
          <FileDownloadOutput
            key={i}
            url={block.url}
            name={block.name}
            className="my-6 sm:my-8"
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
            className="my-6 sm:my-8 p-4 sm:p-6 md:p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border border-gray-200 dark:border-gray-700"
          />
        );
      case "ad":
        return block.adType === "horizontal" ? (
          <AdGuard key={block.id || `ad-${i}`} placement="inArticle">
            <div className="my-6 sm:my-8 w-full">
              <HorizontalBannerAd postId={postId} />
            </div>
          </AdGuard>
        ) : (
          <AdGuard key={block.id || `ad-${i}`} placement="inArticle">
            <div className="my-6 sm:my-8 w-full">
              <InArticleAd postId={postId} adIndex={block.adIndex} />
            </div>
          </AdGuard>
        );

      default:
        console.warn(
          `[DEBUG] Unsupported block type at index ${i}:`,
          block.type
        );
        return (
          <div
            key={i}
            className="p-4 sm:p-6 text-center rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800"
          >
            <p className="text-sm sm:text-base text-yellow-700 dark:text-yellow-400 font-medium">
              ⚠️ Unsupported content: {block.type}
            </p>
          </div>
        );
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-pulse px-4 sm:px-0">
        <Skeleton className="w-full h-32 sm:h-40 rounded-xl sm:rounded-2xl bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-6 sm:h-8 w-3/4 rounded-lg sm:rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-3 sm:space-y-4">
          <Skeleton className="h-5 sm:h-6 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-5 sm:h-6 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-5 sm:h-6 w-4/5 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
        <Skeleton className="w-full h-24 sm:h-32 rounded-xl sm:rounded-2xl bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (!Array.isArray(blocks)) {
    console.warn("BlockRenderer: 'blocks' prop is not an array", blocks);
    return null;
  }

  const isAuthor = user?._id === authorId;
  const previewBlockLimit = 3;

  // Only add ads if content is not restricted OR user can view
  const blocksWithAds =
    isPostRestricted && !canViewPost ? blocks : getAdBlocks(blocks);

  const previewBlocks = blocks
    .slice(0, previewBlockLimit)
    .filter((block) =>
      ["text", "image", "heading", "table"].includes(block.type)
    );

  const displayedBlocks = showFullContent ? blocksWithAds : previewBlocks;

  // Mobile: Show only first 3 blocks initially, rest after button click
  const mobilePreviewLimit = 3;
  const visibleBlocks =
    isMobile && !isContentExpanded
      ? displayedBlocks.slice(0, mobilePreviewLimit)
      : displayedBlocks;
  const hasMoreContent =
    isMobile &&
    displayedBlocks.length > mobilePreviewLimit &&
    !isContentExpanded;

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
      {/* Content Blocks with Alternating Ads */}
      <div className="px-4 sm:px-0">
        {visibleBlocks.map((block, i) => (
          <div key={block.id || i} className="w-full">
            {renderBlock(block, i)}
          </div>
        ))}
      </div>

      {/* Single "Read Complete Article" Button for Mobile */}
      {hasMoreContent && (
        <div className="my-8 flex justify-center px-4 sm:px-0">
          <button
            onClick={handleExpandFullContent}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105 active:scale-95"
          >
            {/* Animated Icon */}
            <div className="relative">
              <svg
                className="w-6 h-6 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>

            <div className="flex flex-col items-start">
              <span className="text-base sm:text-lg">Continue Reading</span>
            </div>

            {/* Arrow Icon with Animation */}
            <svg
              className="w-6 h-6 group-hover:translate-y-1 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M19 9l-7 7-7-7"
              />
            </svg>

            {/* Glow Effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
          </button>
        </div>
      )}

      {/* Premium Content Paywall */}
      {isPostRestricted && !showFullContent && (
        <div className="px-4 sm:px-0 my-8 sm:my-10">
          <div className="p-6 sm:p-8 md:p-10 lg:p-12 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 rounded-2xl sm:rounded-3xl text-center shadow-xl sm:shadow-2xl transform transition-all duration-300 hover:shadow-3xl hover:scale-[1.01] sm:hover:scale-[1.02] relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-white/10 rounded-full -mr-16 sm:-mr-20 -mt-16 sm:-mt-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-40 sm:h-40 bg-white/10 rounded-full -ml-16 sm:-ml-20 -mb-16 sm:-mb-20 blur-3xl"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4 sm:mb-6">
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white"
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

              <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4 px-4">
                Premium Content Ahead
              </h3>

              <p className="text-white/90 text-sm sm:text-base md:text-lg lg:text-xl mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-4">
                Unlock the full story and get exclusive access to premium
                content, in-depth analysis, and more.
              </p>

              <button
                onClick={handleSeeMore}
                disabled={subscriptionLoading}
                className={`
                  group relative inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 
                  rounded-full bg-white text-blue-600 
                  font-bold text-sm sm:text-base md:text-lg
                  shadow-lg sm:shadow-xl hover:shadow-2xl
                  transform transition-all duration-300
                  hover:scale-105 hover:bg-blue-50
                  ${subscriptionLoading ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                {subscriptionLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 sm:h-5 sm:w-5"
                      viewBox="0 0 24 24"
                    >
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
                    <span className="hidden sm:inline">Processing...</span>
                    <span className="sm:hidden">Wait...</span>
                  </>
                ) : (
                  <>
                    {isAuthenticated && subscriptionStatus?.isSubscribed ? (
                      <>
                        <span>View Full Story</span>
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform"
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
                          className="w-4 h-4 sm:w-5 sm:h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                        </svg>
                        <span>Subscribe Now</span>
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform"
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
                          className="w-4 h-4 sm:w-5 sm:h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="hidden sm:inline">
                          Log in to Continue
                        </span>
                        <span className="sm:hidden">Log in</span>
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform"
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
        </div>
      )}

      {/* Post Tags */}
      {showFullContent && tags?.length > 0 && (
        <div className="px-4 sm:px-0 mt-10 sm:mt-12">
          <PostTags tags={tags} />
        </div>
      )}
    </div>
  );
};

export default BlockRenderer;
