import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import ToggleFollowButton from "../../Author/Subscribe/ToggleFollowButton";
import ToggleSubscribeButton from "../../Author/Subscribe/ToggleSubscribeButton";
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
      month: "long",
      day: "numeric",
    });
  };

  const authorName = user?.name || "Unknown";
  const userPosts = posts.filter((post) => post.author?._id === user._id);
  const postCount = userPosts.length;
  const isCurrentUser = currentUserId === user?._id;

  return (
    <div className="relative p-6 rounded-2xl bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark max-w-md shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer group overflow-hidden">
      <div className="absolute top-0 left-0 w-24 h-24 rounded-full -translate-x-12 -translate-y-12 opacity-50"></div>
      {isLoading ? (
        <div className="flex items-center space-x-4 relative z-10 bg-background-light dark:bg-background-dark p-4 rounded-lg shadow-sm">
          <Skeleton
            width="w-32"
            height="h-32"
            rounded="rounded-full"
            className="border-4 border-gray-200"
          />
          <div className="flex-1 space-y-3">
            <Skeleton width="w-4/5" height="h-7" rounded="rounded-md" />
            <Skeleton width="w-3/5" height="h-4" rounded="rounded-sm" />
            <Skeleton width="w-7/12" height="h-3" rounded="rounded-sm" />
          </div>
        </div>
      ) : (
        <Link
          to={`/author-profile/${user._id}`}
          className="block bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-4 rounded-lg shadow-sm hover:bg-indigo-50 hover:dark:text-text-main-light hover:scale-102 transition-all duration-300 group/link"
        >
          <table className="w-full table-fixed">
            <tbody>
              <tr>
                {/* Avatar or Initial */}
                <td className="w-16 align-top pr-1">
                  <div className="relative w-20 h-20">
                    {user?.avatar ? (
                      <>
                        <img
                          src={user.avatar}
                          alt={authorName}
                          className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md group-hover/link:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 rounded-full bg-indigo-500 opacity-0 group-hover/link:opacity-30 transition-opacity duration-300"></div>
                      </>
                    ) : (
                      <div className="w-20 h-20 flex items-center justify-center rounded-full bg-indigo-500 text-white text-4xl font-semibold uppercase shadow-md">
                        {(authorName || user.username || user.email || "U")[0]}
                      </div>
                    )}
                  </div>
                </td>

                {/* User Info */}
                <td className="align-top">
                  <h3 className="font-bold text-2xl mb-1">{authorName}</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-1">
                    @{user.username || user.email || "unknown"}
                  </p>
                  {user.email && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Email: {user.email}
                    </p>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </Link>
      )}
      {isLoading ? (
        <div className="mt-4 space-y-2">
          <Skeleton width="w-full" height="h-4" />
          <Skeleton width="w-5/6" height="h-4" />
        </div>
      ) : (
        <p className="text-lg mt-4 line-clamp-3 relative z-10">
          {user.bio || "No bio available"}
        </p>
      )}
      {isLoading ? (
        <div className="flex justify-between mt-4 space-x-4">
          <Skeleton width="w-1/3" height="h-10" />
          <Skeleton width="w-1/3" height="h-10" />
          <Skeleton width="w-1/3" height="h-10" />
        </div>
      ) : (
        <div className="flex justify-between mt-4 text-lg">
          <p className="flex flex-col items-center">
            <span className="font-bold text-lg">{followers.length}</span>
            Followers
          </p>
          <p className="flex flex-col items-center">
            <span className="font-bold text-lg">{following.length}</span>
            Following
          </p>
          <p className="flex flex-col items-center">
            <span className="font-bold text-lg">{postCount}</span>
            Posts
          </p>
        </div>
      )}
      {isLoading ? (
        <div className="mt-6 space-y-2">
          <Skeleton width="w-full" height="h-4" />
          <Skeleton width="w-2/3" height="h-4" />
        </div>
      ) : (
        <div className="mt-6 text-lg space-y-1 relative z-10">
          {user.location && (
            <p className="flex items-center">
              <span className="font-medium w-28">Location:</span>
              <span>{user.location}</span>
            </p>
          )}
          <p className="flex items-center">
            <span className="font-medium w-28">Gender:</span>
            <span>{user.gender || "Not specified"}</span>
          </p>
          {user.profession && (
            <p className="flex items-center">
              <span className="font-medium w-28">Profession:</span>
              <span>{user.profession}</span>
            </p>
          )}
          {user.birthDate && (
            <p className="flex items-center">
              <span className="font-medium w-28">Birth Date:</span>
              <span>{formatDate(user.birthDate)}</span>
            </p>
          )}
          <p className="flex items-center">
            <span className="font-medium w-28">Joined:</span>
            <span>{formatDate(user.joinedDate || user.createdAt)}</span>
          </p>
        </div>
      )}
      {showFollowBtn && !isCurrentUser && !isLoading && (
        <div className="w-full mt-6 flex flex-col gap-3 relative z-10">
          <ToggleFollowButton
            followUserId={user._id}
            isFollowing={isFollowing}
            onFollowToggle={onFollowToggle}
            className="bg-indigo-500 text-white px-4 py-2 rounded-full hover:bg-indigo-600 font-semibold shadow-sm hover:shadow-md"
          />
          {isEligible && (
            <ToggleSubscribeButton
              authorId={user._id}
              isSubscribed={subscriptionStatus?.isSubscribed || false}
              currentUserId={currentUserId}
              className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 font-semibold shadow-sm hover:shadow-md"
            />
          )}
        </div>
      )}
      {isLoading && (
        <div className="w-full mt-6 flex flex-col gap-3 relative z-10">
          <Skeleton width="w-full" height="h-10" rounded="rounded-full" />
          <Skeleton width="w-full" height="h-10" rounded="rounded-full" />
        </div>
      )}
      {user.social && (
        <div className="flex flex-wrap gap-4 mt-6 text-sm relative z-10">
          {user.social.twitter && (
            <a
              href={user.social.twitter}
              className="text-indigo-500 hover:text-indigo-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              Twitter
            </a>
          )}
          {user.social.github && (
            <a
              href={user.social.github}
              className="text-indigo-500 hover:text-indigo-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          )}
          {user.social.linkedin && (
            <a
              href={user.social.linkedin}
              className="text-indigo-500 hover:text-indigo-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          )}
          {user.social.instagram && (
            <a
              href={user.social.instagram}
              className="text-indigo-500 hover:text-indigo-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default UserCard;
