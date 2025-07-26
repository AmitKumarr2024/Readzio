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
import GoogleAd from "../../Ads/GoogleAd";
import PostTags from "../Post/DisplayPost/PostTags";
import Skeleton from "@/components/Ui/Skeleton";
import adsConfig from "../../Utils/adsConfig";
import InArticleAd from "../../Ads/InArticleAd";

const placeholderAdImage = "https://placehold.co/150x100?text=Ad+Failed";

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
    if (!Array.isArray(blocks) || blocks.length < 6) return blocks;

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

    const totalBlocks = blocks.length;
    const validIndices = [];

    // Collect only indices of valid ad positions
    for (let i = 0; i < totalBlocks; i++) {
      const type = blocks[i]?.type;
      if (validTypes.includes(type)) {
        validIndices.push(i);
      }
    }

    if (validIndices.length < 6) return blocks;

    const adInsertions = [];
    const minGap = 6;
    const maxAds = Math.min(5, Math.floor(validIndices.length / minGap));
    let current = 2 + Math.floor(Math.random() * 2); // Start after 2–3 valid blocks
    let adsInserted = 0;

    while (adsInserted < maxAds && current < validIndices.length - 2) {
      const adAfterIndex = validIndices[current];
      adInsertions.push(adAfterIndex);
      current += minGap + Math.floor(Math.random() * 3); // gap: 6–8
      adsInserted++;
    }

    // Insert ads in reverse to avoid index shifting
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
    switch (block.type) {
      case "text":
        return (
          <TextBlock
            key={i}
            value={block.value}
            className="text-gray-700 dark:text-gray-200 mb-6"
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
        return (
          <CodeBlockOutput
            key={i}
            code={block.code}
            language={block.language || "javascript"}
            caption={block.caption}
            className="my-6 bg-gray-800 rounded-lg p-4"
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
            className="my-6 border-l-4 border-blue-600 pl-4 italic text-gray-700 dark:text-gray-200"
          />
        );
      case "list":
        return (
          <ListBlockOutput
            key={i}
            items={block.items}
            ordered={block.ordered}
            className="my-6 text-gray-700 dark:text-gray-200"
          />
        );
      case "heading":
        return (
          <HeadingOutput
            key={i}
            level={block.level || 2}
            text={block.text}
            className={`text-${
              block.level === 1 ? "4xl" : block.level === 2 ? "3xl" : "2xl"
            } font-bold text-gray-900 dark:text-white my-6`}
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
            className="my-6 text-blue-600 hover:underline"
          />
        );
      case "hr":
        return (
          <HrOutput
            key={i}
            caption={block.caption}
            className="my-6 border-gray-200 dark:border-gray-700"
          />
        );
      case "file":
        return (
          <FileDownloadOutput
            key={i}
            url={block.url}
            name={block.name}
            className="my-6 text-blue-600 hover:underline"
          />
        );
      case "poll":
        return (
          <PollBlockOutput
            key={i}
            slug={slug}
            blockId={block.id}
            question={block.question}
            options={block.options}
            caption={block.caption}
            className="my-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg"
          />
        );
      case "ad":
        return <InArticleAd key={`ad-${i}`} postId={postId} />;
      default:
        return (
          <div key={i} className="text-red-500 italic">
            Unsupported content block.
          </div>
        );
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-full h-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-6 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <table className="w-full">
          <tbody>
            <tr>
              <td>
                <Skeleton className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              </td>
              <td>
                <Skeleton className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              </td>
            </tr>
          </tbody>
        </table>
        <table className="w-full">
          <tbody>
            <tr>
              <td>
                <Skeleton className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" />
              </td>
              <td>
                <Skeleton className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" />
              </td>
              <td>
                <Skeleton className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" />
              </td>
              <td>
                <Skeleton className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" />
              </td>
              <td>
                <Skeleton className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" />
              </td>
            </tr>
          </tbody>
        </table>
        <Skeleton className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
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
    .filter((block) => ["text", "image", "heading"].includes(block.type));
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
    <div className="relative">
      {displayedBlocks.map((block, i) => (
        <div key={i} className="animate-slide-up">
          {renderBlock(block, i)}
        </div>
      ))}
      {isPostRestricted && !showFullContent && (
        <div className="mt-6 p-6 bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl text-center shadow-lg animate-fade-in font-(family-name:--font-Urbanist)">
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
