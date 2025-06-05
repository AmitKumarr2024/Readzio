import React from "react";
import { Link } from "react-router-dom";
import ToggleFollowButton from "../../Author/Subscribe/ToggleFollowButton";
import ToggleSubscribeButton from "../../Author/Subscribe/ToggleSubscribeButton";

const UserCard = ({
  posts = [],
  user,
  followers,
  following,
  showFollowBtn,
  isFollowing,
  isSubscribed,
  isSubscriptionPlanEnabled,
  currentUserId,
  onFollowToggle = () => {},
  onSubscribeToggle = () => {},
  onEnableSubscriptionPlanSuccess = () => {},
}) => {
  if (!user) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "Not available";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const authorName = user.name;
  const userPosts = posts.filter(
    (post) => post.author?.name?.toLowerCase() === authorName.toLowerCase()
  );
  const postCount = userPosts.length;

  // Check if the profile belongs to the logged-in user
  const isCurrentUser = currentUserId === user._id;

  return (
    <div className="p-6 rounded-lg bg-white max-w-md shadow-md">
      {/* User Avatar & Basic Info */}
      <Link
        to={`/author-profile/${user._id}`}
        className="flex items-center space-x-4"
      >
        <img
          src={user.avatar || "https://via.placeholder.com/64"}
          alt={user.name || "User avatar"}
          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900">{user.name}</h3>
          <p className="text-sm text-gray-500">
            @{user.username || user.email || "unknown"}
          </p>
        </div>
      </Link>

      {/* Bio */}
      <p className="text-sm text-gray-600 mt-4">{user.bio || "No bio available"}</p>

      {/* Stats */}
      <div className="flex space-x-6 mt-4 text-sm text-gray-500">
        <p>
          <span className="font-medium text-gray-900">{followers?.length || 0}</span>{" "}
          Followers
        </p>
        <p>
          <span className="font-medium text-gray-900">{following?.length || 0}</span>{" "}
          Following
        </p>
        <p>
          <span className="font-medium text-gray-900">{postCount}</span> Posts
        </p>
      </div>

      {/* Additional Info */}
      <div className="mt-4 text-sm text-gray-500 space-y-2">
        {user.location && (
          <p>
            <span className="font-medium text-gray-900">Location:</span> {user.location}
          </p>
        )}
        <p>
          <span className="font-medium text-gray-900">Gender:</span> {user.gender || "Not specified"}
        </p>
        {user.profession && (
          <p>
            <span className="font-medium text-gray-900">Profession:</span> {user.profession}
          </p>
        )}
        <p>
          <span className="font-medium text-gray-900">Joined:</span>{" "}
          {formatDate(user.joinedDate || user.joiningDate)}
        </p>
        <p>
          <span className="font-medium text-gray-900">Account Created:</span>{" "}
          {user.createdAt ? formatDate(user.createdAt) : "Unknown"}
        </p>
        <p>
          <span className="font-medium text-gray-900">Last Updated:</span>{" "}
          {user.updatedAt ? formatDate(user.updatedAt) : "Unknown"}
        </p>
        {user.website && (
          <p>
            <span className="font-medium text-gray-900">Website:</span>{" "}
            <a
              href={user.website}
              className="text-blue-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {user.website}
            </a>
          </p>
        )}
      </div>

      {/* Follow and Subscribe Buttons - only show if NOT current user and showFollowBtn is true */}
      {showFollowBtn && !isCurrentUser && (
        <div className="w-full mt-6 flex flex-col flex-wrap gap-4">
          <ToggleFollowButton
            followUserId={user._id}
            isFollowing={isFollowing}
            onFollowSuccess={onFollowToggle}
          />
          <ToggleSubscribeButton
            authorId={user._id}
            isSubscribed={isSubscribed}
            isSubscriptionPlanEnabled={isSubscriptionPlanEnabled}
            onSubscribeSuccess={onSubscribeToggle}
            onEnableSubscriptionSuccess={onEnableSubscriptionPlanSuccess}
          />
        </div>
      )}

      {/* Social Links */}
      {user.social &&
        (user.social.twitter || user.social.github || user.social.linkedin) && (
          <div className="flex space-x-4 mt-4 text-sm">
            {user.social.twitter && (
              <a
                href={user.social.twitter}
                className="text-blue-500 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Twitter
              </a>
            )}
            {user.social.github && (
              <a
                href={user.social.github}
                className="text-blue-500 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            )}
            {user.social.linkedin && (
              <a
                href={user.social.linkedin}
                className="text-blue-500 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            )}
          </div>
        )}
    </div>
  );
};

export default UserCard;
