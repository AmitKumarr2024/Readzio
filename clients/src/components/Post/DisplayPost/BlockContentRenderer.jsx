import React from "react";
import PropTypes from "prop-types";
import BlockRenderer from "../../PostFeature/BlockRenderer";
import BlockedPostOverlay from "../BlockedPostOverlay";
import RestrictedNotice from "./RestrictedNotice";

const BlockContentRenderer = ({
  post,
  isAuthor,
  showAnyway,
  setShowAnyway,
  canViewPost,
  isPostRestricted,
  currentUser,
  getUserById,
  isAuthenticated = false,
}) => {
  // Validate post object
  if (!post || typeof post !== "object") {
    console.warn("[BlockContentRenderer] Invalid post object provided");
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <p>Unable to load post content</p>
      </div>
    );
  }

  // Extract post properties with safe defaults
  const {
    blocked = false,
    isPublished = true, // Default to true if not explicitly set
    blocks = [],
    _id: postId,
    slug,
    author,
    tags = [],
  } = post;

  const authorId = author?._id || null;

  // Determine visibility conditions
  const isBlocked = Boolean(blocked);
  const isPublishedStatus = Boolean(isPublished); // Explicitly convert to boolean

  // CRITICAL: Guest users should see all published, non-blocked posts
  // Authenticated users see based on permissions
  const shouldShowContent =
    isPublishedStatus &&
    (isAuthor || // Authors always see their content
      !isAuthenticated || // Guests see all published posts
      canViewPost); // Authenticated users need permission

  const shouldShowBlockedOverlay = isBlocked && !isAuthor && !showAnyway;

  // Only show restricted notice for authenticated users who lack permission
  const shouldShowRestrictedNotice =
    isAuthenticated &&
    !isAuthor &&
    !showAnyway &&
    isPublishedStatus &&
    (!canViewPost || isBlocked);

  console.log("[BlockContentRenderer] Debug Info:", {
    postId: postId || "N/A",
    isAuthenticated,
    isAuthor,
    isPublished: isPublishedStatus,
    isBlocked,
    canViewPost,
    isPostRestricted,
    shouldShowContent,
    shouldShowBlockedOverlay,
    shouldShowRestrictedNotice,
    blocksCount: Array.isArray(blocks) ? blocks.length : 0,
    hasBlocks: Array.isArray(blocks) && blocks.length > 0,
  });

  return (
    <div className="relative">
      {/* Blocked Post Overlay */}
      {shouldShowBlockedOverlay && (
        <BlockedPostOverlay
          post={post}
          isAuthor={isAuthor}
          showAnyway={showAnyway}
          setShowAnyway={setShowAnyway}
        />
      )}

      {/* Restricted Notice for authenticated users without permission */}
      {shouldShowRestrictedNotice && (
        <RestrictedNotice
          isBlocked={isBlocked}
          isAuthor={isAuthor}
          showAnyway={showAnyway}
          isPostRestricted={isPostRestricted}
          isPublished={isPublishedStatus}
        />
      )}

      {/* Main Content - Show for guests and authorized users */}
      {shouldShowContent && Array.isArray(blocks) && blocks.length > 0 ? (
        <BlockRenderer
          blocks={blocks}
          postId={postId}
          slug={slug}
          loginUser={currentUser}
          getUserById={getUserById}
          isPostRestricted={isPostRestricted}
          canViewPost={canViewPost}
          authorId={authorId}
          isPublished={isPublishedStatus}
          tags={Array.isArray(tags) ? tags : []}
        />
      ) : shouldShowContent && blocks.length === 0 ? (
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
          <p>This post has no content yet</p>
        </div>
      ) : null}

      {/* Unpublished post message (only for non-authors) */}
      {!isPublishedStatus && !isAuthor && (
        <div className="p-6 text-center text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="font-medium">This post is not published yet</p>
        </div>
      )}
    </div>
  );
};

// PropTypes
BlockContentRenderer.propTypes = {
  post: PropTypes.shape({
    _id: PropTypes.string,
    slug: PropTypes.string,
    blocks: PropTypes.array,
    blocked: PropTypes.bool,
    isPublished: PropTypes.bool,
    author: PropTypes.shape({
      _id: PropTypes.string,
    }),
    tags: PropTypes.array,
  }).isRequired,
  isAuthor: PropTypes.bool,
  showAnyway: PropTypes.bool,
  setShowAnyway: PropTypes.func,
  canViewPost: PropTypes.bool,
  isPostRestricted: PropTypes.bool,
  currentUser: PropTypes.object,
  getUserById: PropTypes.func,
  isAuthenticated: PropTypes.bool,
};

export default BlockContentRenderer;
