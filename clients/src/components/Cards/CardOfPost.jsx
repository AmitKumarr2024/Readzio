import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { MessageCircle, Eye, Heart, Bookmark, Share2 } from "lucide-react";
import TimeAgo from "../../Utils/TimeAgo";
import { fetchSubscriptionPlansByAuthor } from "../../store/subscriptionSlice";
import { formatReadingTime } from "../../Utils/formatReadingTime";
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-64 w-full overflow-hidden">
        <Skeleton className="w-full h-32 rounded-t-lg bg-gray-200 dark:bg-gray-700" />
        <div className="p-4 space-y-2">
          <Skeleton className="h-6 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/post/${slug}`}
      className="group bg-white dark:bg-gray-800 font-(family-name:--font-Urbanist) rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full"
    >
      <div className="relative w-full aspect-video">
        <img
          src={thumbnail || "https://placehold.co/400x225?text=No+Image"}
          alt={title || "Post"}
          className="w-full h-full object-cover rounded-t-lg"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute top-2 right-2 px-2 py-1 text-xs font-semibold rounded-full bg-black bg-opacity-80 text-white">
          {formatReadingTime(timeSpent)}
        </span>
        {isPostPremium && (
          <span className="absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500 text-black">
            Premium
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-grow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-500 line-clamp-2">
          {title || "Untitled"}
        </h3>
        <div className="flex flex-wrap justify-between text-sm text-gray-500 dark:text-gray-400 gap-x-4 gap-y-1">
          <span className="truncate">
            {categoryMap[category._id] || "Uncategorized"}
          </span>
          <span className="truncate">{author.name || "Anonymous"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <MessageCircle className="w-5 h-5" /> {commentsCount}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-5 h-5" /> {viewsCount}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-5 h-5 text-red-500" /> {likesCount}
          </span>
          <span className="flex items-center gap-1">
            <Bookmark className="w-5 h-5 text-blue-500" /> {bookmarksCount}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="w-5 h-5 text-green-500" /> {shareCount}
          </span>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          <TimeAgo date={createdAt || new Date()} />
        </div>
        {isSubscribedToAuthor && authorId !== currentUser?._id && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
            Subscribed
          </span>
        )}
        <div className="flex flex-wrap mt-3 gap-2">
          {tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <div className="text-indigo-500 hover:underline text-sm font-medium">
                  #{tag}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default CardOfPost;
