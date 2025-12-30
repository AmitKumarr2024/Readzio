import React from "react";
import { Link } from "react-router-dom";
import ToggleFollowButton from "../../Author/Subscribe/ToggleFollowButton";
import Skeleton from "@/components/Ui/Skeleton";

const UserCard = ({
  user,
  posts,
  followers = [],
  following = [],
  followersCount = 0, // ✅ ADD
  followingCount = 0, // ✅ ADD
  showFollowBtn,
  isFollowing,
  currentUserId,
  onFollowToggle = () => {},
  subscriptionStatus,
  isLoading = false,
}) => {
  // console.log("user..", user);
  // console.log("posts...", posts);

  // === DEBUG: Incoming props ===
  // console.log("[UserCard] Received props", {
  //   userId: user?._id,
  //   hasUser: !!user,
  //   userName: user?.name,
  //   userUsername: user?.username,
  //   followersCountInUser: user?.followersCount,
  //   followingCountInUser: user?.followingCount,
  //   postsCount: user?.postsCount,
  //   hasFollowersArrayInUser: !!user?.followers,
  //   hasFollowingArrayInUser: !!user?.following,
  //   followersPropLength: followers.length,
  //   followingPropLength: following.length,
  //   showFollowBtn,
  //   isFollowing,
  //   currentUserId,
  //   isLoading,
  // });

  if (!user?._id && !isLoading) {
    // console.log("[UserCard] Early return: no user and not loading");
    return null;
  }

  const formatDate = React.useCallback((dateStr) => {
    // console.log("[UserCard] formatDate called with", dateStr);
    if (!dateStr) return "Not available";
    const formatted = new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    // console.log("[UserCard] formatDate result", formatted);

    return formatted;
  }, []);

  const authorName = user?.name || "Unknown";
  // console.log("[UserCard] Computed authorName", authorName);

  const isCurrentUser = currentUserId === user?._id;
  // console.log("[UserCard] Computed isCurrentUser", isCurrentUser);

  // === DEBUG: Final displayed stats ===
  const displayedFollowers = followersCount ?? followers?.length ?? 0;

  const displayedFollowing = followingCount ?? following?.length ?? 0;

  const displayedPosts =
    posts && posts?.length > 0 ? posts?.length : user?.postsCount ?? 0;

  // console.log("[UserCard] Displayed stats", {
  //   isCurrentUser,
  //   displayedFollowers,
  //   followersSource: isCurrentUser ? "prop array" : "user.followersCount",
  //   displayedFollowing,
  //   followingSource: isCurrentUser ? "prop array" : "user.followingCount",
  //   displayedPosts,
  // });

  // console.log("[UserCard] Rendering branch", { isLoading });

  return (
    <div className="modern-user-card-container">
      {isLoading ? (
        <>
          {/* {console.log("[UserCard] Rendering SKELETON")} */}
          <div className="card-skeleton">
            <div className="skeleton-header">
              <Skeleton width="w-20" height="h-20" rounded="rounded-full" />
              <div className="skeleton-text">
                <Skeleton width="w-32" height="h-6" />
                <Skeleton width="w-48" height="h-4" />
              </div>
            </div>
            <div className="skeleton-body">
              <Skeleton width="w-full" height="h-16" />
              <div className="skeleton-stats">
                <Skeleton width="w-full" height="h-10" />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* {console.log("[UserCard] Rendering FULL CARD")} */}
          <div className="modern-card">
            {/* Header Section */}
            {/* {console.log("[UserCard] Rendering header", {
              avatarExists: !!user?.avatar,
              isOnline: user?.isOnline,
            })} */}
            <Link to={`/author-profile/${user._id}`} className="card-header">
              <div className="avatar-section">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={authorName}
                    className="profile-img"
                  />
                ) : (
                  <div className="profile-initials">
                    {authorName && authorName.trim()
                      ? authorName.trim()[0].toUpperCase()
                      : "U"}
                  </div>
                )}
                {user?.isOnline && <div className="online-indicator" />}
              </div>
              <div className="user-meta">
                <h3 className="user-name">{authorName}</h3>
                {user.email && <p className="user-email">{user.email}</p>}
              </div>
            </Link>

            {/* Bio Section */}
            {/* {console.log("[UserCard] Bio value", user.bio)} */}
            <div className="bio-container">
              <p className="user-bio">
                {user.bio || "No bio available for this creator."}
              </p>
            </div>

            {/* Stats Section */}
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-count">{displayedFollowers}</span>
                <span className="stat-label">Followers</span>
              </div>

              <div className="stat-box">
                <span className="stat-count">{displayedFollowing}</span>
                <span className="stat-label">Following</span>
              </div>

              {displayedPosts > 0 && (
                <div className="stat-box">
                  <span className="stat-count">{displayedPosts}</span>
                  <span className="stat-label">Posts</span>
                </div>
              )}
            </div>

            {/* Details Section */}
            {/* {console.log("[UserCard] Details fields", {
              profession: user.profession,
              location: user.location,
              joinedDateRaw: user?.joinedDate ?? user?.createdAt,
            })} */}
            <div className="details-list">
              {user.profession && (
                <div className="detail-item">
                  <span className="detail-icon">💼</span>
                  <span>{user.profession}</span>
                </div>
              )}
              {user.location && (
                <div className="detail-item">
                  <span className="detail-icon">📍</span>
                  <span>{user.location}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-icon">📅</span>
                <span>
                  Joined{" "}
                  {formatDate(user?.joinedDate ?? user?.createdAt ?? null)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {/* {console.log("[UserCard] Action button condition", {
              showFollowBtn,
              isCurrentUser,
            })} */}
            <div className="action-area">
              {showFollowBtn && !isCurrentUser && (
                <ToggleFollowButton
                  followUserId={user._id}
                  isFollowing={isFollowing}
                  onFollowToggle={onFollowToggle}
                  className="primary-follow-btn"
                />
              )}
            </div>

            {/* Social Links */}
            {/* {console.log("[UserCard] Social links present?", {
              hasSocial: !!user.social,
              validLinks: user.social
                ? Object.values(user.social).filter(Boolean).length
                : 0,
            })} */}
            {user.social && Object.values(user.social).some(Boolean) && (
              <div className="social-footer">
                {Object.entries(user.social).map(
                  ([key, value]) =>
                    value && (
                      <a
                        key={key}
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="social-pill"
                      >
                        {key}
                      </a>
                    )
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UserCard;
