import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { MessageCircle, Eye, Heart, Bookmark, Share2 } from "lucide-react";
import { fetchSubscriptionPlansByAuthor } from "../../store/subscriptionSlice";
import Skeleton from "@/components/Ui/Skeleton";

const CardOfPost = ({
  _id: id,
  slug,
  thumbnail,
  title,
  createdAt,
  commentsCount = 0,
  viewsCount = 0,
  likesCount = 0,
  bookmarksCount = 0,
  shareCount = 0,
  author = { name: "Anonymous", _id: "" },
  category = { _id: "" },
  categoryMap = {},
  isSubscriberOnly = false,
  timeSpent = 0,
  loading = false,
  postType = "free",
  tags = [],
  readTime,
}) => {
  const dispatch = useDispatch();
  const { plans = [], isSubscribed = {} } = useSelector(
    (state) => state.subscription || {}
  );
  const currentUser = useSelector((state) => state.auth.user);

  const authorId = author?._id || "";
  const isPostPremium = postType === "premium";
  const isSubscribedToAuthor = isSubscribed[authorId];

  useEffect(() => {
    if (authorId) dispatch(fetchSubscriptionPlansByAuthor(authorId));
  }, [dispatch, authorId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm w-full h-full overflow-hidden">
        <Skeleton className="w-full aspect-[16/9] rounded-t-lg bg-gray-200 dark:bg-gray-700" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-6 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  const formattedDate = new Date(createdAt || new Date()).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  );

  return (
    <Link
      to={`/post/${slug}`}
      className="group bg-white dark:bg-gray-800 font-Urbanist rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col min-h-[480px]"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video">
        <img
          src={thumbnail || "https://placehold.co/400x225?text=No+Image"}
          alt={title || "Post"}
          className="w-full h-full object-cover rounded-t-lg"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute top-2 right-2 px-2 py-1 text-xs font-semibold rounded-full bg-black bg-opacity-80 text-white">
          {readTime}
        </span>
        {isPostPremium && (
          <span className="absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500 text-black">
            Premium
          </span>
        )}
        {postType && (
          <span className="absolute bottom-2 left-2 px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-white/90 text-black dark:bg-gray-700 dark:text-white">
            {postType}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col justify-between flex-grow gap-3">
        {/* Title */}
        <h3 className="text-lg sm:text-xl font-semibold leading-snug text-gray-900 dark:text-white group-hover:text-blue-500 line-clamp-2">
          {title || "Untitled"}
        </h3>

        {/* Info Table */}
        <table className="w-full text-xs sm:text-sm text-left text-gray-600 dark:text-gray-300 border-separate border-spacing-y-1">
          <tbody>
            <tr>
              <td className="font-semibold">Author</td>
              <td className="text-right">{author.name || "Anonymous"}</td>
            </tr>
            <tr>
              <td className="font-semibold">Category</td>
              <td className="text-right">
                {categoryMap[category._id] || "Uncategorized"}
              </td>
            </tr>
            <tr>
              <td className="font-semibold">Post Type</td>
              <td className="text-right">{postType}</td>
            </tr>
            <tr>
              <td className="font-semibold">Date</td>
              <td className="text-right">{formattedDate}</td>
            </tr>
          </tbody>
        </table>

        {/* Stats Table */}
        <table className="w-full text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400 mt-2">
          <thead>
            <tr>
              <th>Comments</th>
              <th>Views</th>
              <th>Likes</th>
              <th>Bookmarks</th>
              <th>Shares</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="flex justify-center items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {commentsCount}
                </div>
              </td>
              <td>
                <div className="flex justify-center items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {viewsCount}
                </div>
              </td>
              <td>
                <div className="flex justify-center items-center gap-1 text-red-500">
                  <Heart className="w-4 h-4" />
                  {likesCount}
                </div>
              </td>
              <td>
                <div className="flex justify-center items-center gap-1 text-blue-500">
                  <Bookmark className="w-4 h-4" />
                  {bookmarksCount}
                </div>
              </td>
              <td>
                <div className="flex justify-center items-center gap-1 text-green-500">
                  <Share2 className="w-4 h-4" />
                  {shareCount}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Subscription & Tags */}
        {isSubscribedToAuthor && authorId !== currentUser?._id && (
          <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 mt-2 w-fit">
            Subscribed
          </span>
        )}

        {tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.slice(0, 4).map((tag) => (
              <div
                key={tag}
                className="text-indigo-500 hover:underline text-xs sm:text-sm font-medium"
              >
                #{tag}
              </div>
            ))}
            {tags.length > 4 && (
              <div className="text-indigo-500 text-xs sm:text-sm font-medium">
                ...
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default CardOfPost;
