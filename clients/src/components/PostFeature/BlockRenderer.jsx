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
    let current = validIndices.length > 0 ? 0 : -1; // Start at first valid block

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
        <div key={i} className="text-red-500 italic my-6">
          Invalid content block.
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
            className="text-text-main-light dark:text-text-main-dark my-6"
          />
        );
      case "image":
        return (
          <ImageBlockOutput
            key={i}
            src={block.src}
            caption={block.caption}
            className="my-6 rounded-lg shadow-md"
          />
        );
      case "code":
        console.log("[DEBUG] Rendering code block:", {
          index: i,
          type: block.type,
          codePreview: block.code?.slice(0, 30),
          language: block.language,
          caption: block.caption,
        });
        return (
          <CodeBlockOutput
            key={i}
            code={block.code}
            language={block.language || "javascript"} // ensure fallback here
            caption={block.caption}
            className="my-6 bg-gray-800 dark:bg-gray-900 rounded-lg p-4"
          />
        );

      case "video":
        return (
          <VideoBlockOutput
            key={i}
            src={block.src}
            caption={block.caption}
            className="my-6 rounded-lg shadow-md"
          />
        );
      case "quote":
        return (
          <QuoteBlockOutput
            key={i}
            text={block.text}
            author={block.author}
            className="my-6 border-l-4 border-blue-600 dark:border-blue-400 pl-4 italic text-text-main-light dark:text-text-main-dark"
          />
        );
      case "list":
        return (
          <ListBlockOutput
            key={i}
            items={block.items || []}
            ordered={block.ordered}
            className="my-6 text-text-main-light dark:text-text-main-dark"
          />
        );
      case "heading":
        return (
          <HeadingOutput
            key={i}
            level={block.level || 2}
            text={block.text || "Empty heading"}
            className={`text-${
              block.level === 1 ? "4xl" : block.level === 2 ? "3xl" : "2xl"
            } font-bold text-text-main-light dark:text-text-main-dark my-6`}
          />
        );
      case "table":
        return (
          <TableBlocksOutput
            key={i}
            data={block.data}
            caption={block.caption}
            className="my-6 overflow-x-auto"
          />
        );
      case "link":
        return (
          <LinkBlockOutput
            key={i}
            href={block.href}
            text={block.text}
            caption={block.caption}
            className="my-6 text-blue-600 dark:text-blue-400 hover:underline"
          />
        );
      case "hr":
        return (
          <HrOutput
            key={i}
            caption={block.caption}
            className="my-6 border-border-light dark:border-border-dark"
          />
        );
      case "file":
        return (
          <FileDownloadOutput
            key={i}
            url={block.url}
            name={block.name}
            className="my-6 text-blue-600 dark:text-blue-400 hover:underline"
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
            className="my-6 p-4 bg-background-alt-light dark:bg-background-alt-dark rounded-lg"
          />
        );
      case "ad":
        return (
          <div className="my-6 w-full">
            <InArticleAd
              key={`ad-${i}`}
              postId={postId}
              adIndex={block.adIndex}
            />
          </div>
        );
      default:
        console.warn(
          `[DEBUG] Unsupported block type at index ${i}:`,
          block.type
        );
        return (
          <div key={i} className="text-red-500 italic my-6">
            Unsupported content block: {block.type}
          </div>
        );
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-full h-32 rounded-lg bg-background-alt-light dark:bg-background-alt-dark" />
        <Skeleton className="h-6 w-3/4 rounded bg-background-alt-light dark:bg-background-alt-dark" />
        <table className="w-full">
          <tbody>
            <tr>
              <td>
                <Skeleton className="h-4 w-24 rounded bg-background-alt-light dark:bg-background-alt-dark" />
              </td>
              <td>
                <Skeleton className="h-4 w-24 rounded bg-background-alt-light dark:bg-background-alt-dark" />
              </td>
            </tr>
          </tbody>
        </table>
        <table className="w-full">
          <tbody>
            <tr>
              <td>
                <Skeleton className="h-4 w-12 rounded bg-background-alt-light dark:bg-background-alt-dark" />
              </td>
              <td>
                <Skeleton className="h-4 w-12 rounded bg-background-alt-light dark:bg-background-alt-dark" />
              </td>
              <td>
                <Skeleton className="h-4 w-12 rounded bg-background-alt-light dark:bg-background-alt-dark" />
              </td>
              <td>
                <Skeleton className="h-4 w-12 rounded bg-background-alt-light dark:bg-background-alt-dark" />
              </td>
              <td>
                <Skeleton className="h-4 w-12 rounded bg-background-alt-light dark:bg-background-alt-dark" />
              </td>
            </tr>
          </tbody>
        </table>
        <Skeleton className="h-4 w-16 rounded bg-background-alt-light dark:bg-background-alt-dark" />
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
      {displayedBlocks.map((block, i) => (
        <div key={i} className="w-full">
          {renderBlock(block, i)}
        </div>
      ))}
      {isPostRestricted && !showFullContent && (
        <div className="my-6 p-6 bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl text-center shadow-lg font-(family-name:--font-Urbanist)">
          <p className="text-white mb-4 text-lg font-medium">
            Unlock the full story with a subscription.
          </p>
          <button
            onClick={handleSeeMore}
            disabled={subscriptionLoading}
            className={`px-6 py-3 rounded-full bg-white text-blue-600 font-semibold hover:bg-gray-100 transition-colors duration-200 ${
              subscriptionLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {subscriptionLoading
              ? "Processing..."
              : isAuthenticated && subscriptionStatus?.isSubscribed
              ? "View Full Story"
              : isAuthenticated
              ? "Subscribe Now"
              : "Log in to Continue"}
          </button>
        </div>
      )}
      {showFullContent && tags?.length > 0 && <PostTags tags={tags} />}
    </div>
  );
};

export default BlockRenderer;
