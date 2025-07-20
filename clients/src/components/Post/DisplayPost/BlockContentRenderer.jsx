import React from "react";
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
}) => (
  <div className="relative">
    {post.blocked && !isAuthor && !showAnyway && (
      <BlockedPostOverlay
        post={post}
        isAuthor={isAuthor}
        showAnyway={showAnyway}
        setShowAnyway={setShowAnyway}
      />
    )}
    {(!canViewPost || post.blocked || !post.isPublished) && !isAuthor && (
      <RestrictedNotice
        isBlocked={post.blocked}
        isAuthor={isAuthor}
        showAnyway={showAnyway}
      />
    )}
    {(canViewPost || isAuthor) && post.isPublished && (
      <BlockRenderer
        blocks={post.blocks || []}
        postId={post._id}
        slug={post.slug}
        loginUser={currentUser}
        getUserById={getUserById}
        isPostRestricted={isPostRestricted}
        canViewPost={canViewPost}
        authorId={post.author?._id}
        isPublished={post.isPublished}
        tags={post.tags}
      />
    )}
  </div>
);

export default BlockContentRenderer;
