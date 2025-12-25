import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import ToggleFollowButton from "../../Author/Subscribe/ToggleFollowButton";
import Skeleton from "@/components/Ui/Skeleton";

const UserCard = ({
  posts = [],
  user,
  followers = [],
  following = [],
  showFollowBtn,
  isFollowing,
  currentUserId,
  onFollowToggle = () => {},
  subscriptionStatus,
  isLoading = false,
}) => {
  const { isEligible } = useSelector(
    (state) => state.subscription || { isEligible: false }
  );

  if (!user && !isLoading) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "Not available";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const authorName = user?.name || "Unknown";
  const userPosts = posts.filter((post) => post.author?._id === user._id);
  const postCount = userPosts.length;
  const isCurrentUser = currentUserId === user?._id;

  return (
    <div className="modern-user-card-container">
      {isLoading ? (
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
      ) : (
        <div className="modern-card">
          {/* Header Section */}
          <Link to={`/author-profile/${user._id}`} className="card-header">
            <div className="avatar-section">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={authorName}
                  className="profile-img"
                />
              ) : (
                <div className="profile-initials">{(authorName || "U")[0]}</div>
              )}
              <div className="online-indicator"></div>
            </div>
            <div className="user-meta">
              <h3 className="user-name">{authorName}</h3>
              {user.email && <p className="user-email">{user.email}</p>}
            </div>
          </Link>

          {/* Bio Section */}
          <div className="bio-container">
            <p className="user-bio">
              {user.bio || "No bio available for this creator."}
            </p>
          </div>

          {/* Stats Section */}
          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-count">
                {currentUserId ? followers?.length : user?.followersCount || 0}
              </span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat-box">
              <span className="stat-count">
                {currentUserId ? following?.length : user?.followingCount || 0}
              </span>
              <span className="stat-label">Following</span>
            </div>
            <div className="stat-box">
              <span className="stat-count">{userPosts?.length}</span>
              <span className="stat-label">Posts</span>
            </div>
          </div>

          {/* Details Section */}
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
                Joined {formatDate(user.joinedDate || user.createdAt)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
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
          {user.social && (
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
      )}
    </div>
  );
};

export default UserCard;
