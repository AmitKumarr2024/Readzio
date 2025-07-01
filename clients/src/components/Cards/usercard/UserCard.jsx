import React from "react";
import { Link } from "react-router-dom";
import ToggleFollowButton from "../../Author/Subscribe/ToggleFollowButton";
import ToggleSubscribeButton from "../../Author/Subscribe/ToggleSubscribeButton";
import Skeleton from "../../ui/Skeleton";

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
  if (!user && !isLoading) return null;

  console.log("UserCard: Render", {
    userId: user?._id,
    showFollowBtn,
    isFollowing,
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "Not available";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const authorName = user?.name || "Unknown";
  const userPosts = posts.filter(
    (post) => post.author?.name?.toLowerCase() === authorName.toLowerCase()
  );
  const postCount = userPosts.length;
  const isCurrentUser = currentUserId === user?._id;

  return (
    <div className="relative p-6 rounded-2xl bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark max-w-md shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer group overflow-hidden">
      {/* Decorative Accent */}
      <div className="absolute top-0 left-0 w-24 h-24 rounded-full -translate-x-12 -translate-y-12 opacity-50"></div>

      {/* User Avatar & Basic Info */}
      {isLoading ? (
        <div className="flex items-center space-x-4 relative z-10 bg-white p-4 rounded-lg shadow-sm hover:bg-indigo-50 hover:scale-102 transition-all duration-300">
          <div className="relative">
            <Skeleton width="w-32" height="h-32" rounded="rounded-full" className="border-4 border-gray-200" />
            <Skeleton
              width="w-32"
              height="h-32"
              rounded="rounded-full"
              className="absolute inset-0 opacity-30 bg-gray-200"
            />
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton width="w-4/5" height="h-7" rounded="rounded-md" className="bg-gray-200" />
            <Skeleton width="w-3/5" height="h-4" rounded="rounded-sm" className="bg-gray-200" />
            <Skeleton width="w-7/12" height="h-3" rounded="rounded-sm" className="bg-gray-200" />
          </div>
        </div>
      ) : (
        <Link
          to={`/author-profile/${user._id}`}
          className="flex items-center space-x-4 relative z-10 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-4 rounded-lg shadow-sm hover:bg-indigo-50 hover:scale-102 transition-all duration-300 group/link"
        >
          <div className="relative">
            <img
              src={user.avatar || "https://placehold.co/150x100?text=Ad+Failed"}
              alt={authorName}
              className="w-32 rounded-full object-cover border-4 border-white shadow-md group-hover/link:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 rounded-full bg-indigo-500 opacity-0 group-hover/link:opacity-30 transition-opacity duration-300"></div>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-xl text-text-main-light dark:text-text-main-dark  group-hover/link:text-indigo-700 transition-colors duration-300">{authorName}</h3>
            <p className="text-sm text-text-main-light dark:text-text-main-dark  group-hover/link:text-indigo-600 transition-colors duration-300">@{user.username || user.email || "unknown"}</p>
            {user.email && (
              <p className="text-xs text-text-main-light dark:text-text-main-dark  mt-1 group-hover/link:text-indigo-500 transition-colors duration-300">Email: {user.email}</p>
            )}
          </div>
        </Link>
      )}

      {/* Bio */}
      {isLoading ? (
        <div className="mt-4 space-y-2">
          <Skeleton width="w-full" height="h-4" />
          <Skeleton width="w-5/6" height="h-4" />
          <Skeleton width="w-3/4" height="h-4" />
        </div>
      ) : (
        <p className="text-sm text-text-main-light dark:text-text-main-dark  mt-4 line-clamp-3 relative z-10">
          {user.bio || "No bio available"}
        </p>
      )}

      {/* Stats */}
      {isLoading ? (
        <div className="flex justify-between mt-4 space-x-4">
          <Skeleton width="w-1/3" height="h-10" />
          <Skeleton width="w-1/3" height="h-10" />
          <Skeleton width="w-1/3" height="h-10" />
        </div>
      ) : (
        <div className="flex justify-between mt-4 text-sm text-text-main-light dark:text-text-main-dark  relative z-10">
          <p className="flex flex-col items-center">
            <span className="font-bold text-text-main-light dark:text-text-main-dark  text-lg">{followers.length}</span>
            Followers
          </p>
          <p className="flex flex-col items-center">
            <span className="font-bold text-text-main-light dark:text-text-main-dark  text-lg">{following.length}</span>
            Following
          </p>
          <p className="flex flex-col items-center">
            <span className="font-bold text-text-main-light dark:text-text-main-dark  text-lg">{postCount}</span>
            Posts
          </p>
        </div>
      )}

      {/* Additional Info */}
      {isLoading ? (
        <div className="mt-6 space-y-2">
          <Skeleton width="w-full" height="h-4" />
          <Skeleton width="w-2/3" height="h-4" />
          <Skeleton width="w-3/4" height="h-4" />
          <Skeleton width="w-full" height="h-4" />
          <Skeleton width="w-2/3" height="h-4" />
        </div>
      ) : (
        <div className="mt-6 text-sm text-text-main-light dark:text-text-main-dark  space-y-1 relative z-10">
          {user.location && (
            <p className="flex items-center">
              <span className="font-medium text-text-main-light dark:text-text-main-dark  w-28">Location:</span>
              <span className="text-text-main-light dark:text-text-main-dark ">{user.location}</span>
            </p>
          )}
          <p className="flex items-center">
            <span className="font-medium text-text-main-light dark:text-text-main-dark  w-28">Gender:</span>
            <span className="text-text-main-light dark:text-text-main-dark ">{user.gender || "Not specified"}</span>
          </p>
          {user.profession && (
            <p className="flex items-center">
              <span className="font-medium text-text-main-light dark:text-text-main-dark  w-28">Profession:</span>
              <span className="text-text-main-light dark:text-text-main-dark ">{user.profession}</span>
            </p>
          )}
          {user.birthDate && (
            <p className="flex items-center">
              <span className="font-medium text-text-main-light dark:text-text-main-dark  w-28">Birth Date:</span>
              <span className="text-text-main-light dark:text-text-main-dark ">{formatDate(user.birthDate)}</span>
            </p>
          )}
          <p className="flex items-center">
            <span className="font-medium text-text-main-light dark:text-text-main-dark  w-28">Joined:</span>
            <span className="text-text-main-light dark:text-text-main-dark ">{formatDate(user.joinedDate || user.joiningDate)}</span>
          </p>
          <p className="flex items-center">
            <span className="font-medium text-text-main-light dark:text-text-main-dark  w-28">Account Created:</span>
            <span className="text-text-main-light dark:text-text-main-dark ">{user.createdAt ? formatDate(user.createdAt) : "Unknown"}</span>
          </p>
          <p className="flex items-center">
            <span className="font-medium text-text-main-light dark:text-text-main-dark  w-28">Last Updated:</span>
            <span className="text-text-main-light dark:text-text-main-dark ">{user.updatedAt ? formatDate(user.updatedAt) : "Unknown"}</span>
          </p>
          {user.website && (
            <p className="flex items-center">
              <span className="font-medium text-text-main-light dark:text-text-main-dark  w-28">Website:</span>
              <a
                href={user.website}
                className="text-text-main-light dark:text-text-main-dark  hover:text-indigo-700 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {user.website}
              </a>
            </p>
          )}
          {user.interests && user.interests.length > 0 && (
            <p className="flex items-center">
              <span className="font-medium text-text-main-light dark:text-text-main-dark  w-28">Interests:</span>
              <span className="text-text-main-light dark:text-text-main-dark ">{user.interests.join(", ")}</span>
            </p>
          )}
        </div>
      )}

      {/* Follow and Subscribe Buttons */}
      {showFollowBtn && !isCurrentUser && !isLoading && (
        <div className="w-full mt-6 flex flex-col gap-3 relative z-10">
          <ToggleFollowButton
            followUserId={user._id}
            isFollowing={isFollowing}
            onFollowToggle={onFollowToggle}
            className="bg-indigo-500 text-white px-4 py-2 rounded-full hover:bg-indigo-600 transition-colors font-semibold shadow-sm hover:shadow-md"
          />
          <ToggleSubscribeButton
            authorId={user._id}
            isSubscribed={subscriptionStatus?.isSubscribed || false}
            currentUserId={currentUserId}
            className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors font-semibold shadow-sm hover:shadow-md"
          />
        </div>
      )}
      {isLoading && (
        <div className="w-full mt-6 flex flex-col gap-3 relative z-10">
          <Skeleton width="w-full" height="h-10" rounded="rounded-full" />
          <Skeleton width="w-full" height="h-10" rounded="rounded-full" />
        </div>
      )}

      {/* Social Links */}
      {isLoading ? (
        <div className="flex flex-wrap gap-4 mt-6">
          <Skeleton width="w-20" height="h-5" />
          <Skeleton width="w-20" height="h-5" />
        </div>
      ) : (
        user.social &&
        (user.social.twitter || user.social.github || user.social.linkedin || user.social.instagram) && (
          <div className="flex flex-wrap gap-4 mt-6 text-sm relative z-10">
            {user.social.twitter && (
              <a
                href={user.social.twitter}
                className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                </svg>
                Twitter
              </a>
            )}
            {user.social.github && (
              <a
                href={user.social.github}
                className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0a12 12 0 00-3.79 23.39c.6.11.82-.26.82-.58v-2.17c-3.34.72-4.04-1.61-4.04-1.61a3.17 3.17 0 00-1.33-1.75c-1.08-.74.08-.73.08-.73a2.5 2.5 0 011.82 1.23 2.54 2.54 0 003.46.94 2.54 2.54 0 01.76-1.6c-2.67-.3-5.47-1.34-5.47-5.95a4.66 4.66 0 011.24-3.24 4.33 4.33 0 01.12-3.19s1-.32 3.3 1.23a11.38 11.38 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23a4.33 4.33 0 01.12 3.19 4.66 4.66 0 011.24 3.24c0 4.62-2.81 5.65-5.49 5.94a2.87 2.87 0 01.82 2.22v3.29c0 .32.22.7.83.58A12 12 0 0012 0z" />
                </svg>
                GitHub
              </a>
            )}
            {user.social.linkedin && (
              <a
                href={user.social.linkedin}
                className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.98 3.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM2.75 21.5h4.5V8.25h-4.5v13.25zM9.25 8.25h4.5v1.88c.66-1.12 2.3-2.13 4.75-2.13 4.75 0 5.75 3.13 5.75 8.38v7.12h-4.5v-6.38c0-2.25-.5-3.5-2.25-3.5-2.25 0-2.75 1.75-2.75 3.5v6.38h-4.5V8.25z" />
                </svg>
                LinkedIn
              </a>
            )}
            {user.social.instagram && (
              <a
                href={user.social.instagram}
                className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.16c3.21 0 3.58.01 4.85.07 1.17.06 1.81.25 2.23.42.56.22.96.49 1.38.91.42.42.69.82.91 1.38.17.42.36 1.06.42 2.23.06 1.27.07 1.64.07 4.85s-.01 3.58-.07 4.85c-.06 1.17-.25 1.81-.42 2.23-.22.56-.49.96-.91 1.38-.42.42-.82.69-1.38.91-.42.17-1.06.36-2.23.42-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.06-1.81-.25-2.23-.42-.56-.22-.96-.49-1.38-.91-.42-.42-.69-.82-.91-1.38-.17-.42-.36-1.06-.42-2.23-.06-1.27-.07-1.64-.07-4.85s.01-3.58.07-4.85c.06-1.17.25-1.81.42-2.23.22-.56.49-.96.91-1.38.42-.42.82-.69 1.38-.91.42-.17 1.06-.36 2.23-.42 1.27-.06 1.64-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.91.33 4.15.58c-.77.25-1.42.59-2.06 1.23-.64.64-.98 1.29-1.23 2.06-.25.76-.45 1.63-.51 2.9C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.14.51 2.9.25.77.59 1.42 1.23 2.06.64.64 1.29.98 2.06 1.23.76.25 1.63.45 2.9.51 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c1.27-.06 2.14-.26 2.9-.51.77-.25 1.42-.59 2.06-1.23.64-.64.98-1.29 1.23-2.06.25-.76.45-1.63.51-2.9.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.14-.51-2.9-.25-.77-.59-1.42-1.23-2.06-.64-.64-1.29-.98-2.06-1.23-.76-.25-1.63-.45-2.9-.51C15.67.01 15.26 0 12 0z" />
                  <path d="M12 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zm0 10.16a4 4 0 110-8 4 4 0 010 8z" />
                  <path d="M19.85 4.15a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z" />
                </svg>
                Instagram
              </a>
            )}
          </div>
        )
      )}
    </div>
  );
};

export default UserCard;